/**
 * BridgeCodex — the Collection: everything there is to find, set by set.
 *
 * Eight sets (`SETS`): fish, crystals and ore, the farm, magic things,
 * treasures, gear, food and drink, treasure maps. Anything that lands in
 * your pack counts (BridgeInventory.addItem is wrapped, and the pack is
 * looked over every few seconds for anything that came in another way);
 * what's in it the first time you open the game counts quietly. A new find
 * gets a toast; a finished set pays its reward once (`codex_<set>`).
 *
 * Opened from the journal's Collection tab: a page per set, a grid of
 * icons — found ones in colour with their names, the rest as dark
 * silhouettes with a hint where to look (tap or hover one for it).
 *
 * localStorage bridge_codex: {found: {id: time}, paid: {set: time}}.
 *   BridgeCodex.count() / .total() / .render(el, back) / .note(id)
 */
var BridgeCodex = (function () {
  var KEY = 'bridge_codex';
  var PEDDLER = 'Wendel Crane, the Peddler, wherever he\'s set up today';
  var SETS = [
    { id: 'fish', name: 'Fish', reward: 150, items: [
      ['silverfin', 'Off any pier in Lumar'], ['spore_minnow', 'Lumar Harbour, off the piers'], ['harbour_crab', 'Lumar Harbour, now and then'],
      ['rose_shrimp', 'The water round Rose Cove'], ['bluefin', 'Off Sapphire Port\'s quay'], ['glowtail', 'Sapphire, Rose and Midnight waters'],
      ['ember_snapper', 'The water off Crimson Reach'], ['sapphire_ray', 'Off Sapphire Port; cast long'], ['moon_eel', 'Round Midnight Isle, and its moon pool'],
      ['star_pearl', 'The moon pool on Midnight Isle'], ['pond_perch', 'The farm pond on Verdance'], ['sun_carp', 'The farm pond on Verdance; a fighter'],
      ['arctic_char', 'Through the ice on Fellhaven\'s pond'], ['frostfin', 'Through the ice on Fellhaven\'s pond; rare'],
      ['spore_tuna', 'From a boat, out on the open sea'], ['lantern_angler', 'From a boat in deep water - the Midnight Sea most of all']] },
    { id: 'stones', name: 'Crystals and ore', reward: 200, items: [
      ['crimson_crystal', 'In the rock on Crimson Reach'], ['roseite', 'Rose Cove\'s terraces, and the Rose Mine'], ['sapphire_crystal', 'The hills of Sapphire Port; the mine\'s middle floors'],
      ['midnight_crystal', 'Among the ruins on Midnight Isle'], ['wisp_ember', 'The will-o\'-wisps on Midnight Isle'], ['sea_glass', 'Washed up on Lumar\'s beaches'], ['iron_ore', 'The Rose Mine, from the first floor'],
      ['silver_ore', 'The Rose Mine, floor 4 and down'], ['moonstone', 'Geodes deep in the Rose Mine, floor 10 and down'], ['star_iron', 'The Rose Mine, floor 13 and down'],
      ['songstone', 'The Rose Mine\'s deepest floors'], ['hoar_crystal', 'In the rock of the Hoarspire\'s face'], ['summit_crystal', 'The top of the Hoarspire']] },
    { id: 'farm', name: 'From the farm', reward: 200, items: [
      ['turnip', 'Grow it: Hollin sells the seed on Verdance'], ['carrot', 'Grow it: Hollin\'s seed stall'], ['strawberry', 'Grow it: Hollin\'s seed stall'],
      ['sunflower', 'Grow it: Hollin\'s seed stall'], ['pumpkin', 'Grow it, and be patient'], ['starfruit', 'Grow it, and be very patient'],
      ['apple', 'The orchard on Verdance'], ['honey', 'The skeps by the orchard'], ['egg', 'Your hens, once the farm is yours'],
      ['large_egg', 'A hen who loves you (four hearts)'], ['golden_egg', 'A hen who adores you (five hearts)'], ['milk', 'Your cows, once the farm is yours']] },
    { id: 'magic', name: 'Magic things', reward: 250, items: [
      ['moon_wand', PEDDLER], ['glimmer_lantern', PEDDLER], ['heron_feather', PEDDLER], ['frost_ring', PEDDLER], ['tide_charm', PEDDLER],
      ['lantern_beyond', 'Past the last ridge, where the whispers go']] },
    { id: 'finds', name: 'Treasures', reward: 250, items: [
      ['heron_coin', 'Fished up off Crimson Reach'], ['pocket_watch', 'Somewhere in Joro\'s junk pile'], ['edelweiss', 'The top of the Staircase, on Hoarfell'],
      ['silver_nail', 'Lying about on Crimson Reach'], ['heartsong', 'The heart of the great songstone, floor 20'], ['old_boot', 'Everywhere. Everyone has one.']] },
    { id: 'gear', name: 'Tools and weapons', reward: 150, items: [
      ['iron_dagger', 'The smithy on Lumar\'s square'], ['cutlass', 'The smithy on Lumar\'s square'], ['star_blade', 'Hob forges it, in the Rose Mine'],
      ['boarding_pike', 'The smithy on Lumar\'s square'], ['war_maul', 'The smithy on Lumar\'s square'],
      ['rime_hatchet', 'Morwen\'s case, in the tower on Midnight'], ['emberbrand', 'Morwen\'s case'], ['moonglass_sabre', 'Morwen\'s case'],
      ['veilpiercer', 'Behind a locked grate on Midnight Isle'], ['wispcaller', 'Whatever guards the abbey on Midnight'],
      ['lockpick', 'The smithy on Lumar\'s square'], ['old_pickaxe', 'The rack in the Rose Mine\'s hall'], ['iron_pickaxe', 'Hob forges it'],
      ['star_pickaxe', 'Hob forges it, from star iron'], ['hoe', 'The tool shed on Verdance'], ['watering_can', 'The tool shed on Verdance'],
      ['sprinkler', 'Hollin\'s seed stall'], ['chalk', 'Ysolde\'s guide hut in Fellhaven'], ['climbing_rope', 'Ysolde\'s guide hut'],
      ['ice_axe', 'Ysolde\'s guide hut'], ['skis', 'The ski hire in Fellhaven'], ['ski_goggles', 'The ski hire in Fellhaven'],
      ['probe', 'Ysolde, once you\'ve seen the Last Ridge'], ['whistle', 'Comes with your first companion'], ['lucky_horseshoe', 'The Anvil & Hoof, in Brambleford']] },
    { id: 'food', name: 'Food and drink', reward: 120, items: [
      ['bread', 'The bakery on Lumar\'s square'], ['sweet_roll', 'The bakery, or Tove\'s cocoa hut'], ['sea_biscuit', 'The fishmonger, or the bakery'],
      ['fresh_fish', 'The fishmonger on Lumar\'s square'], ['mug_of_ale', 'The tavern, or a certain club'], ['bowl_of_stew', 'The tavern on Lumar\'s square'],
      ['health_draught', 'The apothecary'], ['antidote', 'The apothecary'], ['spore_ramen', 'Cyber Noodles, in the District'], ['neon_udon', 'Cyber Noodles'],
      ['medkit', 'The Chrome Clinic'], ['stim_pack', 'The Chrome Clinic'], ['void_fizz', 'The bar at Club Void'], ['hot_cocoa', 'Tove\'s cocoa hut in Fellhaven'],
      ['roast_chestnuts', 'Tove\'s cocoa hut'], ['fondue', 'Mette\'s bar, at the Snowcap Lodge'], ['mulled_cider', 'Mette\'s bar, at the Snowcap Lodge'],
      ['honey_cake', 'The Crusty Loaf, in Brambleford'], ['pumpkin_pie', 'The Crusty Loaf, in Brambleford'], ['ploughmans', 'The Hayloft, in Brambleford']] },
    { id: 'maps', name: 'Treasure maps', reward: 200, items: [
      ['tmap_lighthouse', 'Ilsa Venn, the cartographer'], ['tmap_windmill', 'Ilsa Venn, the cartographer'], ['tmap_memorial', 'Ilsa Venn, the cartographer'],
      ['tmap_beacon', 'Under rocks in the Rose Mine'], ['tmap_heron', 'At the end of another map'], ['tmap_watchtower', 'At the end of another map'],
      ['tmap_graves', 'Under rocks in the Rose Mine'], ['tmap_abbey', 'At the end of another map']] }
  ];
  var IN = {};
  SETS.forEach(function (s) { s.items.forEach(function (x) { IN[x[0]] = s; }); });
  var st = load(), ready = false;

  function load() {
    var d;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    d = d || {};
    d.found = d.found || {}; d.paid = d.paid || {};
    return d;
  }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode */ } }
  function item(id) { return typeof BridgeItems !== 'undefined' ? BridgeItems.get(id) : null; }
  function have(s) { return s.items.filter(function (x) { return st.found[x[0]]; }).length; }
  function count() { return Object.keys(st.found).filter(function (id) { return IN[id]; }).length; }
  function total() { return Object.keys(IN).length; }

  // something came into your pack: is it new to the collection?
  function note(id, quiet) {
    var s = IN[id];
    if (!s || st.found[id]) return;
    st.found[id] = Date.now();
    store();
    var done = have(s) === s.items.length;
    if (done && !st.paid[s.id]) {
      st.paid[s.id] = Date.now(); store();
      if (typeof BridgeProgression !== 'undefined') {
        BridgeProgression.awardCoins(s.reward, 'codex:' + s.id);
        BridgeProgression.recordAchievement('codex_' + s.id, 0, { source: 'codex' });
      }
      if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('quest');
      if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast('Collection', s.name + ' complete', '+' + s.reward + ' coins');
      return;
    }
    if (quiet) return;
    var it = item(id);
    if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast('New in your collection', it ? it.name : id, s.name + ' · ' + have(s) + ' of ' + s.items.length);
  }
  function scan(quiet) {
    if (typeof BridgeInventory === 'undefined' || !BridgeInventory.getAll) return;
    var fresh = Object.keys(BridgeInventory.getAll()).filter(function (id) { return IN[id] && !st.found[id]; });
    if (fresh.length > 2) quiet = true;                              // a pack loaded all at once (a pilot signing in) isn't news
    fresh.forEach(function (id) { note(id, quiet); });
  }
  function init() {
    if (ready || typeof BridgeInventory === 'undefined') return;
    ready = true;
    var add = BridgeInventory.addItem;
    BridgeInventory.addItem = function (id) {
      var ok = add.apply(BridgeInventory, arguments);
      if (ok) note(id);
      return ok;
    };
    scan(true);                                                      // what you've got already counts, quietly
    if (typeof BridgeFishing !== 'undefined' && BridgeFishing.journal) {  // and every fish you've ever landed
      BridgeFishing.journal().fish.forEach(function (f) { if (f.id) note(f.id, true); });
    }
    setInterval(function () { scan(false); }, 4000);
  }

  // ---- the page ----------------------------------------------------------------------------------------------------------
  function icon(id, found, size) {
    var c = document.createElement('canvas');
    c.width = size; c.height = size;
    var it = item(id), x = c.getContext('2d');
    if (!it || !it.draw) return c;
    it.draw(x, 0, 0, size);
    if (!found) {                                                    // the silhouette: its shape in shadow
      x.globalCompositeOperation = 'source-in';
      x.fillStyle = '#4e4232'; x.fillRect(0, 0, size, size);
    }
    return c;
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }
  var tab = 'fish';
  function render(el, back) {
    var s = SETS.filter(function (x) { return x.id === tab; })[0] || SETS[0];
    var html = '<div class="qj-head"><span class="qj-title">Collection</span><span class="cx-total">' + count() + ' of ' + total() + '</span>' +
      '<button class="qj-close" aria-label="Back"><span class="ip-key">Esc</span></button></div>' +
      '<div class="cx-tabs">' + SETS.map(function (x) {
        var n = have(x), full = n === x.items.length;
        return '<button class="cx-tab' + (x.id === s.id ? ' on' : '') + (full ? ' full' : '') + '" data-set="' + x.id + '">' + esc(x.name) + ' <i>' + n + '/' + x.items.length + '</i></button>';
      }).join('') + '</div>' +
      '<div class="cx-set"><span class="cx-name">' + esc(s.name) + '</span><span class="cx-reward">' +
        (st.paid[s.id] ? 'Complete · ' + s.reward + ' coins paid' : 'Find them all: ' + s.reward + ' coins') + '</span></div>' +
      '<div class="cx-grid"></div><div class="cx-detail">Tap one to see where it\'s found.</div>';
    el.innerHTML = html;
    var grid = el.querySelector('.cx-grid'), detail = el.querySelector('.cx-detail');
    s.items.forEach(function (x) {
      var id = x[0], found = !!st.found[id], it = item(id), cell = document.createElement('button');
      cell.className = 'cx-cell' + (found ? ' found' : '');
      cell.appendChild(icon(id, found, 32));
      var nm = document.createElement('span');
      nm.textContent = found && it ? it.name : '?';
      cell.appendChild(nm);
      var show = function () {
        grid.querySelectorAll('.cx-cell.sel').forEach(function (c) { c.classList.remove('sel'); });
        cell.classList.add('sel');
        detail.innerHTML = found && it ? '<b>' + esc(it.name) + '</b> — ' + esc(it.desc || '') + ' <em>' + esc(x[1]) + '.</em>'
                                       : '<b>Not found yet.</b> <em>' + esc(x[1]) + '.</em>';
      };
      cell.addEventListener('mouseenter', show);
      cell.addEventListener('click', show);
      grid.appendChild(cell);
    });
    el.querySelectorAll('.cx-tab').forEach(function (b) { b.addEventListener('click', function () { tab = b.dataset.set; render(el, back); }); });
    el.querySelector('.qj-close').addEventListener('click', back);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 0); });
    else setTimeout(init, 0);
  }
  return { SETS: SETS, count: count, total: total, render: render, note: note, init: init, _st: function () { return st; } };
})();
