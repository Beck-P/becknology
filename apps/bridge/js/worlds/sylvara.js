/**
 * Sylvara — the wood elves' forest (scenes/sylvara.py, scenes/sylvara_hall.py): the life of the place over the render.
 *
 * Outdoors (Elderglade, dusk): fireflies drifting and blinking in the wood, a few gold leaves falling through the
 * slanting light, motes rising off the Moonwell. In the Heartwood Hall: dust turning slowly in the light from the
 * round window. All in world space (so they scroll with the scene), on whole native pixels.
 *
 * The willow keepsake: once the first sword has said it (quests.json `under-the-willow`), Faelan's lanterns and
 * Sefa's ribbons stay up in the willow over the Moonwell for good — the scene's `willow: lit` layer
 * (scenes/sylvara.py, `E.willow_keepsake`), switched on as the glade loads (`decorate`) or the moment it happens,
 * each lantern breathing a little warm light (`scene.keepsake`, screen tiles). The willow's words follow the story.
 */
var BridgeSylvara = (function () {
  // a cheap, stable hash: the same firefly is always in the same part of the wood
  function h(i, k) { var x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); }

  function fireflies(ctx, world, offX, offY, ts, now) {
    var n = 70;
    for (var i = 0; i < n; i++) {
      // each one wanders round its own home spot, on its own slow loop
      var hx = h(i, 1) * world.width, hy = 5 + h(i, 2) * (world.height - 7);
      var t = now / (2600 + h(i, 3) * 2400) + h(i, 4) * 6.28;
      var x = hx + Math.sin(t) * 1.4 + Math.sin(t * 2.3) * 0.4;
      var y = hy + Math.cos(t * 0.8) * 0.9 - 0.6 - Math.sin(t * 1.7) * 0.3;
      var blink = 0.5 + 0.5 * Math.sin(now / (380 + h(i, 5) * 300) + i);
      if (blink < 0.25) continue;
      var sx = Math.round(offX + x * ts), sy = Math.round(offY + y * ts);
      ctx.fillStyle = 'rgba(220,255,150,' + (0.15 * blink).toFixed(2) + ')';
      ctx.fillRect(sx - 2, sy - 2, 5, 5);
      ctx.fillStyle = 'rgba(240,255,190,' + (0.55 + 0.45 * blink).toFixed(2) + ')';
      ctx.fillRect(sx, sy, 1, 1);
    }
  }

  function leaves(ctx, world, offX, offY, ts, now) {
    var W = ctx.canvas.width, H = ctx.canvas.height;
    for (var i = 0; i < 18; i++) {
      var period = 9000 + h(i, 7) * 7000;
      var k = ((now + h(i, 8) * period) % period) / period;
      var x = h(i, 9) * (W + 60) - 30 + k * 40 + Math.sin(now / 700 + i) * 6;
      var y = -10 + k * (H + 20);
      var flip = Math.sin(now / 260 + i * 1.7) > 0;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(224,176,64,0.85)' : i % 3 === 1 ? 'rgba(200,130,48,0.8)' : 'rgba(150,180,70,0.8)';
      ctx.fillRect(Math.round(x), Math.round(y), flip ? 2 : 1, flip ? 1 : 2);
    }
  }

  // motes rising off the Moonwell (outdoors) and the hall's basin
  function motes(ctx, offX, offY, ts, now, cx, cr, r, n) {
    for (var i = 0; i < n; i++) {
      var period = 2600 + h(i, 11) * 2000;
      var k = ((now + h(i, 12) * period) % period) / period;
      var a = h(i, 13) * 6.28;
      var x = cx + Math.cos(a) * r * h(i, 14), y = cr + Math.sin(a) * r * 0.6 * h(i, 14) - k * 1.6;
      ctx.fillStyle = 'rgba(200,250,240,' + (0.8 * (1 - k)).toFixed(2) + ')';
      ctx.fillRect(Math.round(offX + x * ts), Math.round(offY + y * ts), 1, 1);
    }
  }

  function dust(ctx, offX, offY, ts, now) {
    for (var i = 0; i < 40; i++) {
      var t = now / (9000 + h(i, 21) * 6000) + h(i, 22) * 6.28;
      var x = 8 + h(i, 23) * 6 + Math.sin(t) * 1.2, y = 2.5 + h(i, 24) * 5 + Math.cos(t * 0.7) * 0.8;
      var a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(now / 900 + i));
      ctx.fillStyle = 'rgba(255,232,176,' + a.toFixed(2) + ')';
      ctx.fillRect(Math.round(offX + x * ts), Math.round(offY + y * ts), 1, 1);
    }
  }

  // ---- the willow keepsake ------------------------------------------------------------------------------------------------
  function wed() { return typeof BridgeQuests !== 'undefined' && BridgeQuests.has && BridgeQuests.has('under-the-willow'); }
  function willowWords(data) {
    var q = typeof BridgeQuests !== 'undefined' && BridgeQuests.has ? BridgeQuests.has : function () { return false; };
    (data.interactions || []).forEach(function (it) {
      if (it.label !== 'WILLOW') return;
      it.dialog = wed()
        ? "THE WILLOW OVER THE MOONWELL, HUNG WITH FAELAN'S LEAF LANTERNS AND SEFA'S RIBBONS OF GREEN SILK AND GOLD. THE ELVES SAY IT'S WHERE THE FIRST SWORD FINALLY SAID IT. PIP SAYS SHE SAW."
        : q('queens-favour/ribbon')
          ? 'A WILLOW BENDING OVER THE MOONWELL, ITS FRONDS TRAILING IN THE WATER. NOTHING CAUGHT IN IT NOW.'
          : 'A WILLOW BENDING OVER THE MOONWELL, ITS FRONDS TRAILING IN THE WATER. SOMETHING IS CAUGHT HIGH IN THEM.';   // (the ribbon's clue says what)
    });
  }
  // ---- the new places join on (Elderglade and the Heartwood Hall are built by their own scripts: their ways out to the
  // Rootmarket, the Silverrun and the Crown are added here as they load, the cells opened) -----------------------------
  var JOINS = {
    sylvara: [
      { x: 44, y: 18, type: 'enter_world', label: 'THE ROOTMARKET', prompt: 'PRESS E TO WALK EAST INTO THE CITY', target: 'sylvara-roots', spawn: [1, 20] },
      { x: 17, y: 31, type: 'enter_world', label: 'THE SILVERRUN', prompt: 'PRESS E TO WALK DOWN TO THE RIVER', target: 'sylvara-river', spawn: [6, 4] }
    ],
    // a stair winding up inside the Great Tree from the Heartwood Hall to the Crown
    'sylvara-hall': [
      { x: 1, y: 7, type: 'enter_world', label: 'THE HEARTWOOD STAIR', prompt: 'PRESS E TO CLIMB UP TO THE CROWN', target: 'sylvara-crown', spawn: [14, 17] }
    ]
  };
  function joins(worldId, data) {
    (JOINS[worldId] || []).forEach(function (j) {
      if ((data.interactions || []).some(function (it) { return it.target === j.target && it.x === j.x && it.y === j.y; })) return;
      var it = {};
      for (var k in j) it[k] = j[k];
      it._join = true;
      (data.interactions = data.interactions || []).push(it);
      if (data.collisions && data.collisions[j.y]) data.collisions[j.y][j.x] = 0;
    });
  }

  // Aerin keeps her range in the Rootmarket by day (9 to 17, Sylvara's clock) and the landing ring the rest of the time
  function rangeHours() {
    var h = typeof BridgeClock !== 'undefined' && BridgeClock.time ? BridgeClock.time('sylvara').h : 12;
    return h >= 9 && h < 17;
  }
  function aerin(worldId, data) {
    var here = (worldId === 'sylvara-roots') === rangeHours();
    if (here) return;
    data.interactions = (data.interactions || []).filter(function (it) { return it.label !== 'WARDEN'; });
    if (data.scene && data.scene.actors) data.scene.actors = data.scene.actors.filter(function (a) { return a.sheet !== 'npc-elf-warden'; });
    if (worldId === 'sylvara-roots') (data.interactions = data.interactions || []).push({ x: 36, y: 30, type: 'dialog', label: 'RANGE BOARD', prompt: 'PRESS E TO READ',
      dialog: 'A BOARD BY THE LINE, A LEAF BURNT INTO IT: THE RANGE IS AERIN\'S FROM THE NINTH HOUR TO THE SEVENTEENTH. OUTSIDE THOSE, SHE KEEPS THE LANDING RING IN ELDERGLADE. (SHE MEANS IT.)' });
  }

  /** E on one of Sylvara's own things (type 'sylvan', by kind): the range and zip lines (js/bows.js), the canoe
   *  (js/canoe.js), brewing (js/brewing.js), lifts and the rest here. */
  function use(inter) {
    var k = inter.kind;
    if ((k === 'range' || k === 'zip') && typeof BridgeBows !== 'undefined') return BridgeBows.use(inter);
    if ((k === 'canoe' || k === 'launch') && typeof BridgeCanoe !== 'undefined') return BridgeCanoe.use(inter);
    if (k === 'brew' && typeof BridgeBrewing !== 'undefined') return BridgeBrewing.use(inter);
    if (k === 'lift') return lift(inter);
    if (k === 'cache') return cache(inter);
    if (k === 'stars') return telescope();
    if (k === 'dial') return dial();
    if (k === 'shrine') return shrine();
    if (k === 'source') return source();
    if (k === 'mossback') return mossback();
  }
  // ---- the river shrine: leave a flower and the river carries you kindly (the canoe a little quicker for twenty minutes) --
  var FLOWERS = ['moonpetal', 'windthistle', 'silverleaf'];
  function shrine() {
    var I = typeof BridgeInventory !== 'undefined' ? BridgeInventory : null;
    var have = I ? FLOWERS.filter(function (id) { return I.getCount(id) > 0; })[0] : null;
    if (!have) return BridgeInteractions.say('THE RIVER SHRINE', 'A BOWL OF SILVER-GREEN WATER ON AN ALTAR OF MOSSY STONE, FLOWERS LEFT ROUND IT, SOME FRESH, SOME DRIED TO PAPER. THE ELVES LEAVE ONE HERE BEFORE THEY GO DOWN TO THE FALLS. YOU HAVEN\'T ANY FLOWERS ON YOU.');
    I.removeItem(have, 1);
    if (typeof BridgeBrewing !== 'undefined' && BridgeBrewing.grant) BridgeBrewing.grant('river', 20, 'The river\'s blessing', 'Your canoe runs a little quicker (20 min)');
    if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('chime');
    BridgeInteractions.say('THE RIVER SHRINE', 'YOU LAY ' + ((BridgeItems.get(have) || {}).name || 'A FLOWER').toUpperCase() + ' BY THE BOWL. THE WATER IN IT SHIVERS, THOUGH THERE\'S NO WIND, AND THE STONES\' RUNES GLOW A MOMENT BRIGHTER. THE RIVER WILL BE KIND TO YOU FOR A WHILE.');
  }
  // ---- the Moonwell's source: kneel and drink — once a day it fills you up; at night under a full moon, more ------------
  function source() {
    var S = sst(), day = Math.floor(Date.now() / 86400000), sky_ = sky(), full = sky_ && sky_.phase != null && Math.abs(sky_.phase - 0.5) < 0.04, night = sky_ && sky_.sun < 0.3;
    var I = typeof BridgeInventory !== 'undefined' ? BridgeInventory : null;
    if (S.source === day) return BridgeInteractions.say('THE MOONWELL\'S SOURCE', 'THE WATER WELLS UP SILVER-GREEN OUT OF THE GROUND, COLD AND STILL. YOU\'VE DRUNK FROM IT TODAY ALREADY; IT SEEMS TO KNOW.');
    S.source = day;
    try { localStorage.setItem(SKEY, JSON.stringify(S)); } catch (e) { /* private mode */ }
    if (I) I.restoreAll();
    if (full && night && I) I.addItem('moonpetal', 3);
    if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('chime');
    BridgeInteractions.say('THE MOONWELL\'S SOURCE', 'YOU KNEEL AND DRINK. IT TASTES OF STONE AND COLD AND, VERY FAINTLY, OF THE MOON. EVERY ACHE GOES OUT OF YOU.' +
      (full && night ? '\n\nTHE FULL MOON IS IN THE WATER AND THE MOONPETALS ROUND THE SPRING OPEN ALL AT ONCE. THREE OF THEM COME AWAY IN YOUR HAND.' : '') +
      '\n\nTHE ELVES SAY THIS IS WHERE THE MOONWELL IN ELDERGLADE BEGINS: THE SAME WATER, GONE UNDER THE EARTH AND UP AGAIN UNDER THE WILLOW.');
  }
  // ---- the Mossback: asleep (a different dream each time); awake, a little, at the full moon ------------------------------
  function mossback() {
    var sky_ = sky(), full = sky_ && sky_.phase != null && Math.abs(sky_.phase - 0.5) < 0.04, night = sky_ && sky_.sun < 0.3;
    var DREAMS = ['A SLOW BREATH GOES IN, AND, A LONG TIME LATER, OUT. THE BIRCH ON ITS SHELL SWAYS WITH IT.',
                  'ITS EYELID FLICKERS. IN ITS SLEEP IT MAKES A SOUND LIKE A DOOR IN AN OLD HOUSE.',
                  'A BUTTERFLY LANDS ON ITS NOSE. NOTHING HAPPENS FOR A WHILE. THE BUTTERFLY LEAVES, SATISFIED.',
                  'SORREL HAS LEFT A HANDFUL OF CLOVER BY ITS MOUTH. IT HASN\'T NOTICED. IT HASN\'T NOTICED FOR A CENTURY.'];
    if (full && night) return BridgeInteractions.say('THE MOSSBACK', 'ONE GREAT EYE OPENS, DARK AND WET AND OLD AS THE WOOD. IT LOOKS AT YOU A LONG TIME. THEN, DEEP AS A ROOT, NOT QUITE IN WORDS: "STILL HERE. GOOD." THE EYE CLOSES.');
    BridgeInteractions.say('THE MOSSBACK', DREAMS[Math.floor(Date.now() / 600000) % DREAMS.length]);
  }
  // ---- the star platform: what the telescope shows by the hour and the moon, what the dial says ------------------------
  function sky() { return typeof BridgeClock !== 'undefined' && BridgeClock.sky ? BridgeClock.sky('sylvara') : null; }
  function moonWords(ph) {
    return ph < 0.03 || ph > 0.97 ? 'NEW - THE WOOD IS IN THE DIMMING' : ph < 0.22 ? 'A THIN WAXING CRESCENT' : ph < 0.28 ? 'HALF, AND WAXING' : ph < 0.47 ? 'WAXING, NEARLY FULL'
      : ph < 0.53 ? 'FULL' : ph < 0.72 ? 'WANING, STILL BRIGHT' : ph < 0.78 ? 'HALF, AND WANING' : 'A THIN WANING CRESCENT';
  }
  function telescope() {
    var S = sky(), night = S ? S.sun < 0.3 : false, ph = S && S.phase != null ? S.phase : 0.5;
    var wx = typeof BridgeWeather !== 'undefined' && BridgeWeather.here ? BridgeWeather.here() : null, cloudy = wx && /rain|fog|mist|cloud/.test(wx.kind || '');
    BridgeInteractions.say('THE TELESCOPE', cloudy ? 'CLOUD, AND MORE CLOUD. ITHIL SAYS THE STARS ARE STILL THERE, BEHIND IT, BEING EXCELLENT.'
      : night ? 'THE MOON, ' + moonWords(ph) + ', SO CLOSE YOU COULD COUNT ITS SEAS. SWING IT ROUND AND THE HARP AND THE STAG ARE OVER THE EAST, AND LOW IN THE SOUTH A RED STAR ITHIL CALLS THE LANTERN, THAT ONLY RISES IN THE AUTUMN.'
      : 'BY DAY THE TELESCOPE SHOWS THE CANOPY RUNNING AWAY TO THE EDGE OF THE WORLD, THE SILVERRUN GLINTING IN IT, AND - VERY SMALL AND VERY FAR - MIRROR LAKE, HOLDING THE SKY.');
  }
  function dial() {
    var S = sky(), T = typeof BridgeClock !== 'undefined' && BridgeClock.time ? BridgeClock.time('sylvara') : null;
    BridgeInteractions.say('THE STAR DIAL', 'THE DIAL\'S GOLD HAND LIES ON ' + (T ? T.text : 'THE HOUR') + ' OF SYLVARA\'S DAY. THE MOONSTONE IN THE MIDDLE SAYS THE MOON IS ' + moonWords(S && S.phase != null ? S.phase : 0.5) + '.' +
      (S && S.season ? ' THE RING OF THE YEAR READS ' + String(S.season).toUpperCase() + '.' : ''));
  }
  // ---- caches: carved boxes in out-of-the-way places (what a bow gets you to) — each opened once, kept in bridge_sylvara --
  var CACHES = {
    nook: { coins: 120, items: [['owlmoss', 2], ['dreamcap', 1]], text: 'UNDER A FOLDED LEAF OF A NOTE ("FOR WHOEVER GETS DOWN HERE. - P.") : A LITTLE PURSE OF COINS, AND HERBS WRAPPED IN MOSS.' },
    owl: { coins: 200, items: [['owlmoss', 4], ['fire_arrow', 3]], text: 'THE OWL WATCHES YOU OPEN IT. INSIDE: THE WARDENS\' CACHE FOR THE OWL\'S REST - COINS, FIRE ARROWS, AND OWLMOSS PICKED FROM THE NEST WITH THE OWL\'S GRUDGING PERMISSION.' },
    falls: { coins: 250, items: [['emberroot', 2], ['moonpetal', 2]], text: 'BEHIND THE CURTAIN OF WATER, IN A DRY NICHE: A BOX OF OILED WOOD, AND IN IT A HANDFUL OF OLD COINS AND HERBS THAT HAVE NO BUSINESS STILL BEING FRESH.' },
    deep: { coins: 180, items: [['emberroot', 3], ['dreamcap', 2]], text: 'A BOX GROWN HALF INTO THE ROOTS, ITS LID MOSSED OVER. SOMEONE LEFT IT A LONG TIME AGO FOR SOMEONE WHO NEVER CAME.' }
  };
  var SKEY = 'bridge_sylvara';
  function sst() { try { return JSON.parse(localStorage.getItem(SKEY) || '{}') || {}; } catch (e) { return {}; } }
  function cache(inter) {
    var c = CACHES[inter.cache], S = sst();
    if (!c) return;
    S.caches = S.caches || {};
    if (S.caches[inter.cache]) return BridgeInteractions.say(inter.label || 'CARVED BOX', 'EMPTY NOW. YOU TOOK WHAT WAS IN IT. SOMEONE HAS LEFT A FLOWER IN IT, THOUGH.');
    S.caches[inter.cache] = Date.now();
    try { localStorage.setItem(SKEY, JSON.stringify(S)); } catch (e) { /* private mode */ }
    var got = [];
    c.items.forEach(function (it) { if (typeof BridgeInventory !== 'undefined' && BridgeInventory.addItem(it[0], it[1])) got.push(it[1] + ' ' + (BridgeItems.get(it[0]) || {}).name); });
    if (c.coins && typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins) BridgeProgression.awardCoins(c.coins, 'sylvara:' + inter.cache);
    if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('quest');
    if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast('Found', (inter.label || 'A box').toLowerCase().replace(/^./, function (m) { return m.toUpperCase(); }), got.join(', '));
    BridgeInteractions.say(inter.label || 'CARVED BOX', c.text + '\n\n(+' + c.coins + ' COINS' + (got.length ? ', ' + got.join(', ').toUpperCase() : '') + ')');
  }
  // a basket lift: down or up between the tiers, the basket swaying, the wood going by
  function lift(inter) {
    if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('lift');
    BridgeWorld.enterWorld(inter.target, inter.spawn);
  }
  // ---- what people sell and do (a talk card's topic with `sylvan`, js/interactions.js) ------------------------------------
  var SHOPS = {
    bowyer: { label: 'CORIN\'S BOWS', items: [{ id: 'elven_bow', price: 260 }, { id: 'rope_arrow', price: 18 }, { id: 'heartwood_bow', price: 1200 }] },
    lanterns: { label: 'WREN\'S LANTERNS', items: [{ id: 'fire_arrow', price: 14 }] },
    grocer: { label: 'MERROW\'S STALL', items: [{ id: 'starpear', price: 6 }, { id: 'waybread', price: 16 }, { id: 'honey', price: 30 }] },
    tavern: { label: 'THE HOLLOW BOUGH', items: [{ id: 'starpear_cider', price: 8 }, { id: 'elderflower_wine', price: 14 }, { id: 'honey_cake', price: 12 }, { id: 'waybread', price: 16 }] }
  };
  function topic(what, person, line) {
    var parts = String(what).split(':'), k = parts[0];
    if (k === 'shop' && SHOPS[parts[1]]) return BridgeInteractions.execute({ type: 'vendor', label: SHOPS[parts[1]].label, items: SHOPS[parts[1]].items });
    if (k === 'brew' && typeof BridgeBrewing !== 'undefined') return BridgeBrewing.open(line ? '"' + line + '"' : null);
    if (k === 'range' && typeof BridgeBows !== 'undefined') return BridgeBows.use({ kind: 'range' });
    if (k === 'canoe' && typeof BridgeCanoe !== 'undefined') return BridgeCanoe.hire(person, line);
  }

  /** Every lantern of a group lit by fire arrows (js/bows.js): what that opens. */
  function groupLit(group, world) {
    if (typeof BridgeInteractions === 'undefined') return;
    var words = {
      boughs: 'THE LAST OF THE HIGH LANTERNS CATCHES. ALL ALONG THE BOUGHS THE ELVES COME OUT ON THEIR PLATFORMS TO LOOK. SOMEONE STARTS SINGING. WREN, THE LANTERN MAKER, WILL WANT TO HEAR ABOUT THIS.'
    };
    BridgeInteractions.say('THE LANTERNS', words[group] || 'THE LAST LANTERN CATCHES.');
  }

  function decorate(worldId, data) {                 // js/world.js, as each world loads
    if (!data) return;
    reg();
    if (typeof BridgeBows !== 'undefined') BridgeBows.decorate(worldId, data);
    if (typeof BridgeCanoe !== 'undefined') BridgeCanoe.decorate(worldId, data);
    if (/^sylvara/.test(worldId)) joins(worldId, data);
    if (worldId === 'sylvara' || worldId === 'sylvara-roots') aerin(worldId, data);
    if (worldId !== 'sylvara') return;
    willowWords(data);
    if (data.scene && wed()) { data.scene.layers = data.scene.layers || {}; data.scene.layers.willow = 'lit'; }
  }
  var lit = false;
  function keepsake(ctx, world, offX, offY, ts, now) {
    willowWords(world);                               // the willow says what the story's got to (cheap: one label match)
    var on = wed(), sid = world.scene && world.scene.id;
    if (on && !lit && sid && typeof BridgeScene !== 'undefined') {          // it just happened: up they go, there and then
      var map = {}, cur = BridgeScene.getLayers(sid);
      for (var k in cur) map[k] = cur[k];
      if (map.willow !== 'lit') { map.willow = 'lit'; BridgeScene.setLayers(sid, map); }
      willowWords(world);
    }
    lit = on;
    if (!on) return;
    (world.scene.keepsake || []).forEach(function (p, i) {                // each lantern breathing a little warm light
      var a = 0.5 + 0.5 * Math.sin(now / (900 + h(i, 31) * 700) + i * 1.9);
      var sx = Math.round(offX + p[0] * ts), sy = Math.round(offY + p[1] * ts);
      ctx.fillStyle = 'rgba(255,216,144,' + (0.07 + 0.07 * a).toFixed(3) + ')';
      ctx.fillRect(sx - 4, sy - 3, 9, 7);
      ctx.fillRect(sx - 2, sy - 5, 5, 11);
      ctx.fillStyle = 'rgba(255,232,180,' + (0.12 + 0.12 * a).toFixed(3) + ')';
      ctx.fillRect(sx - 1, sy - 1, 3, 3);
    });
  }

  // ---- the new places' life (workstream F) ------------------------------------------------------------------------------
  function light(world) {                             // the place's day / dusk / night weights (js/scene.js)
    var id = world.scene && world.scene.id, K = id && typeof BridgeScene !== 'undefined' && BridgeScene.sky ? BridgeScene.sky(id) : null;
    return K || { day: 1, dusk: 0, night: 0 };
  }
  // butterflies over flowers by day: a pair of wings opening and shutting, wandering
  function butterflies(ctx, offX, offY, ts, now, area, n, K) {
    if (K.night > 0.6) return;
    var cols = ['#f0d070', '#f0f0f0', '#a878d8', '#f0a0b8', '#88c8f0'];
    for (var i = 0; i < n; i++) {
      var t = now / (5000 + h(i, 41) * 4000) + h(i, 42) * 6.28;
      var x = area[0] + h(i, 43) * (area[2] - area[0]) + Math.sin(t) * 1.6 + Math.sin(t * 2.7) * 0.4;
      var y = area[1] + h(i, 44) * (area[3] - area[1]) + Math.cos(t * 0.9) * 1.1 - 0.6;
      var X = Math.round(offX + x * ts), Y = Math.round(offY + y * ts) - 10 - Math.round(Math.abs(Math.sin(t * 3)) * 4);
      var open = Math.sin(now / 90 + i * 2) > 0;
      ctx.fillStyle = cols[i % cols.length];
      if (open) { ctx.fillRect(X - 2, Y, 2, 2); ctx.fillRect(X + 1, Y, 2, 2); } else { ctx.fillRect(X - 1, Y - 1, 1, 2); ctx.fillRect(X + 1, Y - 1, 1, 2); }
      ctx.fillStyle = '#2a1e14'; ctx.fillRect(X, Y, 1, 2);
    }
  }
  // glow-moths: slow, pale, a soft light about them (the Deepwood's grove, at dusk and night)
  function glowmoths(ctx, offX, offY, ts, now, area, n, K) {
    var a0 = Math.max(K.night, K.dusk * 0.7, 0.25);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < n; i++) {
      var t = now / (8000 + h(i, 51) * 6000) + h(i, 52) * 6.28;
      var x = area[0] + h(i, 53) * (area[2] - area[0]) + Math.sin(t) * 1.8, y = area[1] + h(i, 54) * (area[3] - area[1]) + Math.cos(t * 0.7) * 1.2;
      var X = Math.round(offX + x * ts), Y = Math.round(offY + y * ts) - 18 - Math.round(Math.sin(t * 2.3) * 6);
      var col = i % 3 ? '168,224,255' : '200,170,255';
      if (typeof BridgeFX !== 'undefined' && BridgeFX.glow) BridgeFX.glow(ctx, X, Y, 8, col.split(',').map(Number), 0.3 * a0);
      ctx.fillStyle = 'rgba(' + col + ',' + (0.9 * a0).toFixed(2) + ')';
      var flap = Math.sin(now / 120 + i) > 0 ? 1 : 0;
      ctx.fillRect(X - 1 - flap, Y, 1, 1); ctx.fillRect(X + 1 + flap, Y, 1, 1); ctx.fillRect(X, Y, 1, 1);
    }
    ctx.restore();
  }
  // lantern frogs on the lily pads: lighting up one by one at dusk and night, gold-green, a chirp's worth each
  function frogs(ctx, offX, offY, ts, now, cx, cr, rx, ry, n, K) {
    var a0 = Math.max(K.night, K.dusk);
    if (a0 < 0.15) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < n; i++) {
      var ang = h(i, 61) * 6.28, d = 0.3 + 0.6 * h(i, 62);
      var X = Math.round(offX + (cx + Math.cos(ang) * rx * d) * ts), Y = Math.round(offY + (cr + Math.sin(ang) * ry * d) * ts);
      var ph = ((now / 1000 + h(i, 63) * 9) % 4.5) / 4.5, on = ph < 0.25 ? Math.sin(ph / 0.25 * Math.PI) : 0;
      if (on <= 0) continue;
      if (typeof BridgeFX !== 'undefined' && BridgeFX.glow) BridgeFX.glow(ctx, X, Y, 7, [200, 240, 120], 0.45 * on * a0);
      ctx.fillStyle = 'rgba(230,255,150,' + (on * a0).toFixed(2) + ')'; ctx.fillRect(X, Y, 2, 1);
    }
    ctx.restore();
  }
  // mist drifting in the drop under the Boughs (drawn under everyone, only where there's no walkway)
  function dropMist(ctx, world, offX, offY, ts, now) {
    var C = world.collisions;
    for (var i = 0; i < 36; i++) {
      var period = 30000 + h(i, 71) * 20000, k = ((now + h(i, 72) * period) % period) / period;
      var x = -4 + k * (world.width + 8), y = 2 + h(i, 73) * (world.height - 2);
      var cx = Math.floor(x), cy = Math.floor(y);
      if (C[cy] && C[cy][cx] === 0) continue;
      var X = Math.round(offX + x * ts), Y = Math.round(offY + y * ts), R = 18 + h(i, 74) * 26;
      var g = ctx.createRadialGradient(X, Y, 0, X, Y, R);
      g.addColorStop(0, 'rgba(200,226,214,' + (0.12 * Math.sin(k * Math.PI)).toFixed(3) + ')'); g.addColorStop(1, 'rgba(200,226,214,0)');
      ctx.fillStyle = g; ctx.fillRect(X - R, Y - R, R * 2, R * 2);
    }
  }
  // the falls: spray rising and drifting, and a rainbow in it when the sun's out
  function spray(ctx, offX, offY, ts, now, x0, x1, y, K) {
    for (var i = 0; i < 40; i++) {
      var period = 2200 + h(i, 81) * 1800, k = ((now + h(i, 82) * period) % period) / period;
      var X = Math.round(offX + (x0 + h(i, 83) * (x1 - x0) + Math.sin(k * 3 + i) * 0.4) * ts), Y = Math.round(offY + (y - k * 1.6) * ts);
      ctx.fillStyle = 'rgba(236,246,248,' + (0.55 * (1 - k)).toFixed(2) + ')';
      ctx.fillRect(X, Y, k < 0.3 ? 2 : 1, 1);
    }
    if (K.day > 0.5) {
      var cx = offX + (x0 + x1) / 2 * ts, cy = offY + (y + 0.6) * ts, R = (x1 - x0) * ts * 0.55;
      ['255,90,90', '255,190,80', '250,240,110', '120,220,120', '110,170,255', '170,120,230'].forEach(function (c, j) {
        ctx.strokeStyle = 'rgba(' + c + ',' + (0.13 * K.day).toFixed(3) + ')'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, R - j, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      });
    }
  }
  // otters in the pool below the weir: a head up, looking round, under again
  function otters(ctx, offX, offY, ts, now, cx, cr) {
    for (var i = 0; i < 3; i++) {
      var period = 5200 + i * 1300, k = ((now + i * 1900) % period) / period;
      if (k > 0.55) continue;
      var x = cx + Math.sin(i * 2.1 + Math.floor(now / period) * 1.7) * 1.4, y = cr + 0.6 + Math.cos(i * 1.3 + Math.floor(now / period)) * 0.5;
      var X = Math.round(offX + x * ts), Y = Math.round(offY + y * ts), up = Math.round(Math.sin(k / 0.55 * Math.PI) * 3);
      ctx.fillStyle = 'rgba(228,244,246,0.6)'; ctx.fillRect(X - 3, Y + 1, 7, 1);
      ctx.fillStyle = '#0b0a18'; ctx.fillRect(X - 2, Y - up - 1, 5, up + 2);
      ctx.fillStyle = '#5a3a24'; ctx.fillRect(X - 1, Y - up, 3, up + 1);
      ctx.fillStyle = '#c8a070'; ctx.fillRect(X, Y - up + 1, 1, 1);
    }
  }
  // birds crossing over the Crown by day; a falling star now and then at night
  function birds(ctx, world, now, K) {
    var W = ctx.canvas.width;
    if (K.day + K.dusk > 0.4) for (var i = 0; i < 5; i++) {
      var period = 16000 + i * 3000, k = ((now + i * 4100) % period) / period;
      var X = Math.round(-20 + k * (W + 40)), Y = Math.round(20 + i * 13 + Math.sin(k * 6 + i) * 4), f = Math.sin(now / 140 + i) > 0 ? 1 : 0;
      ctx.fillStyle = '#1a2a2a'; ctx.fillRect(X - 2, Y - f, 2, 1); ctx.fillRect(X + 1, Y - f, 2, 1); ctx.fillRect(X, Y, 1, 1);
    }
    if (K.night > 0.5) {
      var p = 9000, kk = (now % p) / p;
      if (kk < 0.12) {
        var sx = W * (0.2 + 0.6 * h(Math.floor(now / p), 91)), sy = 10 + 30 * h(Math.floor(now / p), 92), L = kk / 0.12 * 40;
        for (var j = 0; j < 10; j++) { ctx.fillStyle = 'rgba(255,255,240,' + ((1 - j / 10) * (1 - kk / 0.12)).toFixed(2) + ')'; ctx.fillRect(Math.round(sx + L - j * 2), Math.round(sy + (L - j * 2) * 0.4), 1, 1); }
      }
    }
  }
  function placeLife(ctx, world, offX, offY, ts, now, id) {
    var K = light(world);
    if (id === 'sylvara-roots') { fireflies(ctx, world, offX, offY, ts, now); leaves(ctx, world, offX, offY, ts, now); }
    else if (id === 'sylvara-boughs') { leaves(ctx, world, offX, offY, ts, now); if (K.night + K.dusk > 0.3) fireflies(ctx, world, offX, offY, ts, now); }
    else if (id === 'sylvara-crown') { leaves(ctx, world, offX, offY, ts, now); birds(ctx, world, now, K); }
    else if (id === 'sylvara-river') { otters(ctx, offX, offY, ts, now, 27.6, 21.6); fireflies(ctx, world, offX, offY, ts, now); butterflies(ctx, offX, offY, ts, now, [4, 4, 18, 34], 6, K); }
    else if (id === 'sylvara-falls') { spray(ctx, offX, offY, ts, now, 21.2, 25.4, 21.4, K); fireflies(ctx, world, offX, offY, ts, now); }
    else if (id === 'sylvara-lake') { butterflies(ctx, offX, offY, ts, now, [37, 11, 49, 31], 12, K); fireflies(ctx, world, offX, offY, ts, now); motes(ctx, offX, offY, ts, now, 9.4, 17.6, 0.8, 12); }
    else if (id === 'sylvara-deepwood') {
      butterflies(ctx, offX, offY, ts, now, [14, 21, 34, 33], 14, K);
      glowmoths(ctx, offX, offY, ts, now, [27, 4, 49, 16], 16, K);
      frogs(ctx, offX, offY, ts, now, 13.6, 17.2, 1.8, 1.3, 9, K);
      fireflies(ctx, world, offX, offY, ts, now);
    }
    else if (id === 'sylvara-tavern') dust(ctx, offX, offY, ts, now);
    else if (id === 'sylvara-fallcave') motes(ctx, offX, offY, ts, now, 10.0, 13.6, 4.0, 20);
  }
  function ground(ctx, world, offX, offY, ts, now) {
    var id = (BridgeWorld.getWorldId && BridgeWorld.getWorldId()) || '';
    if (id === 'sylvara-boughs') dropMist(ctx, world, offX, offY, ts, now);
  }

  function over(ctx, world, offX, offY, ts, now) {
    var id = (BridgeWorld.getWorldId && BridgeWorld.getWorldId()) || '';
    if (id !== 'sylvara' && id !== 'sylvara-hall' && /^sylvara-/.test(id)) return placeLife(ctx, world, offX, offY, ts, now, id);
    if (id === 'sylvara') {
      keepsake(ctx, world, offX, offY, ts, now);
      fireflies(ctx, world, offX, offY, ts, now);
      motes(ctx, offX, offY, ts, now, 9.0, 19.0, 1.2, 16);
      leaves(ctx, world, offX, offY, ts, now);
    } else if (id === 'sylvara-hall') {
      dust(ctx, offX, offY, ts, now);
      motes(ctx, offX, offY, ts, now, 18.6, 2.7, 0.35, 5);
    }
  }

  // ---- the sky over the Crown (scene.backdrop: drawn wherever the render is empty) — day, dusk, night by the scene's light,
  // stars, Sylvara's silver-green moon in its real phase ----------------------------------------------------------------
  var SKY = { day: ['#7ab4e0', '#a8d0ec', '#d8ecf0'], dusk: ['#2a3a6a', '#7a5a8a', '#f0a868'], night: ['#060c1c', '#0e1a30', '#1e3040'] };
  function mix(a, b, t) {
    var A = [1, 3, 5].map(function (i) { return parseInt(a.substr(i, 2), 16); }), B = [1, 3, 5].map(function (i) { return parseInt(b.substr(i, 2), 16); });
    return 'rgb(' + A.map(function (v, i) { return Math.round(v + (B[i] - v) * t); }).join(',') + ')';
  }
  function skyDraw(ctx, w, h, now) {
    var wd = BridgeWorld.getWorld && BridgeWorld.getWorld(), id = wd && wd.scene && wd.scene.id;
    var K = id && typeof BridgeScene !== 'undefined' && BridgeScene.sky ? BridgeScene.sky(id) : null;
    K = K || { day: 1, dusk: 0, night: 0 };
    var g = ctx.createLinearGradient(0, 0, 0, h * 0.6);
    [0, 0.5, 1].forEach(function (at, i) {
      var d = SKY.day[i], u = SKY.dusk[i], n = SKY.night[i], tot = (K.day + K.dusk + K.night) || 1;
      var c1 = mix(d, u, K.dusk / Math.max(0.001, K.day + K.dusk));
      var hex = function (rgb) { var m = rgb.match(/\d+/g); return '#' + m.map(function (v) { return ('0' + (+v).toString(16)).slice(-2); }).join(''); };
      g.addColorStop(at, mix(hex(c1), n, K.night / tot));
    });
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    var starK = Math.min(1, K.night * 1.3 + K.dusk * 0.3);
    for (var i = 0; starK > 0.05 && i < 130; i++) {
      var a = (0.3 + 0.4 * Math.abs(Math.sin(now / 1500 + i * 1.9))) * starK;
      ctx.fillStyle = 'rgba(255,255,250,' + Math.min(1, a).toFixed(2) + ')';
      ctx.fillRect((i * 137 + 29) % w, (i * 53 + (i % 7) * 11) % Math.round(h * 0.5), i % 11 === 0 ? 2 : 1, 1);
    }
    if (K.night > 0.05 || K.dusk > 0.3) {                  // the moon, silver-green, in its phase
      var S = typeof BridgeClock !== 'undefined' && BridgeClock.sky ? BridgeClock.sky('sylvara') : null, ph = S && S.phase != null ? S.phase : 0.5;
      var mx = Math.round(w * 0.7), my = Math.round(h * 0.12), R = 7;
      var mg = ctx.createRadialGradient(mx, my, 0, mx, my, R * 6);
      mg.addColorStop(0, 'rgba(168,224,216,' + (0.3 * Math.max(K.night, 0.4)).toFixed(2) + ')'); mg.addColorStop(1, 'rgba(168,224,216,0)');
      ctx.fillStyle = mg; ctx.fillRect(mx - R * 6, my - R * 6, R * 12, R * 12);
      for (var y = -R; y <= R; y++) for (var x = -R; x <= R; x++) {
        if (x * x + y * y > R * R) continue;
        var lit = Math.cos(ph * Math.PI * 2), edge = Math.sqrt(R * R - y * y), xx = x / Math.max(1, edge);
        var on = ph < 0.5 ? xx > lit : xx < -lit;          // waxing lit from the right, waning from the left
        ctx.fillStyle = on ? (x * x + y * y > (R - 1) * (R - 1) ? '#b8e8e0' : '#e4f6f0') : 'rgba(20,40,48,0.6)';
        ctx.fillRect(mx + x, my + y, 1, 1);
      }
    }
  }
  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerBackground) BridgeWorld.registerBackground('sylvara', skyDraw);

  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('sylvara', { over: over, ground: ground });

  // interactions.js loads after this file: the 'sylvan' type is registered once it's there
  var registered = false;
  function reg() {
    if (registered || typeof BridgeInteractions === 'undefined' || !BridgeInteractions.register) return;
    BridgeInteractions.register('sylvan', use, 'Use');
    registered = true;
  }
  setTimeout(reg, 0);

  return { over: over, decorate: decorate, use: use, topic: topic, groupLit: groupLit, rangeOpen: rangeHours, JOINS: JOINS, SHOPS: SHOPS };
})();
