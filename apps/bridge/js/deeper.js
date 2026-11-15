/**
 * BridgeDeeper — Hoarfell and Verdance, deeper (spec-deeper-worlds H5–H7, V5–V7; the village's second ring, V4, is
 * js/village.js's). Small things that tie what's there together, with the cast already in the game and nothing drawn
 * but in code. apps/bridge/CLAUDE.md, *Hoarfell and Verdance, deeper*.
 *
 *   H6  Ysolde joins the crew (people.json `ysolde.crew`, perk `mountaineer`: js/worlds/hoarfell.js's cold, js/expedition.js's
 *       probe) once you've stood on the Last Ridge — the gate `last-ridge`, read by her crew block's `when` and her topic.
 *
 * Leads players to each: Next up (window.BRIDGE_NEXTUP), the Map's Come back for (window.BRIDGE_COMEBACK), the cards
 * (`USES`, js/uses.js).
 */
var BridgeDeeper = (function () {
  function visited(w) { return typeof BridgeQuests !== 'undefined' && BridgeQuests.visited ? !!BridgeQuests.visited()[w] : false; }
  function hired(id) { return typeof BridgeCrew !== 'undefined' && BridgeCrew.isHired(id); }

  // ---- H6 · Ysolde ----------------------------------------------------------------------------------------------------
  function ridge() { return visited('hoarfell-ridge'); }
  if (typeof BridgeQuests !== 'undefined' && BridgeQuests.gate) BridgeQuests.gate('last-ridge', ridge);

  function nextUp(wid) {
    var out = [];
    if (ridge() && !hired('ysolde') && /^hoarfell/.test(wid || ''))
      out.push({ tag: 'Crew', title: 'Ysolde would sign on', text: 'You\'ve stood on the Last Ridge. Ask her at the guide\'s hut in Fellhaven.', world: 'hoarfell' });
    return out;
  }
  function comeBack() { return []; }
  window.BRIDGE_NEXTUP = (window.BRIDGE_NEXTUP || []).concat([nextUp]);
  window.BRIDGE_COMEBACK = (window.BRIDGE_COMEBACK || []).concat([comeBack]);

  var USES = [
    { id: 'probe', p: 4, t: '<b>Ysolde</b>, in your crew, rigs her own probe to go in ahead of you on a crevasse field: you needn\'t hold one' }
  ];

  return { USES: USES, ridge: ridge, nextUp: nextUp, comeBack: comeBack };
})();
