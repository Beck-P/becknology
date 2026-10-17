/*
 * js/wonders.js — BridgeWonders: the Cabinet of Wonders (the empire plan's chunk 5, `_claude_docs/spec-empire.md`:
 * "magic things are the prize" — the Workshop's highest tier, rare things you found yourself and the deep's trophies
 * made into wonders with real effects).
 *
 * A wonder is made at your Workshop like anything else (its recipe is merged into js/workshop.js `RECIPES`, kind
 * `wonder`, group `wonders`; this loads first), from inputs you can only find yourself: moonglass, songstone, star
 * iron, the moon pool's pearls, the Deep Maw's, a Heron coin — and three of them wake a relic out of the Undercroft.
 * Made, it goes straight into the Cabinet of Wonders in your hall of finds (js/trophies.js draws it on its shelf,
 * scenes/lumar_holm_hall.py) and works for good from there, wherever you are. The plans: Tamsin Gale (the keeper of
 * the Sapphire light) teaches the Storm Compass for a favour, Ambrose Vane the registrar sells the Gilded Ledger, Old
 * Pell the Tidecaller's Pearl (`workshop` shops in js/workshop.js); a relic's waking you know as soon as you've found it.
 *
 * Each module asks what it needs: `fog()` (js/sloop.js, js/orders.js), `takings()` (js/business.js), `bite()` and
 * `rare()` (js/fishing.js), `deep()` (js/seafight.js), `wages()` (js/business.js), `repairs()` (js/fleet.js).
 * localStorage `bridge_wonders` ({made: {id: time}}).
 */
var BridgeWonders = (function () {
  'use strict';
  var KEY = 'bridge_wonders';
  function px(ctx, x, y, u, col, rects) { ctx.fillStyle = col; rects.forEach(function (r) { ctx.fillRect(x + r[0] * u, y + r[1] * u, r[2] * u, r[3] * u); }); }
  var O = '#14100c';
  var W = {
    storm_compass: {
      name: 'The Storm Compass', in: { moonglass: 2, sapphire_crystal: 2, songstone: 1, copper_sheet: 2 }, mins: 720,
      what: 'Fog never closes on your ships: their standing orders sail through it as if it were clear, and at sea the mist lies thin round your own boat.',
      where: 'Tamsin Gale, the keeper of the Sapphire light, for a favour', glow: '150,200,255',
      draw: function (c, x, y, s) { var u = s / 16;
        px(c, x, y, u, O, [[3, 3, 10, 10], [2, 4, 12, 8], [4, 2, 8, 12]]); px(c, x, y, u, '#a07830', [[4, 3, 8, 10], [3, 4, 10, 8]]);
        px(c, x, y, u, '#e0b850', [[4, 3, 8, 1], [3, 4, 1, 3]]); px(c, x, y, u, '#1e3a6a', [[5, 5, 6, 6], [4, 6, 8, 4]]);
        px(c, x, y, u, '#bfeaff', [[7, 5, 2, 3]]); px(c, x, y, u, '#c83a2e', [[7, 8, 2, 3]]); px(c, x, y, u, '#f0f0f8', [[7, 7, 2, 2]]);
        px(c, x, y, u, '#e0b850', [[7, 1, 2, 2]]); } },
    gilded_ledger: {
      name: 'The Gilded Ledger', in: { heron_coin: 3, oak_plank: 2, copper_sheet: 1, sapphire_crystal: 1 }, mins: 600,
      what: 'Whatever your businesses take, they take a tenth more: the ledger keeps the books honest and the customers coming.',
      where: 'Ambrose Vane, the registrar of the Merchants\' Exchange in Crownhaven', glow: '255,214,120',
      draw: function (c, x, y, s) { var u = s / 16;
        px(c, x, y, u, O, [[2, 3, 12, 11]]); px(c, x, y, u, '#5a1e22', [[3, 4, 10, 9]]); px(c, x, y, u, '#7a2a2e', [[3, 4, 10, 2]]);
        px(c, x, y, u, '#e0b850', [[3, 4, 1, 9], [12, 4, 1, 9], [6, 6, 4, 4]]); px(c, x, y, u, '#f8e090', [[7, 7, 2, 2]]);
        px(c, x, y, u, '#f0e8d0', [[4, 12, 8, 1]]); px(c, x, y, u, '#5aa0e0', [[7, 7, 1, 1]]); } },
    tide_pearl: {
      name: 'The Tidecaller\'s Pearl', in: { star_pearl: 1, deep_pearl: 1, moonglass: 1, sailcloth: 1 }, mins: 600,
      what: 'Fish bite a third sooner wherever you cast, and the rare ones come up more often.',
      where: 'Old Pell on Tern Holm', glow: '170,230,255',
      draw: function (c, x, y, s) { var u = s / 16;
        px(c, x, y, u, O, [[2, 8, 12, 6], [4, 3, 8, 7]]); px(c, x, y, u, '#e8c8b0', [[3, 9, 10, 4]]); px(c, x, y, u, '#c89a80', [[3, 12, 10, 1], [5, 9, 1, 3], [10, 9, 1, 3]]);
        px(c, x, y, u, '#d8e8f8', [[5, 4, 6, 6]]); px(c, x, y, u, '#9ac0e8', [[5, 8, 6, 2], [9, 4, 2, 5]]); px(c, x, y, u, '#ffffff', [[6, 5, 2, 2]]);
        px(c, x, y, u, '#5a8ad0', [[7, 7, 1, 1], [8, 6, 1, 1]]); } },
    ferry_bell: {
      name: 'The Ferryman\'s Bell', in: { drowned_bell: 1, moonglass: 2, songstone: 1 }, mins: 900, wakes: 'drowned_bell', relic: 'the Drowned Bell',
      what: 'The Drowned Bell, woken. It rings when something from the deep turns toward your ships, and it turns away: the drowned and the Midnight Sea\'s monsters come half as often.',
      glow: '140,240,200',
      draw: function (c, x, y, s) { var u = s / 16;
        px(c, x, y, u, O, [[5, 2, 6, 10], [3, 9, 10, 4]]); px(c, x, y, u, '#3a8a68', [[6, 3, 4, 8], [4, 10, 8, 2]]);
        px(c, x, y, u, '#7ac8a0', [[6, 3, 1, 7]]); px(c, x, y, u, '#c0a040', [[7, 1, 2, 2]]); px(c, x, y, u, '#a0ffd8', [[7, 12, 2, 2]]); px(c, x, y, u, '#e8fff4', [[7, 12, 1, 1]]); } },
    crown_woken: {
      name: 'The Barrow Crown, woken', in: { barrow_crown: 1, star_iron: 2, songstone: 1 }, mins: 900, wakes: 'barrow_crown', relic: 'the Barrow Crown',
      what: 'The crown remembers who served it. Everyone who works for you asks a tenth less in wages, and none of them knows why.',
      glow: '180,130,255',
      draw: function (c, x, y, s) { var u = s / 16;
        px(c, x, y, u, O, [[2, 6, 12, 6], [3, 3, 2, 3], [7, 2, 2, 4], [11, 3, 2, 3]]); px(c, x, y, u, '#3a3440', [[3, 7, 10, 4], [4, 4, 1, 3], [7, 3, 2, 4], [11, 4, 1, 3]]);
        px(c, x, y, u, '#c8a0ff', [[4, 8, 2, 2], [7, 8, 2, 2], [10, 8, 2, 2], [7, 3, 2, 1]]); px(c, x, y, u, '#f0e0ff', [[7, 8, 1, 1]]); } },
    coin_woken: {
      name: 'The Ferryman\'s Coin, woken', in: { ferry_coin: 1, moonglass: 1, copper_sheet: 2 }, mins: 720, wakes: 'ferry_coin', relic: 'the Ferryman\'s Coin',
      what: 'Passage paid. Every yard on the seas mends your ships for a third less, and doesn\'t argue.',
      glow: '255,230,150',
      draw: function (c, x, y, s) { var u = s / 16;
        px(c, x, y, u, O, [[4, 3, 8, 10], [3, 4, 10, 8]]); px(c, x, y, u, '#d0a840', [[5, 4, 6, 8], [4, 5, 8, 6]]);
        px(c, x, y, u, '#fff0a0', [[5, 4, 2, 2]]); px(c, x, y, u, '#6a4a14', [[6, 7, 4, 2]]); px(c, x, y, u, '#bfeaff', [[7, 7, 2, 2]]);
        px(c, x, y, u, '#fff8d0', [[7, 1, 2, 1], [7, 14, 2, 1], [1, 7, 1, 2], [14, 7, 1, 2]]); } }
  };

  var st = load();
  function load() {
    var d;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    return { made: (d && d.made) || {} };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode */ } }
  function has(id) { return !!st.made[id]; }
  /** A wonder finished at the Workshop: into the cabinet, for good. */
  function place(id) {
    if (!W[id] || has(id)) return false;
    st.made[id] = Date.now(); save();
    if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast('A wonder', W[id].name, 'In the Cabinet of Wonders in your hall - it works from there');
    if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx('quest');
    return true;
  }

  // their icons, as items (the Workshop's lists, the hall's shelves): never carried, they go straight into the cabinet
  (function register() {
    if (typeof BridgeItems === 'undefined' || !BridgeItems.all) return;
    var IT = BridgeItems.all();
    Object.keys(W).forEach(function (id) {
      if (!IT['wonder_' + id]) IT['wonder_' + id] = { id: 'wonder_' + id, name: W[id].name, type: 'wonder', stackable: false, value: 0, draw: W[id].draw, desc: W[id].what };
    });
  })();
  /** Their recipes for the Workshop (js/workshop.js merges these in). */
  function recipes() {
    var out = {};
    Object.keys(W).forEach(function (id) { out[id] = { kind: 'wonder', group: 'wonders', name: W[id].name, in: W[id].in, mins: W[id].mins, plan: true, wakes: W[id].wakes }; });
    return out;
  }
  function where(id) {
    var w = W[id];
    if (!w) return null;
    if (w.wakes) return 'the relic itself, once you\'ve found ' + w.relic + ' in the Undercroft';
    return w.where;
  }

  return { W: W, has: has, place: place, recipes: recipes, where: where,
           fog: function () { return has('storm_compass') ? 0.35 : 1; },
           takings: function () { return has('gilded_ledger') ? 1.1 : 1; },
           bite: function () { return has('tide_pearl') ? 0.67 : 1; },
           rare: function () { return has('tide_pearl'); },
           deep: function () { return has('ferry_bell') ? 0.5 : 1; },
           wages: function () { return has('crown_woken') ? 0.9 : 1; },
           repairs: function () { return has('coin_woken') ? 0.67 : 1; },
           _state: function () { return st; }, _reset: function () { st = { made: {} }; save(); } };
})();
