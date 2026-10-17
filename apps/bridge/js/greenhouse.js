/**
 * BridgeGreenhouse — the greenhouse deck aboard the Wayfarer (ship-greenhouse, a module: js/wayfarer.js).
 *
 * Its raised beds (the scene's `beds`: herbs, salad, tomatoes, strawberries) and the two lemon trees are forage spots
 * (js/forage.js does the gathering and the growing back): fresh herbs, salad greens, tomatoes, strawberries, lemons. Pick
 * anything here and Dorrie has greens for the next meal (BridgeGalley.greens: it lasts half as long again). Water the
 * beds from the butt once a ship's day and they give one more of whatever you pick that day. The potting bench says
 * what's ready and what's still growing.
 *
 * `greenhouse` interactions by `part`: bench, water.
 */
var BridgeGreenhouse = (function () {
  var KEY = 'bridge_greenhouse';
  var CROPS = {
    herbs: { item: 'ship_herbs', label: 'HERB BED', min: 2, max: 3, regrow: 30 },
    salad: { item: 'salad_greens', label: 'SALAD BED', min: 2, max: 3, regrow: 40 },
    tomatoes: { item: 'ship_tomato', label: 'TOMATO CANES', min: 2, max: 4, regrow: 45 },
    strawberries: { item: 'strawberry', label: 'STRAWBERRY BED', min: 2, max: 4, regrow: 45 }
  };
  var LEMONS = [[1, 5], [16, 5]];
  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { state = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ } }
  function has(n) { return typeof window[n] !== 'undefined'; }
  function day() { return has('BridgeWayfarer') ? BridgeWayfarer.clock().day : 0; }

  // the beds as forage spots: one at the walkway side of each bed, at its middle
  function decorate(worldId, data) {
    if (worldId !== 'ship-greenhouse' || !data || !data.scene || data._greenhouse) return;
    data._greenhouse = 1;
    data.interactions = data.interactions || [];
    (data.scene.beds || []).forEach(function (b) {
      var C = CROPS[b[4]], x = Math.round((b[0] + b[2]) / 2), y = b[1] === 6 ? 6 : b[1];
      if (!C) return;
      data.interactions.push({ x: x, y: y, type: 'forage', label: C.label, prompt: 'PRESS E TO PICK', item: C.item, min: C.min, max: C.max,
                               regrow: C.regrow, forageId: worldId + ':' + x + ',' + y + ':' + b[4] });
    });
    LEMONS.forEach(function (L) {
      data.interactions.push({ x: L[0], y: L[1], type: 'forage', label: 'LEMON TREE', prompt: 'PRESS E TO PICK', item: 'ship_lemon', min: 1, max: 2,
                               regrow: 60, forageId: worldId + ':' + L[0] + ',' + L[1] + ':lemons' });
    });
  }

  // picking here: greens for the galley, and one more on a watered day
  if (has('BridgeForage') && BridgeForage.gather) {
    var g0 = BridgeForage.gather;
    BridgeForage.gather = function (inter) {
      var r = g0.apply(this, arguments);
      if (r == null && inter && /^ship-greenhouse:/.test(inter.forageId || '')) {
        if (state.watered === day() && has('BridgeLoot')) BridgeLoot.spawn(inter.x, inter.y, inter.item, 1);
        if (has('BridgeGalley') && BridgeGalley.greens && (!state.greens || Date.now() - state.greens > 20 * 60000)) {
          BridgeGalley.greens();
          state.greens = Date.now(); save();
          if (has('BridgeQuests')) BridgeQuests.toast('The greenhouse', 'Greens for the galley', 'Dorrie\'s next meal will see you further');
        }
      }
      return r;
    };
  }

  function picked() { try { return JSON.parse(localStorage.getItem('bridge_forage') || '{}') || {}; } catch (e) { return {}; } }
  function bench() {
    var w = has('BridgeWorld') && BridgeWorld.getWorld(), P = picked(), rows = [];
    ((w && w.interactions) || []).filter(function (i) { return i.type === 'forage'; }).forEach(function (i) {
      var t = P[i.forageId], left = t ? i.regrow * 60000 - (Date.now() - t) : 0, it = has('BridgeItems') && BridgeItems.get(i.item);
      rows.push({ label: i.label.charAt(0) + i.label.slice(1).toLowerCase(), sub: it ? it.name : i.item, icon: i.item, info: true,
                  note: left > 0 ? 'ready in ' + Math.ceil(left / 60000) + ' min' : 'ready to pick' });
    });
    BridgeInteractions.choose({ title: 'The potting bench', text: 'POTS, SEEDLINGS, SEED PACKETS IN A TRAY, A TROWEL. CHALKED ON THE BENCH\'S EDGE, WHAT\'S READY:' +
        (state.watered === day() ? '\n\nTHE BEDS ARE WATERED TODAY: ONE MORE OF WHATEVER YOU PICK.' : ''), rows: rows, closeLabel: 'Done' });
  }
  function water() {
    if (state.watered === day()) { BridgeInteractions.say('WATER BUTT', 'THE BEDS ARE STILL DARK AND DAMP FROM THIS MORNING. ANY MORE AND THEY\'D DROWN.'); return; }
    state.watered = day(); save();
    if (has('BridgeAudio')) BridgeAudio.sfx('splash');
    BridgeInteractions.say('WATER BUTT', 'YOU FILL THE CAN AND GO DOWN THE BEDS, THE SOIL DARKENING, THE TOMATO LEAVES SMELLING GREEN.\n\nWATERED FOR THE SHIP\'S DAY: ONE MORE OF WHATEVER YOU PICK.');
  }
  function use(inter) { if (inter.part === 'bench') bench(); else if (inter.part === 'water') water(); }
  if (has('BridgeInteractions') && BridgeInteractions.register) BridgeInteractions.register('greenhouse', use, 'Use');

  return { decorate: decorate, CROPS: CROPS, watered: function () { return state.watered === day(); } };
})();
