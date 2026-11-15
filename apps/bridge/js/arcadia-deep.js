/**
 * BridgeArcadiaDeep — Arcadia, deeper (spec-deeper-worlds A3, A5–A8): the small things that send you between the city's
 * levels and give its people something to do with you. Each lives on what's already drawn and who's already there.
 *
 *   A7  Chrome All the Way Up (assets/quests.json `iris-arm`): this module keeps its one gate — the hand in the heap under
 *       Saint Ruin's throne is only yours once you've beaten him (`ruin-beaten`, from js/undercity.js's save: his trophy
 *       dropped, or beaten today).
 *   A3  Fishing in the Sump: js/fishing.js's `sump` pool (assets/fishing.json: two spots off the Sump's quays, one off the
 *       drowned station's platform), the line-caught `sump_eel` (js/fishart.js draws it), Teo buying it (js/undercity.js
 *       `boat`), Gage the rest; its use line here (`USES`).
 *   A5  Chrome you can tune: js/implants.js — the chop shop's `steady` (two chrome parts and a circuit: a street piece
 *       glitches half as often for a week, `slots[slot].steady`) and LUMEN's `deposit` (a chrome part off a designer
 *       piece, js/spires.js); the parts' use lines here.
 *
 *   BridgeArcadiaDeep.decorate(worldId, data)   (js/world.js, as a world loads)
 */
var BridgeArcadiaDeep = (function () {
  function has(n) { return typeof window[n] !== 'undefined'; }

  // ---- A7: the gate on the heap -------------------------------------------------------------------------------------
  function ruinBeaten() {
    if (!has('BridgeUndercity') || !BridgeUndercity._save) return true;
    var s = BridgeUndercity._save();
    return !!(s && (s.knuckles || s.ruin));
  }
  if (has('BridgeQuests') && BridgeQuests.gate) BridgeQuests.gate('ruin-beaten', ruinBeaten);

  // ---- what its things are for (js/uses.js reads `USES` as a module's own lines) ---------------------------------------
  var USES = [
    { id: 'sump_eel', p: 7, t: '<b>Old Teo</b> buys it off his noodle boat in the Sump, for the laksa: more than a fillet fetches' },
    { id: 'chrome_part', p: 8, t: '<b>Steady street chrome:</b> Doc Sallow takes two, and a circuit board, and it glitches half as often for a week' },
    { id: 'chrome_part', p: 6, t: '<b>A deposit:</b> Iris Kade takes one off the price of a designer piece at LUMEN' },
    { id: 'circuit', p: 8, t: '<b>Steady street chrome:</b> Doc Sallow takes one, and two chrome parts, and it glitches half as often for a week' }
  ];

  function decorate(worldId, data) { /* (the later items add their things here) */ }

  return { decorate: decorate, ruinBeaten: ruinBeaten, USES: USES };
})();
