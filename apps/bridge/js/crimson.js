/**
 * The Crimson Sea's own (Workstream B2): Cinder Key, the pirates' port, and what goes with it.
 *
 *   BridgeCrimson.prize(K)       a ship you beat at sea (js/seafight.js `sink`): pirates now and then leave plunder - hot
 *                                goods no honest trader touches (items.js `value: 0`, `fence`: what she pays) - and the
 *                                drowned a locket; into your pack, or the swap
 *   BridgeCrimson.stormGlass()   Old Wick's storm glass is in your pack: squalls and lightning do your boat less harm
 *                                (js/sloop.js `stormGlass`)
 *   BridgeCrimson.decorate(worldId, data)   as a world loads (js/world.js)
 *
 * The stormwatch (`stormwatch`, the barometer board in Wick's tower on Cinder Key): what the sea will do for the next few
 * hours (js/weather.js `outlook`, the same for everyone), what that means out on the Crimson - the squalls thicker or
 * thinner, a storm turning every sea to the Crimson's - and the storm cones he'd hoist for it. He sells the storm glass.
 * Vesper Quick, the fence, is a person (assets/people.json `vesper`): her *What'll you buy?* topic is a sell sheet of
 * the hot goods at her price (the `fence` field) and the sea's trophies at their worth.
 */
var BridgeCrimson = (function () {
  'use strict';

  var GLASS = 180;                                     // what Wick asks for a storm glass
  var PLUNDER = [['plunder_plate', 0.6], ['plunder_rings', 0.3], ['plunder_idol', 0.1]];

  function carried(id) { return typeof BridgeInventory !== 'undefined' && BridgeInventory.getCount && BridgeInventory.getCount(id) > 0; }
  function stormGlass() { return carried('storm_glass'); }

  function give(id) {
    if (typeof BridgeInventory === 'undefined' || !BridgeInventory.give) return null;
    BridgeInventory.give(id, 1);
    var it = typeof BridgeItems !== 'undefined' && BridgeItems.get ? BridgeItems.get(id) : null;
    if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) {
      BridgeQuests.toast('Plunder', it ? it.name : id, id === 'drowned_locket' ? 'Off the drowned. The fence on Cinder Key buys them'
        : 'Hot goods: only the fence on Cinder Key will buy it');
    }
    return id;
  }
  /** A ship beaten at sea: plunder now and then (pirates seven times in ten, the drowned a locket one time in two). */
  function prize(K) {
    if (!K || K.monster) return null;
    if (K.ghost) return Math.random() < 0.5 ? give('drowned_locket') : null;
    if (Math.random() > 0.7) return null;
    var x = Math.random();
    for (var i = 0; i < PLUNDER.length; i++) { x -= PLUNDER[i][1]; if (x <= 0) return give(PLUNDER[i][0]); }
    return give(PLUNDER[0][0]);
  }

  // ---- the stormwatch ---------------------------------------------------------------------------------------------------
  var CONES = { fair: 'NO CONES: FAIR WEATHER', breezy: 'ONE CONE, POINT UP: A FRESH WIND', rain: 'THE RED PENNANT: SQUALLS ABOUT',
                fog: 'A WHITE BALL: FOG', storm: 'BOTH CONES AND THE PENNANT: A STORM - EVERY SEA THE CRIMSON\'S',
                gale: 'BOTH CONES, POINT DOWN: A GALE' };
  function squallWord(m) {
    return m >= 2 ? 'THICK AS I\'VE SEEN THEM' : m >= 1.3 ? 'THICKER THAN USUAL' : m <= 0.6 ? 'THIN - A GOOD DAY FOR THE CRIMSON' : 'AS USUAL, WHICH IS PLENTY';
  }
  function stormwatch(inter) {
    var W = typeof BridgeWeather !== 'undefined' ? BridgeWeather : null;
    var now = W ? W.at('lumar') : null, sea = W && W.sea ? W.sea() : null;
    var text = 'THE BAROMETER BOARD: A GLASS, A DIAL, A SLATE OF OLD WICK\'S CHALK.\n\n';
    if (now) {
      text += 'NOW: ' + now.def.name.toUpperCase() + '. ' + (CONES[now.kind] || '') + '.\n\n';
      text += 'COMING: ' + W.outlook('lumar').toUpperCase() + '\n\n';
      if (sea) text += 'SQUALLS ON THE CRIMSON: ' + squallWord(sea.squall) + '.' + (sea.storm ? ' AND A STORM: EVERY SEA IS THE CRIMSON TODAY.' : '');
    } else {
      text += 'THE GLASS IS STEADY. WICK HAS WRITTEN "ASK ME" ON THE SLATE.';
    }
    var rows = [];
    if (!carried('storm_glass')) {
      rows.push({ label: 'Buy a storm glass', sub: 'carried, squalls and lightning do your boat less harm', note: GLASS + ' coins', pick: function () {
        if (typeof BridgeProgression === 'undefined') return;
        BridgeProgression.wagerCoins(GLASS, 'shop:storm_glass').then(function (r) {
          if (!r || !r.ok) return BridgeInteractions.say('STORMWATCH', 'WICK SHAKES HIS HEAD. "' + GLASS + ', AND IT\'S CHEAP AT THAT. COME BACK WHEN YOUR PURSE IS HEAVIER."');
          if (typeof BridgeInventory !== 'undefined') BridgeInventory.give('storm_glass', 1);
          if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx('coin');
          BridgeInteractions.say('STORMWATCH', 'WICK HANGS IT ON YOUR BELT BY ITS BRASS HOOK. "WHEN IT CLOUDS, REEF. WHEN IT GOES BLACK, PRAY. MOSTLY REEF."');
        });
      } });
    }
    BridgeInteractions.choose({ title: 'THE STORMWATCH', text: text, rows: rows, closeLabel: 'Step back' });
  }

  function decorate(worldId, data) { /* (Cinder Key's places add theirs here) */ }

  if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.register) {
    BridgeInteractions.register('stormwatch', stormwatch, 'Read');
  }

  return { prize: prize, stormGlass: stormGlass, decorate: decorate, GLASS: GLASS };
})();
