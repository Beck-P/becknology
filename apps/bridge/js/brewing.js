/**
 * BridgeBrewing — brewing with Mirelle (Sylvara): herbs from the wood, a crystal from Lumar, honey from Verdance, and
 * potions that matter on the other planets.
 *
 * HERBS grow in Sylvara's places (assets/forage.json, gathered with E; Mirelle sells a few): moonpetal (the Moonwell's
 * flower), emberroot (warm to the touch, in the Deepwood's roots), owlmoss (glowing in the mushroom groves), windthistle
 * (the flowering meadows), silverleaf (the Silverrun's banks), dreamcap (the Deepwood's smallest glowing mushrooms).
 * CRYSTALS come from Lumar — roseite (Rose Cove and the mine), sapphire crystal, moonstone (the mine's geodes); HONEY
 * from the skeps on Verdance.
 *
 * Talk to Mirelle and *Brew with me*: each recipe is a row, what it takes beside it; brewing takes the ingredients
 * from your pack and gives you the potion. Drinking one (F, from the hotbar) starts it working; what's working shows
 * as a toast as it starts and as it wears off, and `BridgeBrewing.active(k)` asks it. The potions:
 *   Hearthfire Draught   emberroot + roseite + honey       — the cold can't touch you, 30 minutes (Hoarfell: warm)
 *   Owl's-Eye Tincture   owlmoss + moonstone               — night eyes, 30 minutes: see through Arcadia's blackout,
 *                                                            the brownout, the dark (js/weather.js asks 'night_eyes')
 *   Swiftwater Tonic     windthistle + honey               — you walk quicker, 15 minutes (anywhere)
 *   Tidecalm Elixir      moonpetal + sapphire crystal + honey — the sea's on your side: the sloop sails quicker, 30 minutes
 *   Silverleaf Salve     silverleaf ×2 + honey             — health and energy back, at once
 *   Dreamcap Draught     dreamcap + moonpetal              — things hidden glint for you as the Glimmer Lantern shows them, 20 minutes
 * The effects reach the rest of the game through BridgeMagic.has / speed (js/magic.js asks here), which js/gear.js,
 * the cold, the sloop and the weather already ask.
 * Kept in localStorage bridge_brewing: { active: { key: until ms }, brewed: n, known }.
 *
 *   BridgeBrewing.open() — Mirelle's cauldron; .active(key) / .speed(); .ITEMS
 */
var BridgeBrewing = (function () {
  var KEY = 'bridge_brewing', MIN = 60000;
  var st = load();
  function load() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    d = d || {};
    return { active: d.active || {}, brewed: d.brewed || 0 };
  }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode */ } }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function toast(k, t, sub) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(k, t, sub); }
  function say(t, x) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(t, x); }
  function inv() { return typeof BridgeInventory !== 'undefined' ? BridgeInventory : null; }
  function count(id) { return inv() ? inv().getCount(id) : 0; }

  // ---- icons (16-unit pixel art, an outline round each) -------------------------------------------------------------
  function pix(ctx, x, y, s, col, cells) {
    var u = s / 16;
    ctx.fillStyle = col;
    cells.forEach(function (c) { ctx.fillRect(x + c[0] * u, y + c[1] * u, (c[2] || 1) * u, (c[3] || 1) * u); });
  }
  function outline(cells) { return cells.map(function (c) { return [c[0] - 1, c[1] - 1, (c[2] || 1) + 2, (c[3] || 1) + 2]; }); }
  function herbIcon(stem, leaf, bloom) {
    return function (ctx, x, y, s) {
      var leaves = [[7, 3, 2, 10], [4, 5, 3, 2], [9, 6, 3, 2], [3, 9, 4, 2], [9, 10, 4, 2]];
      pix(ctx, x, y, s, '#0b0a18', outline(leaves).concat(bloom ? [[5, 0, 6, 5]] : []));
      pix(ctx, x, y, s, stem, [[7, 3, 2, 10]]);
      pix(ctx, x, y, s, leaf, [[4, 5, 3, 2], [9, 6, 3, 2], [3, 9, 4, 2], [9, 10, 4, 2]]);
      pix(ctx, x, y, s, '#ffffff', [[4, 5], [9, 6]]);
      if (bloom) { pix(ctx, x, y, s, bloom, [[6, 1, 4, 3], [7, 0, 2, 1]]); pix(ctx, x, y, s, '#fff8e0', [[7, 2]]); }
    };
  }
  function shroomIcon(cap, glow) {
    return function (ctx, x, y, s) {
      pix(ctx, x, y, s, '#0b0a18', [[2, 3, 12, 6], [6, 8, 4, 7]]);
      pix(ctx, x, y, s, '#ece2d0', [[7, 9, 2, 5]]);
      pix(ctx, x, y, s, cap, [[3, 4, 10, 4], [5, 3, 6, 1]]);
      pix(ctx, x, y, s, glow, [[5, 5], [9, 4], [11, 6]]);
    };
  }
  function rootIcon(ctx, x, y, s) {
    pix(ctx, x, y, s, '#0b0a18', [[3, 2, 9, 5], [5, 6, 5, 8], [2, 10, 4, 4]]);
    pix(ctx, x, y, s, '#c0502a', [[4, 3, 7, 3], [6, 6, 3, 6], [3, 11, 2, 2]]);
    pix(ctx, x, y, s, '#ffb060', [[5, 3, 2, 1], [7, 7, 1, 2]]);
    pix(ctx, x, y, s, '#4a8a3a', [[7, 1, 2, 2]]);
  }
  function mossIcon(ctx, x, y, s) {
    pix(ctx, x, y, s, '#0b0a18', [[2, 6, 12, 7]]);
    pix(ctx, x, y, s, '#3a6a3a', [[3, 7, 10, 5]]);
    pix(ctx, x, y, s, '#a8f0c8', [[4, 8], [7, 9], [10, 8], [5, 10], [11, 10]]);
    pix(ctx, x, y, s, '#ffe890', [[6, 7], [9, 7]]);
  }
  function bottleIcon(liquid, light, cork) {
    return function (ctx, x, y, s) {
      pix(ctx, x, y, s, '#0b0a18', [[3, 5, 10, 10], [6, 1, 4, 5]]);
      pix(ctx, x, y, s, '#c8d8e0', [[4, 6, 8, 8], [7, 3, 2, 3]]);
      pix(ctx, x, y, s, liquid, [[4, 9, 8, 5], [5, 8, 6, 1]]);
      pix(ctx, x, y, s, light, [[5, 9, 2, 2], [10, 12]]);
      pix(ctx, x, y, s, cork || '#a07a48', [[7, 1, 2, 2]]);
      pix(ctx, x, y, s, '#ffffff', [[5, 6], [5, 7]]);
    };
  }
  function breadIcon(ctx, x, y, s) {
    pix(ctx, x, y, s, '#0b0a18', [[2, 5, 12, 7]]);
    pix(ctx, x, y, s, '#d8b070', [[3, 6, 10, 5]]);
    pix(ctx, x, y, s, '#3e7a32', [[3, 6, 10, 1], [3, 10, 10, 1]]);
    pix(ctx, x, y, s, '#f0d8a0', [[5, 7, 3, 2]]);
  }
  function pearIcon(ctx, x, y, s) {
    pix(ctx, x, y, s, '#0b0a18', [[4, 5, 8, 9], [6, 2, 4, 4]]);
    pix(ctx, x, y, s, '#d8c040', [[5, 7, 6, 6], [7, 4, 2, 3]]);
    pix(ctx, x, y, s, '#f8e890', [[6, 8, 2, 2]]);
    pix(ctx, x, y, s, '#5a3a20', [[8, 1, 1, 2]]); pix(ctx, x, y, s, '#4a8a3a', [[9, 2, 2, 1]]);
  }

  // ---- the items ------------------------------------------------------------------------------------------------
  function eat() {
    var e = this.effects || {}, I = inv();
    if (!I) return false;
    if (e.hp) I.restoreHP(e.hp);
    if (e.energy) I.restoreEnergy(e.energy);
    sfx('eat');
    return true;
  }
  function drink() {
    var p = this, I = inv();
    if (!I) return false;
    if (p.effects) { if (p.effects.hp) I.restoreHP(p.effects.hp); if (p.effects.energy) I.restoreEnergy(p.effects.energy); }
    if (p.potion) {
      st.active[p.potion] = Date.now() + p.mins * MIN; store();
      toast('Potion', p.name, p.works);
    } else toast('Potion', p.name, p.works);
    sfx('drink');
    return true;
  }
  var ITEMS = {
    moonpetal:   { id: 'moonpetal', name: 'Moonpetal', desc: 'The Moonwell\'s white flower, silver at the heart. It closes if you breathe on it. For brewing.', type: 'material',
                   stackable: true, draw: herbIcon('#3a6a3a', '#5a8e40', '#f0f0f0'), value: 12, herb: true },
    emberroot:   { id: 'emberroot', name: 'Emberroot', desc: 'A red root from under the Deepwood\'s oldest trees, warm in the hand like a stone left in the sun. For brewing.', type: 'material',
                   stackable: true, draw: rootIcon, value: 14, herb: true },
    owlmoss:     { id: 'owlmoss', name: 'Owlmoss', desc: 'Moss from the mushroom groves that glows faintly green. The owls line their nests with it. For brewing.', type: 'material',
                   stackable: true, draw: mossIcon, value: 14, herb: true },
    windthistle: { id: 'windthistle', name: 'Windthistle', desc: 'A violet thistle from the flowering meadows; its down blows away if you look at it too hard. For brewing.', type: 'material',
                   stackable: true, draw: herbIcon('#4a6a3a', '#6a9a48', '#a878d8'), value: 10, herb: true },
    silverleaf:  { id: 'silverleaf', name: 'Silverleaf', desc: 'Grey-green leaves from the Silverrun\'s banks, silver underneath. Mirelle swears by it for cuts. For brewing.', type: 'material',
                   stackable: true, draw: herbIcon('#5a7a5a', '#b8d0c8', null), value: 8, herb: true },
    dreamcap:    { id: 'dreamcap', name: 'Dreamcap', desc: 'A thumb-sized mushroom from the Deepwood that glows violet. Don\'t eat it raw. Nobody listens. For brewing.', type: 'material',
                   stackable: true, draw: shroomIcon('#6a4a9a', '#e0b0ff'), value: 16, herb: true },
    hearthfire_draught: { id: 'hearthfire_draught', name: 'Hearthfire Draught', desc: 'Emberroot, roseite and honey, brewed by Mirelle. Drink it and the cold can\'t touch you for half an hour — on Hoarfell, all the way up.',
                   type: 'drink', stackable: true, draw: bottleIcon('#d8502a', '#ffb060'), value: 60, potion: 'cold', mins: 30, works: 'Warm through: the cold can\'t touch you (30 min)', onUse: drink },
    owl_eye_tincture: { id: 'owl_eye_tincture', name: 'Owl\'s-Eye Tincture', desc: 'Owlmoss steeped with a moonstone. Drink it and the dark gives way: you see through Arcadia\'s blackouts and the deep places, half an hour.',
                   type: 'drink', stackable: true, draw: bottleIcon('#3a8a5a', '#a8f0c8'), value: 70, potion: 'night_eyes', mins: 30, works: 'Night eyes: the dark gives way (30 min)', onUse: drink },
    swiftwater_tonic: { id: 'swiftwater_tonic', name: 'Swiftwater Tonic', desc: 'Windthistle and honey. You walk as if you were late for something wonderful, a quarter of an hour.',
                   type: 'drink', stackable: true, draw: bottleIcon('#5a8ad8', '#c8e0ff'), value: 40, potion: 'swift', mins: 15, works: 'Light on your feet (15 min)', onUse: drink },
    tidecalm_elixir: { id: 'tidecalm_elixir', name: 'Tidecalm Elixir', desc: 'Moonpetal, a sapphire crystal and honey. The sea takes a liking to you: the sloop sails quicker for half an hour.',
                   type: 'drink', stackable: true, draw: bottleIcon('#2a6a9a', '#a8e0d8'), value: 80, potion: 'tide', mins: 30, works: 'The sea\'s on your side: the sloop sails quicker (30 min)', onUse: drink },
    silverleaf_salve: { id: 'silverleaf_salve', name: 'Silverleaf Salve', desc: 'Silverleaf bruised into warm honey. Health and energy back, at once.',
                   type: 'drink', stackable: true, draw: bottleIcon('#a8b8a8', '#f0f8f0'), value: 30, effects: { hp: 60, energy: 40 }, works: 'Health and energy back', onUse: drink },
    dreamcap_draught: { id: 'dreamcap_draught', name: 'Dreamcap Draught', desc: 'Dreamcap and moonpetal. For twenty minutes things that don\'t want finding glint for you, as they do for the Glimmer Lantern.',
                   type: 'drink', stackable: true, draw: bottleIcon('#7a4ab8', '#e0b0ff'), value: 90, potion: 'glimmer', mins: 20, works: 'Hidden things glint for you (20 min)', onUse: drink },
    // the Rootmarket's food (Merrow's stall)
    waybread:    { id: 'waybread', name: 'Waybread', desc: 'Elven bread baked in leaves. One bite and you could walk till dark.', type: 'food', stackable: true,
                   draw: breadIcon, effects: { hp: 25, energy: 45 }, value: 8, onUse: eat },
    starpear_cider: { id: 'starpear_cider', name: 'Starpear Cider', desc: 'The Hollow Bough\'s own, cloudy and gold. Energy, and a good mood.', type: 'drink', stackable: true,
                   draw: bottleIcon('#d8b040', '#f8e890', '#5a3e26'), effects: { energy: 30 }, value: 5, works: 'Energy', onUse: drink },
    elderflower_wine: { id: 'elderflower_wine', name: 'Elderflower Wine', desc: 'Pale, floral, much stronger than it tastes. Health and energy.', type: 'drink', stackable: true,
                   draw: bottleIcon('#e8e0b0', '#fff8d8', '#5a3e26'), effects: { hp: 20, energy: 25 }, value: 9, works: 'Health and energy', onUse: drink },
    starpear:    { id: 'starpear', name: 'Starpear', desc: 'A gold pear from the canopy orchards, a star in its core when you cut it across.', type: 'food', stackable: true,
                   draw: pearIcon, effects: { hp: 12, energy: 12 }, value: 4, onUse: eat }
  };
  function register() {
    if (typeof BridgeItems === 'undefined' || !BridgeItems.all) return;
    var all = BridgeItems.all();
    Object.keys(ITEMS).forEach(function (id) { if (!all[id]) all[id] = ITEMS[id]; });
  }
  register();

  var RECIPES = [
    { id: 'hearthfire_draught', takes: [['emberroot', 1], ['roseite', 1], ['honey', 1]], where: 'for the cold on Hoarfell' },
    { id: 'owl_eye_tincture', takes: [['owlmoss', 1], ['moonstone', 1]], where: 'for Arcadia\'s blackouts and the deep places' },
    { id: 'swiftwater_tonic', takes: [['windthistle', 1], ['honey', 1]], where: 'for the road, anywhere' },
    { id: 'tidecalm_elixir', takes: [['moonpetal', 1], ['sapphire_crystal', 1], ['honey', 1]], where: 'for the sea on Lumar' },
    { id: 'silverleaf_salve', takes: [['silverleaf', 2], ['honey', 1]], where: 'for cuts and tiredness' },
    { id: 'dreamcap_draught', takes: [['dreamcap', 1], ['moonpetal', 1]], where: 'for finding what\'s hidden' }
  ];
  // what Mirelle sells of her own (the herbs that are hardest to come by stay yours to find)
  var STOCK = [{ id: 'silverleaf', price: 14 }, { id: 'moonpetal', price: 20 }, { id: 'windthistle', price: 18 }];

  function name(id) { var it = BridgeItems.get(id); return it ? it.name : id; }
  function canBrew(r) { return r.takes.every(function (t) { return count(t[0]) >= t[1]; }); }
  function brew(r) {
    var I = inv();
    if (!I || !canBrew(r)) return say('MIRELLE', '"WE\'RE SHORT: ' + r.takes.filter(function (t) { return count(t[0]) < t[1]; }).map(function (t) { return name(t[0]).toUpperCase(); }).join(', ') + '. THE WOOD HAS IT, OR THE STARS DO."');
    if (!I.freeSlots() && !count(r.id)) return say('MIRELLE', '"YOUR PACK\'S FULL. WHERE WOULD I EVEN PUT IT?"');
    r.takes.forEach(function (t) { I.removeItem(t[0], t[1]); });
    I.addItem(r.id, 1);
    st.brewed++; store();
    sfx('brew');
    toast('Brewed with Mirelle', name(r.id), r.where);
    say('MIRELLE', '"' + ({ hearthfire_draught: 'EMBERROOT FIRST, THEN THE CRYSTAL - WATCH IT GO PINK - THEN THE HONEY TO HOLD IT. THERE. DRINK IT WHEN THE COLD STARTS IN YOUR FINGERS, NOT BEFORE.',
      owl_eye_tincture: 'THE MOONSTONE GOES IN WHOLE AND COMES OUT CLEAR. THE MOSS KEEPS WHAT IT TOOK. YOUR EYES WILL FEEL TOO BIG FOR AN HOUR. THAT\'S NORMAL.',
      swiftwater_tonic: 'THISTLEDOWN AND HONEY. ALL THE ELF-CHILDREN WANT THIS ONE. ALL THE ELF-PARENTS DO NOT.',
      tidecalm_elixir: 'A SAPPHIRE IN IT, AND THE MOONPETAL. THE SEA REMEMBERS THE MOON. IT\'LL BE KIND TO YOU FOR A WHILE.',
      silverleaf_salve: 'BRUISE THE LEAVES, WARM THE HONEY. DRINK IT OR RUB IT IN - BOTH WORK, ONE TASTES BETTER.',
      dreamcap_draught: 'DREAMCAP. YOU DID NOT EAT ANY ON THE WAY, I HOPE? GOOD. THINGS THAT HIDE WILL FIND IT HARDER.' })[r.id] + '"');
  }
  /** Mirelle's cauldron: every recipe, what it takes and whether you've got it; and her herbs to buy. */
  function open(intro) {
    if (typeof BridgeInteractions === 'undefined' || !BridgeInteractions.choose) return;
    var rows = RECIPES.map(function (r) {
      var ok = canBrew(r);
      return { label: name(r.id), icon: r.id, sub: r.takes.map(function (t) { return (t[1] > 1 ? t[1] + ' × ' : '') + name(t[0]) + (count(t[0]) >= t[1] ? ' ✓' : ''); }).join(' + '),
               note: ok ? 'brew' : r.where, disabled: !ok, pick: function () { brew(r); } };
    });
    rows.push({ label: 'Mirelle\'s herbs', sub: 'silverleaf, moonpetal, windthistle', note: 'buy', pick: function () {
      BridgeInteractions.execute({ type: 'vendor', label: 'MIRELLE\'S HERBS', items: STOCK });
    } });
    BridgeInteractions.choose({ title: 'Brewing with Mirelle', face: 'npc-elf-herbalist',
      text: intro || '"HERBS FROM THE WOOD, A CRYSTAL FROM LUMAR\'S SEAS, HONEY FROM THE FARMS ON VERDANCE. THE WOOD GROWS THE HALF OF IT; THE REST YOU CARRY HOME. WHAT SHALL WE MAKE?"',
      rows: rows });
  }

  // ---- what's working -------------------------------------------------------------------------------------------
  function active(k) {
    var t = st.active[k];
    return !!(t && t > Date.now());
  }
  function speed() { return active('swift') ? 1.15 : 1; }
  /** Something that works like a potion without being one (the river shrine's blessing): key, minutes, toast. */
  function grant(k, mins, name, works) {
    st.active[k] = Date.now() + mins * MIN; store();
    toast(name || 'Blessed', works || '', '');
  }
  // a potion wearing off says so
  setInterval(function () {
    var now = Date.now(), changed = false;
    Object.keys(st.active).forEach(function (k) {
      if (st.active[k] <= now) {
        var p = Object.keys(ITEMS).map(function (id) { return ITEMS[id]; }).filter(function (it) { return it.potion === k; })[0];
        delete st.active[k]; changed = true;
        if (p) toast('Worn off', p.name, '');
      }
    });
    if (changed) store();
  }, 5000);
  function left(k) { var t = st.active[k]; return t && t > Date.now() ? Math.ceil((t - Date.now()) / MIN) : 0; }

  return { open: open, active: active, speed: speed, left: left, grant: grant, RECIPES: RECIPES, ITEMS: ITEMS,
           _st: function () { return st; }, _reset: function () { st = { active: {}, brewed: 0 }; store(); } };
})();
