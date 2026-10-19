/**
 * Verdance's goods beyond the farm (workstream G): what the café, the dairy, the makers, the vineyard and the mill make,
 * as items (BridgeItems.add), with their icons on the 16-grid like every other item's.
 *
 * Kept out of js/items.js so the countryside's things live together: the Kettle & Crumb's menu (tea, coffee, scones,
 * the very local granola, cake, soup), the Wold Dairy's cheeses (and the ones Hester ages from your milk), and — as the
 * other places open — the roaster's beans, the potter's and candlemaker's wares, cider, wine, flour, flowers.
 */
(function () {
  if (typeof BridgeItems === 'undefined' || !BridgeItems.add) return;
  var px = BridgeItems.px, O = '#2a1608';

  function cup(fill, top) {
    return function (ctx, x, y, s) {
      var u = s / 16;
      px(ctx, x, y, u, O, [[3, 6, 9, 8], [12, 7, 2, 4], [2, 13, 12, 2]]);
      px(ctx, x, y, u, '#f4f0e8', [[4, 7, 7, 6], [12, 8, 1, 2]]); px(ctx, x, y, u, '#d8d0c4', [[4, 12, 7, 1]]);
      px(ctx, x, y, u, fill, [[4, 7, 7, 2]]); if (top) px(ctx, x, y, u, top, [[6, 7, 3, 1]]);
      px(ctx, x, y, u, '#e8e0d4', [[3, 13, 10, 1]]);
      px(ctx, x, y, u, 'rgba(240,240,240,0.7)', [[6, 3, 1, 2], [8, 2, 1, 3]]);
    };
  }
  function teapot(ctx, x, y, s) {
    var u = s / 16;
    px(ctx, x, y, u, O, [[3, 5, 9, 9], [1, 7, 2, 4], [12, 6, 3, 2], [6, 3, 3, 2]]);
    px(ctx, x, y, u, '#4a7aa8', [[4, 6, 7, 7]]); px(ctx, x, y, u, '#7aa8d0', [[5, 6, 3, 2]]); px(ctx, x, y, u, '#f4f0e8', [[5, 9, 5, 1]]);
    px(ctx, x, y, u, '#3a5a80', [[2, 8, 1, 2], [13, 7, 1, 1]]); px(ctx, x, y, u, '#f0d060', [[7, 4, 1, 1]]);
  }
  function scone(ctx, x, y, s) {
    var u = s / 16;
    px(ctx, x, y, u, O, [[3, 6, 10, 8]]);
    px(ctx, x, y, u, '#d8a860', [[4, 9, 8, 4]]); px(ctx, x, y, u, '#f4ecd8', [[4, 8, 8, 1]]); px(ctx, x, y, u, '#d02a3a', [[4, 7, 8, 1], [6, 6, 4, 1]]);
    px(ctx, x, y, u, '#e8c080', [[5, 10, 3, 1]]);
  }
  function jar(fill, lid, bits) {
    return function (ctx, x, y, s) {
      var u = s / 16;
      px(ctx, x, y, u, O, [[4, 3, 8, 12]]);
      px(ctx, x, y, u, lid, [[5, 3, 6, 2]]); px(ctx, x, y, u, 'rgba(255,255,255,0.35)', [[5, 6, 6, 8]]);
      px(ctx, x, y, u, fill, [[5, 7, 6, 7]]); if (bits) px(ctx, x, y, u, bits, [[6, 8, 1, 1], [9, 9, 1, 1], [7, 11, 1, 1], [9, 12, 1, 1]]);
      px(ctx, x, y, u, '#f4ecd0', [[5, 9, 6, 2]]); px(ctx, x, y, u, '#ffffff', [[5, 6, 1, 3]]);
    };
  }
  function cakeSlice(ctx, x, y, s) {
    var u = s / 16;
    px(ctx, x, y, u, O, [[2, 6, 12, 8]]);
    px(ctx, x, y, u, '#c87a3a', [[3, 9, 10, 4]]); px(ctx, x, y, u, '#f4ecd8', [[3, 7, 10, 2], [3, 11, 10, 1]]);
    px(ctx, x, y, u, '#f08020', [[7, 5, 2, 2]]); px(ctx, x, y, u, '#4a8a2a', [[8, 4, 1, 1]]);
  }
  function soup(ctx, x, y, s) {
    var u = s / 16;
    px(ctx, x, y, u, O, [[2, 7, 12, 6], [4, 13, 8, 1]]);
    px(ctx, x, y, u, '#e8e4dc', [[3, 8, 10, 4]]); px(ctx, x, y, u, '#f08a30', [[4, 8, 8, 2]]); px(ctx, x, y, u, '#f4f0e0', [[6, 8, 2, 1]]);
    px(ctx, x, y, u, '#3a7a2a', [[9, 8, 1, 1]]);
    px(ctx, x, y, u, 'rgba(240,240,240,0.6)', [[6, 4, 1, 2], [9, 3, 1, 3]]);
  }
  function wheel(rind, inner) {
    return function (ctx, x, y, s) {
      var u = s / 16;
      px(ctx, x, y, u, O, [[2, 5, 12, 8], [3, 4, 10, 1], [3, 13, 10, 1]]);
      px(ctx, x, y, u, rind, [[3, 5, 10, 7]]); px(ctx, x, y, u, inner, [[3, 5, 10, 3]]);
      px(ctx, x, y, u, '#ffffff', [[4, 5, 3, 1]]);
      px(ctx, x, y, u, O, [[9, 5, 4, 3]]); px(ctx, x, y, u, inner, [[9, 8, 4, 4]]);
    };
  }
  function blue(ctx, x, y, s) {
    wheel('#c8c0a8', '#f0ecd8')(ctx, x, y, s);
    var u = s / 16;
    px(ctx, x, y, u, '#4a6a8a', [[4, 6, 1, 1], [6, 7, 1, 1], [5, 9, 1, 1], [10, 10, 1, 1], [11, 9, 1, 1]]);
  }

  function whistle(ctx, x, y, s) {
    var u = s / 16;
    px(ctx, x, y, u, O, [[2, 6, 10, 5], [11, 7, 3, 3], [3, 4, 3, 2]]);
    px(ctx, x, y, u, '#c8a040', [[3, 7, 8, 3], [11, 8, 2, 1]]); px(ctx, x, y, u, '#f0d070', [[4, 7, 5, 1]]); px(ctx, x, y, u, '#1a1008', [[6, 8, 2, 1]]);
    px(ctx, x, y, u, '#5a3a1a', [[3, 4, 2, 1], [2, 3, 1, 1]]);
  }

  function farmUse() { if (typeof BridgeFarm !== 'undefined') BridgeFarm.useItem(this.id); return false; }
  function packet(paper, art) {
    return function (ctx, x, y, s) {
      var u = s / 16;
      px(ctx, x, y, u, '#3a2a1a', [[3, 2, 10, 13]]); px(ctx, x, y, u, paper, [[4, 3, 8, 11]]); px(ctx, x, y, u, 'rgba(255,255,255,0.35)', [[4, 3, 8, 2]]);
      art(ctx, x, y, u);
      px(ctx, x, y, u, '#6a5a3a', [[5, 12, 1, 1], [7, 12, 1, 1], [9, 12, 1, 1]]);
    };
  }
  function wheatArt(ctx, x, y, u) { px(ctx, x, y, u, '#8a6a20', [[7, 6, 1, 6], [9, 7, 1, 5]]); px(ctx, x, y, u, '#e8c060', [[6, 4, 3, 3], [8, 5, 3, 3]]); }
  function moonArt(ctx, x, y, u) { px(ctx, x, y, u, '#3a6a2a', [[7, 9, 2, 3]]); px(ctx, x, y, u, '#e8eeff', [[5, 5, 6, 4], [7, 4, 2, 6]]); px(ctx, x, y, u, '#fff8c0', [[7, 6, 2, 2]]); }
  function melonArt(ctx, x, y, u) { px(ctx, x, y, u, '#3a5ac0', [[5, 6, 6, 5]]); px(ctx, x, y, u, '#c8d4ff', [[6, 6, 1, 4], [9, 6, 1, 4]]); px(ctx, x, y, u, '#3a6a2a', [[8, 5, 1, 1]]); }
  function wheatSheaf(ctx, x, y, s) {
    var u = s / 16;
    px(ctx, x, y, u, O, [[4, 1, 8, 7], [6, 8, 4, 7]]);
    px(ctx, x, y, u, '#e8c060', [[5, 2, 6, 5]]); px(ctx, x, y, u, '#c8963a', [[6, 3, 1, 3], [9, 3, 1, 3]]); px(ctx, x, y, u, '#d8b050', [[7, 8, 2, 6]]);
    px(ctx, x, y, u, '#8a3a2a', [[6, 9, 4, 1]]);
  }
  function flourSack(ctx, x, y, s) {
    var u = s / 16;
    px(ctx, x, y, u, O, [[3, 4, 10, 11], [5, 2, 6, 2]]);
    px(ctx, x, y, u, '#f0ead8', [[4, 5, 8, 9], [6, 3, 4, 1]]); px(ctx, x, y, u, '#d8d0bc', [[4, 12, 8, 2]]);
    px(ctx, x, y, u, '#8a6a3a', [[6, 4, 4, 1]]); px(ctx, x, y, u, '#c83a2a', [[6, 8, 4, 2]]);
  }
  function moonBloom(ctx, x, y, s) {
    var u = s / 16;
    px(ctx, x, y, u, '#2a4a20', [[7, 10, 2, 5]]);
    px(ctx, x, y, u, '#2a3048', [[3, 3, 10, 8]]); px(ctx, x, y, u, '#e8eeff', [[4, 4, 8, 6]]); px(ctx, x, y, u, '#c8d4ff', [[4, 4, 2, 2], [10, 8, 2, 2]]);
    px(ctx, x, y, u, '#fff8c0', [[7, 6, 2, 2]]);
  }
  function melon(ctx, x, y, s) {
    var u = s / 16;
    px(ctx, x, y, u, O, [[2, 4, 12, 10]]); px(ctx, x, y, u, '#3a5ac0', [[3, 5, 10, 8]]);
    px(ctx, x, y, u, '#c8d4ff', [[5, 5, 1, 8], [8, 5, 1, 8], [11, 5, 1, 8]]); px(ctx, x, y, u, '#ffffff', [[4, 6, 1, 2]]); px(ctx, x, y, u, '#3a6a2a', [[7, 3, 2, 2]]);
  }

  function bottle(glass, label) {
    return function (ctx, x, y, s) {
      var u = s / 16;
      px(ctx, x, y, u, O, [[5, 4, 6, 11], [6, 1, 4, 3]]);
      px(ctx, x, y, u, glass, [[6, 5, 4, 9], [7, 2, 2, 3]]); px(ctx, x, y, u, 'rgba(255,255,255,0.4)', [[6, 6, 1, 6]]);
      px(ctx, x, y, u, label, [[6, 8, 4, 3]]); px(ctx, x, y, u, '#c8a050', [[7, 1, 2, 1]]);
    };
  }
  function jamJar(ctx, x, y, s) { jar('#c83a4a', '#e8d8b0', '#f06070')(ctx, x, y, s); }

  function beans(ctx, x, y, s) {
    var u = s / 16;
    px(ctx, x, y, u, O, [[3, 3, 10, 12]]); px(ctx, x, y, u, '#c8b48a', [[4, 4, 8, 10]]); px(ctx, x, y, u, '#a89470', [[4, 4, 8, 2]]);
    px(ctx, x, y, u, '#5a3a20', [[6, 8, 2, 2], [9, 9, 2, 2], [7, 11, 2, 2]]); px(ctx, x, y, u, '#3a2414', [[6, 9, 1, 1], [9, 10, 1, 1], [7, 12, 1, 1]]);
    px(ctx, x, y, u, '#a8382a', [[4, 6, 8, 1]]);
  }
  function jug(glaze) {
    return function (ctx, x, y, s) {
      var u = s / 16;
      px(ctx, x, y, u, O, [[4, 3, 8, 12], [11, 6, 3, 5], [5, 2, 4, 2]]);
      px(ctx, x, y, u, glaze, [[5, 4, 6, 10], [6, 3, 2, 1]]); px(ctx, x, y, u, 'rgba(255,255,255,0.35)', [[6, 5, 1, 6]]);
      px(ctx, x, y, u, glaze, [[12, 7, 1, 3]]); px(ctx, x, y, u, '#c8b8a0', [[5, 12, 6, 2]]);
    };
  }
  function crock(ctx, x, y, s) {
    var u = s / 16;
    px(ctx, x, y, u, O, [[3, 5, 10, 10], [4, 3, 8, 2]]);
    px(ctx, x, y, u, '#e0d8c8', [[4, 6, 8, 8], [5, 4, 6, 1]]); px(ctx, x, y, u, '#3a6a8a', [[4, 9, 8, 2]]); px(ctx, x, y, u, '#e0a020', [[6, 4, 4, 1]]);
  }
  function mug(ctx, x, y, s) {
    var u = s / 16;
    px(ctx, x, y, u, O, [[3, 4, 9, 11], [11, 6, 3, 5]]); px(ctx, x, y, u, '#3a7a6a', [[4, 5, 7, 9]]); px(ctx, x, y, u, '#5a9a8a', [[4, 5, 7, 2]]);
    px(ctx, x, y, u, '#3a7a6a', [[12, 7, 1, 3]]);
  }
  function candles(ctx, x, y, s) {
    var u = s / 16;
    px(ctx, x, y, u, O, [[3, 3, 3, 12], [7, 2, 3, 13], [11, 4, 3, 11]]);
    px(ctx, x, y, u, '#f0d880', [[4, 4, 1, 10], [8, 3, 1, 11], [12, 5, 1, 9]]); px(ctx, x, y, u, '#3a2414', [[4, 2, 1, 1], [8, 1, 1, 1], [12, 3, 1, 1]]);
    px(ctx, x, y, u, '#a8382a', [[3, 10, 11, 1]]);
  }

  function grapes(ctx, x, y, s) {
    var u = s / 16;
    px(ctx, x, y, u, '#3a6a2a', [[7, 1, 2, 3], [9, 2, 3, 2]]);
    [[5, 4], [8, 4], [11, 4], [6, 7], [9, 7], [7, 10], [10, 10], [8, 13]].forEach(function (g) { px(ctx, x, y, u, O, [[g[0] - 1, g[1] - 1, 4, 4]]); px(ctx, x, y, u, '#5a2a6a', [[g[0], g[1], 2, 2]]); px(ctx, x, y, u, '#a070c0', [[g[0], g[1], 1, 1]]); });
  }
  function wineBottle(label, foil) {
    return function (ctx, x, y, s) {
      var u = s / 16;
      px(ctx, x, y, u, O, [[5, 5, 6, 10], [6, 1, 4, 4]]); px(ctx, x, y, u, '#2a1a2a', [[6, 6, 4, 8], [7, 2, 2, 3]]);
      px(ctx, x, y, u, foil, [[7, 1, 2, 2]]); px(ctx, x, y, u, label, [[6, 8, 4, 4]]); px(ctx, x, y, u, 'rgba(255,255,255,0.3)', [[6, 6, 1, 2]]);
    };
  }
  function loaf(ctx, x, y, s) {
    var u = s / 16;
    px(ctx, x, y, u, O, [[2, 6, 12, 8], [3, 5, 10, 1]]); px(ctx, x, y, u, '#c88a40', [[3, 7, 10, 6]]); px(ctx, x, y, u, '#e8b060', [[3, 6, 10, 2]]);
    px(ctx, x, y, u, '#f4dcb0', [[5, 6, 1, 3], [8, 6, 1, 3], [11, 6, 1, 3]]);
  }

  BridgeItems.add({
    // Vinehallow and Wendmill (js/makers.js)
    grapes:          { name: 'Grapes', desc: 'A bunch from the Vane estate\'s rows, dusty-dark and warm from the sun. Ten press into a cask.', type: 'food', stackable: true,
                       draw: grapes, effects: { energy: 6 }, value: 4 },
    wine_young:      { name: 'Young Wine', desc: 'Your own, drawn early: bright, purple, a bit wild. Better left longer - but nobody\'s stopping you.', type: 'drink', stackable: true,
                       draw: wineBottle('#e8dcc0', '#8a2a3a'), effects: { energy: 20 }, value: 18 },
    wine:            { name: 'Vinehallow Red', desc: 'The estate\'s red - or your own, a week or more in the cask: dark, soft, a little peppery.', type: 'drink', stackable: true,
                       draw: wineBottle('#f0e8d0', '#a02a3a'), effects: { energy: 26, hp: 6 }, value: 40 },
    wine_fine:       { name: 'Vinehallow Reserve', desc: 'Three weeks and more in the Vane cellar. Arcadia\'s sommeliers ask for it by name.', type: 'drink', stackable: true,
                       draw: wineBottle('#f0d890', '#c8a040'), effects: { energy: 30, hp: 10 }, value: 90 },
    wine_grand:      { name: 'Vinehallow Grand Cru', desc: 'Six weeks and more in the cask, and the best thing the hill makes. You chalked your name on this cask a long time ago.',
                       type: 'drink', stackable: true, draw: wineBottle('#2a1a10', '#f0d070'), effects: { energy: 40, hp: 20 }, value: 220 },
    country_loaf:    { name: 'Country Loaf', desc: 'From the bakehouse at Wendmill - a big round loaf, the crust cracked like a field. Ground from the river\'s wheat.',
                       type: 'food', stackable: true, draw: loaf, effects: { hp: 18, energy: 18 }, value: 5 },
    // Thistlecombe's makers (js/makers.js)
    coffee_beans:    { name: 'Ember & Bean Coffee', desc: 'A paper sack of Ada Ember\'s roast, still smelling of the drum. Chew a bean if you must; better brewed.',
                       type: 'drink', stackable: true, draw: beans, effects: { energy: 40 }, value: 10 },
    stoneware_jug:   { name: 'Stoneware Jug', desc: 'Wren Potts\'s, thrown on the wheel in Thistlecombe and glazed the blue of the Wend. A lovely thing to give.',
                       type: 'gift', stackable: true, draw: jug('#2a5a9a'), value: 20 },
    honey_crock:     { name: 'Crock of Honey', desc: 'Your own honey, strained by Silas and sealed in one of Wren\'s crocks. Sells for more than it did in the comb.',
                       type: 'food', stackable: true, draw: crock, effects: { hp: 12, energy: 20 }, value: 16 },
    pottery_mug:     { name: 'Thistle Mug', desc: 'A green-glazed mug from Thistle Pottery, a thumb-dent in the handle. The Kettle & Crumb uses the same ones.',
                       type: 'gift', stackable: true, draw: mug, value: 8 },
    beeswax_candles: { name: 'Beeswax Candles', desc: 'A bundle of tapers dipped at Wick & Comb from the wax of your own skeps. They smell faintly of honey as they burn.',
                       type: 'gift', stackable: true, draw: candles, value: 22 },
    // Cobb's cider on the Downs (js/makers.js), and what's left in the honesty box now and then
    cider:           { name: 'Cobb\'s Cider', desc: 'Cloudy, golden, a little sharp. Ezra presses it from the old orchard on the Downs.', type: 'drink', stackable: true,
                       draw: bottle('#c8902a', '#f0e8c8'), effects: { energy: 28, hp: 6 }, value: 8 },
    farm_cider:      { name: 'Farm Cider', desc: 'Pressed from your own apples at Cobb\'s and two days in his casks. Your farm\'s name on the label in Ezra\'s capitals.',
                       type: 'drink', stackable: true, draw: bottle('#d8a030', '#3a5a32'), effects: { energy: 34, hp: 10 }, value: 26 },
    jam:             { name: 'Jar of Jam', desc: 'Somebody\'s homemade strawberry jam, the lid under a gingham cloth.', type: 'food', stackable: true,
                       draw: jamJar, effects: { energy: 14 }, value: 8 },
    // the countryside's crops (js/farm.js): wheat for the mill, the moonflower (picked by night), the twin-moon melon
    seed_wheat:      { name: 'Wheat Seed', desc: 'Two watered Verdance days to a sheaf. Take the wheat to the mill for flour.', type: 'seed', stackable: true,
                       draw: packet('#f0e4c0', wheatArt), onUse: farmUse, value: 2 },
    seed_moonflower: { name: 'Moonflower Seed', desc: 'From the flower farm on the Downs. Three watered days to bloom, then again every two - but the flowers only open after dark.',
                       type: 'seed', stackable: true, draw: packet('#d8dcf0', moonArt), onUse: farmUse, value: 12 },
    seed_moonmelon:  { name: 'Twin-Moon Melon Seed', desc: 'Grows only by moonlight: the brighter Verdance\'s two moons, the quicker. On a night both are full it fairly races.',
                       type: 'seed', stackable: true, draw: packet('#c8d0f0', melonArt), onUse: farmUse, value: 30 },
    wheat:           { name: 'Wheat', desc: 'A sheaf, golden and rustling. Ludd\'s mill grinds it into flour.', type: 'material', stackable: true, draw: wheatSheaf, value: 4 },
    flour:           { name: 'Flour', desc: 'A sack of flour from Ludd\'s mill, ground from your own wheat. Bridget bakes with it; the café wants it too.',
                       type: 'material', stackable: true, draw: flourSack, value: 14 },
    moonflower:      { name: 'Moonflower', desc: 'Picked by night, still faintly glowing - pale petals that smell of honey and rain. Everyone likes being given one.',
                       type: 'gift', stackable: true, draw: moonBloom, value: 40 },
    moonmelon:       { name: 'Twin-Moon Melon', desc: 'Pale blue, striped silver, cool to the touch even at noon. Arcadia\'s chefs pay the earth for them.',
                       type: 'food', stackable: true, draw: melon, effects: { hp: 30, energy: 30 }, value: 90 },
    // Hobb's Livery (js/countryside.js): blow it out of doors on Verdance and your horse comes
    horse_whistle:  { name: 'Horse Whistle', desc: 'Brass, on a leather thong, from Hobb\'s Livery. Out of doors on Verdance, blow it and your horse comes trotting; blow it again to get down.',
                      type: 'tool', stackable: false, draw: whistle, value: 0,
                      onUse: function () { if (typeof BridgeCountryside !== 'undefined') BridgeCountryside.whistle(); return false; } },
    // the Kettle & Crumb (Station Road, once the village fund reopens the tea rooms)
    pot_of_tea:     { name: 'Pot of Tea', desc: 'The Kettle & Crumb\'s, in a blue pot with a chip on the spout. Juniper says the chip is load-bearing.',
                      type: 'drink', stackable: true, draw: teapot, effects: { energy: 16 }, value: 2 },
    flat_white:     { name: 'Flat White', desc: 'Juniper\'s coffee, a fern drawn in the milk. Better once the roaster in Thistlecombe is roasting for her.',
                      type: 'drink', stackable: true, draw: cup('#a8744a', '#f4e8d8'), effects: { energy: 26 }, value: 3 },
    scone_jam:      { name: 'Scone & Jam', desc: 'Still warm, jam and cream on (jam first; Juniper has opinions). The jam is from somebody\'s strawberries.',
                      type: 'food', stackable: true, draw: scone, effects: { hp: 12, energy: 14 }, value: 4 },
    granola:        { name: 'Very Local Granola', desc: 'Oats from Ludd\'s, honey from the skeps, apples off the trees, toasted on a tray at the Kettle & Crumb. You can name the field every bit of it grew in.',
                      type: 'food', stackable: true, draw: jar('#c89048', '#5a8a3a', '#a83a2a'), effects: { hp: 10, energy: 30 }, value: 8 },
    carrot_cake:    { name: 'Carrot Cake', desc: 'A thick slice, cream cheese icing, one little marzipan carrot on top.',
                      type: 'food', stackable: true, draw: cakeSlice, effects: { hp: 16, energy: 18 }, value: 5 },
    pumpkin_soup:   { name: 'Pumpkin Soup', desc: 'A bowl of it, seeds toasted on top, a heel of Bridget\'s bread on the side.',
                      type: 'food', stackable: true, draw: soup, effects: { hp: 28, energy: 22 }, value: 6 },
    // the Wold Dairy (Station Road, once a cheesemaker comes)
    wold_cheese:    { name: 'Wold Cheese', desc: 'A round of Hester Wold\'s hard cheese, nutty and a little crystalline. Goes with everything, especially more of it.',
                      type: 'food', stackable: true, draw: wheel('#c89a40', '#f0d070'), effects: { hp: 20, energy: 12 }, value: 14 },
    wold_blue:      { name: 'Wold Blue', desc: 'Hester\'s blue, veined and soft, wrapped in a dock leaf. Strong enough to have opinions.',
                      type: 'food', stackable: true, draw: blue, effects: { hp: 24, energy: 10 }, value: 22 },
    farm_cheese:    { name: 'Farmhouse Cheese', desc: 'Made from your own milk and aged on Hester\'s shelves. It has your farm\'s name scratched in the rind.',
                      type: 'food', stackable: true, draw: wheel('#d8a850', '#f8e4a0'), effects: { hp: 26, energy: 16 }, value: 40 }
  });
})();
