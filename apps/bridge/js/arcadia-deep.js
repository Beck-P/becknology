/**
 * BridgeArcadiaDeep — Arcadia, deeper (spec-deeper-worlds A3, A5–A8): the small things that send you between the city's
 * levels and give its people something to do with you. Each lives on what's already drawn and who's already there.
 *
 *   A7  Chrome All the Way Up (assets/quests.json `iris-arm`): this module keeps its one gate — the hand in the heap under
 *       Saint Ruin's throne is only yours once you've beaten him (`ruin-beaten`, from js/undercity.js's save: his trophy
 *       dropped, or beaten today).
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

  function decorate(worldId, data) { /* (the later items add their things here) */ }

  return { decorate: decorate, ruinBeaten: ruinBeaten };
})();
