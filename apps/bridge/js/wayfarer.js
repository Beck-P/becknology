/**
 * BridgeWayfarer — the ship grows longer: rooms fitted aft of the bridge, and the ship's clock.
 *
 * Beck: "the Wayfarer is generally a good idea" — the ship grows with your crew: a galley and a cook, the mess, more
 * rooms that fit, and the ship visibly longer wherever she's drawn. The bridge's south-east door opens on the passage
 * (ship-passage, scenes/ship_passage.py), three module bays down its wall. A bay you haven't fitted is an iron blank
 * with a builder's tag; fit it (the Ship's Chandler, or the bay itself) and it's a door with its nameboard lit, onto a
 * new room aboard:
 *
 *   galley        the galley and mess (ship-galley): Dorrie the cook, meals that do something, cards after supper
 *                 (js/galley.js)
 *   observatory   the observatory (ship-observatory)
 *   greenhouse    the greenhouse deck (ship-greenhouse)
 *
 * Each needs so many crew aboard before the yard will fit it (`crew`): a galley is for feeding people. What's fitted
 * lives in localStorage `bridge_wayfarer` ({ mods: { <id>: fitted at } }); aboard someone else's Wayfarer (js/party.js)
 * it's theirs (`mods()` asks BridgeParty.hostShip()). `key(mods)` names her sprite as fitted ('mothership',
 * 'mothership-galley', 'mothership-galley-greenhouse' …: tools/bridge-art/cine_sprites.py), for the jump, the windows
 * and the title page.
 *
 * The ship's clock (`clock()`): the ship keeps no sun, but she keeps watches. Her day is four real hours, from Eastern
 * midnight (so midnight, 4am, 8am … ET each start one), on a 24-hour face of six four-hour watches — the middle,
 * morning, forenoon, afternoon, dog and first watches. The crew keep their day by it (js/aboard.js), the cook her
 * meals (js/galley.js).
 *
 * The passage's other things are `wayfarer` interactions by `part`: the watch bill (who's where, by the ship's clock),
 * the scuttlebutt (a drink of water, and whatever the crew are saying), the hatch down to the crew's berths.
 */
var BridgeWayfarer = (function () {
  var KEY = 'bridge_wayfarer';
  var MODULES = {
    galley: { name: 'The Galley & Mess', short: 'galley', price: 1800, crew: 1, world: 'ship-galley',
              blurb: 'A range and a cook, two mess tables and a card table in the corner. Meals that set you up for the day.' },
    observatory: { name: 'The Observatory', short: 'observatory', price: 3200, crew: 2, world: 'ship-observatory',
                   blurb: 'A brass telescope under a glass dome, star charts, an orrery. The sky read properly.' },
    greenhouse: { name: 'The Greenhouse Deck', short: 'greenhouse', price: 2600, crew: 2, world: 'ship-greenhouse',
                  blurb: 'Raised beds under grow-lamps: herbs, salad, lemons. Fresh greens for the galley.' }
  };
  var ORDER = ['galley', 'observatory', 'greenhouse'];
  var BUILT = { galley: 1, observatory: 1, greenhouse: 1 };          // the rooms the yard has plans for
  var HOUR = 3600000, SHIP_DAY = 4 * HOUR;
  var WATCHES = ['middle watch', 'morning watch', 'forenoon watch', 'afternoon watch', 'dog watch', 'first watch'];

  var state = load();
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; s.mods = s.mods || {}; return s; } catch (e) { return { mods: {} }; }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ } }
  function has(n) { return typeof window[n] !== 'undefined'; }
  function sfx(n) { if (has('BridgeAudio') && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function toast(a, b, c) { if (has('BridgeQuests') && BridgeQuests.toast) BridgeQuests.toast(a, b, c); }

  // ---- what's fitted ----------------------------------------------------------------------------------------------
  /** The modules fitted to the ship you're aboard ({ id: at }): yours, or your host's aboard theirs (js/party.js). */
  function mods() {
    var host = has('BridgeParty') && BridgeParty.hostShip ? BridgeParty.hostShip() : null;
    if (host) return (host.wayfarer && host.wayfarer.mods) || {};
    return state.mods;
  }
  function fitted(id, m) { return !!(m || mods())[id]; }
  /** Fitted module ids, in the ship's order (stern to bow). */
  function list(m) { m = m || mods(); return ORDER.filter(function (id) { return m[id]; }); }
  /** Her sprite's name as fitted (cine.json): 'mothership' with each fitted module's id after it, in order. */
  function key(m) { var l = list(m || state.mods); return l.length ? 'mothership-' + l.join('-') : 'mothership'; }
  function crewCount() { return has('BridgeCrew') && BridgeCrew.list ? BridgeCrew.list().length : 0; }

  /** Pays for a module and fits it. Resolves { ok, reason }. */
  function fit(id) {
    var M = MODULES[id];
    if (!M) return Promise.resolve({ ok: false, reason: 'unknown' });
    if (state.mods[id]) return Promise.resolve({ ok: true });
    if (!BUILT[id]) return Promise.resolve({ ok: false, reason: 'plans' });
    if (crewCount() < M.crew) return Promise.resolve({ ok: false, reason: 'crew' });
    if (!has('BridgeProgression') || !BridgeProgression.wagerCoins) return Promise.resolve({ ok: false, reason: 'offline' });
    return BridgeProgression.wagerCoins(M.price, 'wayfarer:' + id).then(function (res) {
      if (!res || !res.ok) return { ok: false, reason: (res && res.reason) || 'error' };
      state.mods[id] = Date.now();
      save();
      sfx('coin');
      toast('The Wayfarer', M.name + ' fitted', 'She\'s longer by a room. Through the passage aft of the bridge.');
      if (has('BridgeQuests') && BridgeQuests.note) BridgeQuests.note('The Wayfarer', M.name + ' fitted', 'A new room aboard, off the passage');
      if (has('BridgeWorld') && BridgeWorld.getWorldId && BridgeWorld.getWorldId() === 'ship-passage') applyBays();
      return { ok: true };
    }).catch(function () { return { ok: false, reason: 'error' }; });
  }

  // a picture of her as she'd be fitted (the chooser's art: her sprite, from js/cinematic.js, on a field of stars)
  function shipArt(m) {
    return function (cv) {
      var S = has('BridgeCine') && BridgeCine.get ? (BridgeCine.get(key(m)) || BridgeCine.get('mothership')) : null;
      if (!S) throw new Error('no sprite');
      var W = 300, Hh = 110, sc = Math.min(1, (W - 16) / S.w, (Hh - 10) / S.h);
      cv.width = W; cv.height = Hh;
      var g = cv.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.fillStyle = '#05060f'; g.fillRect(0, 0, W, Hh);
      for (var i = 0; i < 60; i++) { var h = (i * 2654435761) >>> 0; g.fillStyle = i % 7 ? 'rgba(200,210,255,0.5)' : '#fff'; g.fillRect(h % W, (h >>> 9) % Hh, 1, 1); }
      var w = Math.round(S.w * sc), hh = Math.round(S.h * sc);
      if (sc < 1) {      // shrink once with a hard edge, as the far galleon is drawn (js/cinematic.js farShip)
        var t = document.createElement('canvas'); t.width = w; t.height = hh;
        var tg = t.getContext('2d'); tg.imageSmoothingEnabled = true; tg.drawImage(S.img, 0, 0, w, hh);
        var d = tg.getImageData(0, 0, w, hh), px = d.data;
        for (var j = 3; j < px.length; j += 4) px[j] = px[j] < 110 ? 0 : 255;
        tg.putImageData(d, 0, 0);
        g.drawImage(t, Math.round((W - w) / 2), Math.round((Hh - hh) / 2));
      } else g.drawImage(S.img, Math.round((W - w) / 2), Math.round((Hh - hh) / 2));
    };
  }

  /** The yard's list: every module, fitted or not, what it costs and what it needs. */
  function shop(note, back) {
    if (!has('BridgeInteractions')) return;
    var n = crewCount();
    BridgeInteractions.choose({
      title: 'Ship\'s modules',
      text: (typeof note === 'string' ? note + '\n\n' : '') + 'THE YARD FITS A ROOM AFT OF THE BRIDGE, OFF THE PASSAGE. SHE GROWS A LITTLE LONGER EACH TIME. THE YARD WON\'T FIT A ROOM THERE\'S NOBODY ABOARD TO USE.',
      art: shipArt(state.mods),
      rows: ORDER.map(function (id) {
        var M = MODULES[id], done = !!state.mods[id], short = n < M.crew, plans = !!BUILT[id];
        return { label: M.name, sub: done ? 'fitted' : !plans ? 'the yard\'s still drawing up the plans' : short ? 'needs ' + M.crew + ' crew aboard (you have ' + n + ')' : M.blurb,
                 note: done || !plans ? '' : M.price.toLocaleString() + ' coins', disabled: done || short || !plans,
                 draw: function (g, s) { drawIcon(g, s, id); },
                 pick: function () { confirmFit(id, back); } };
      }),
      buttons: back ? [{ label: 'Back', act: back }] : [], closeLabel: 'Leave' });
  }
  function confirmFit(id, back) {
    var M = MODULES[id], m = Object.assign({}, state.mods);
    m[id] = 1;
    BridgeInteractions.choose({ title: M.name, text: M.blurb.toUpperCase() + '\n\nFIT IT FOR ' + M.price.toLocaleString() + ' COINS? THIS IS HOW SHE\'LL LOOK.',
      art: shipArt(m),
      buttons: [{ label: 'Fit it', act: function () {
        fit(id).then(function (r) {
          if (r.ok) shop(M.name.toUpperCase() + ' IS FITTED. YOU\'LL FIND IT THROUGH THE PASSAGE AFT OF THE BRIDGE.', back);
          else shop(r.reason === 'insufficient' ? 'THAT\'S ' + M.price.toLocaleString() + ' COINS - MORE THAN YOU HAVE.' : r.reason === 'crew' ? 'YOU NEED MORE CREW ABOARD FIRST.' : 'THE YARD CAN\'T TAKE YOUR COIN RIGHT NOW.', back);
        });
      } }, { label: 'Back', act: function () { shop(null, back); } }], closeLabel: 'Leave' });
  }
  // a little picture of each module for the rows: a pot on a flame, a telescope, a sprouting pot
  function drawIcon(g, s, id) {
    var u = s / 24, P = function (c, r) { g.fillStyle = c; r.forEach(function (q) { g.fillRect(q[0] * u, q[1] * u, q[2] * u, q[3] * u); }); };
    if (id === 'galley') { P('#5a5e66', [[5, 8, 14, 9]]); P('#8a8e96', [[4, 7, 16, 2]]); P('#2a2a30', [[3, 9, 2, 2], [19, 9, 2, 2]]); P('#ff8a30', [[8, 18, 8, 3]]); P('#ffd060', [[10, 19, 4, 2]]); P('#d8d8e0', [[9, 3, 1, 3], [13, 2, 1, 4]]); }
    else if (id === 'observatory') { P('#c8a040', [[6, 9, 13, 4]]); P('#8a6a28', [[16, 8, 5, 6]]); P('#3a2a14', [[10, 13, 2, 8], [7, 20, 8, 2]]); P('#a0c0ff', [[4, 10, 2, 2]]); P('#ffffff', [[3, 3, 1, 1], [19, 4, 1, 1], [12, 2, 1, 1]]); }
    else { P('#8a4a2a', [[7, 15, 10, 7]]); P('#a85a32', [[6, 14, 12, 2]]); P('#3a8a3a', [[11, 6, 2, 9]]); P('#6ac050', [[6, 6, 5, 3], [13, 4, 5, 3], [8, 10, 4, 2]]); }
  }

  // ---- the ship's clock -------------------------------------------------------------------------------------------
  /** { h (0–24, ship hours), text ('06:40'), watch, day (ship days since 1970, ET), ms (real ms into the ship's day), len } */
  function clock(at) {
    var now = at != null ? at : (has('BridgeClock') && BridgeClock.now ? BridgeClock.now() : Date.now());
    var et = has('BridgeClock') && BridgeClock.etAt ? BridgeClock.etAt(now) : now;
    var ms = ((et % SHIP_DAY) + SHIP_DAY) % SHIP_DAY, h = ms / SHIP_DAY * 24;
    var hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    return { h: h, text: (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm, watch: WATCHES[Math.floor(h / 4)],
             day: Math.floor(et / SHIP_DAY), ms: ms, len: SHIP_DAY };
  }
  /** Real ms until the ship's clock next reads `h`. */
  function until(h) { var c = clock(); var d = (h - c.h + 24) % 24; return d / 24 * SHIP_DAY; }
  function hm(ms) { var m = Math.max(1, Math.round(ms / 60000)); return m < 60 ? m + ' min' : Math.floor(m / 60) + 'h ' + (m % 60 ? (m % 60) + 'm' : ''); }

  // ---- the passage -------------------------------------------------------------------------------------------------
  function applyBays() {
    var L = {};
    ORDER.forEach(function (id) { L['bay_' + id] = fitted(id) ? 'fitted' : 'sealed'; });
    if (has('BridgeScene') && BridgeScene.setLayers) BridgeScene.setLayers('ship-passage', L);
    return L;
  }
  function decorate(worldId, data) {
    if (!data || worldId !== 'ship-passage') return;
    if (data.scene) data.scene.layers = Object.assign({}, data.scene.layers || {}, applyLayersFor());
    (data.interactions || []).forEach(function (it) {
      if (!it.module) return;
      if (fitted(it.module)) { it.type = 'enter_world'; it.prompt = 'PRESS E TO ENTER'; }
      else { it.type = 'bay'; it.prompt = 'PRESS E TO LOOK'; }
    });
  }
  function applyLayersFor() { var L = {}; ORDER.forEach(function (id) { L['bay_' + id] = fitted(id) ? 'fitted' : 'sealed'; }); return L; }

  function bay(inter) {
    var M = MODULES[inter.module], n = ORDER.indexOf(inter.module) + 1;
    if (!M) return;
    if (has('BridgeParty') && BridgeParty.hostShip && BridgeParty.hostShip()) {
      BridgeInteractions.say('BAY ' + n, 'AN IRON BLANK, RIVETED SHUT. THE BUILDER\'S TAG SAYS "' + M.short.toUpperCase() + ' - WHEN SHE\'S READY". IT\'S NOT YOUR SHIP TO FIT.');
      return;
    }
    BridgeInteractions.choose({ title: 'Bay ' + n, text: 'AN IRON BLANK, RIVETED SHUT, A COIL OF CABLE WAITING. THE BUILDER\'S TAG ON ITS WIRE SAYS: "' +
        M.short.toUpperCase() + ' - WHEN SHE\'S READY."\n\n' + M.blurb.toUpperCase(),
      art: shipArt(Object.assign({}, state.mods, (function () { var o = {}; o[inter.module] = 1; return o; })())),
      buttons: [{ label: BUILT[inter.module] ? 'Fit the ' + M.short + ' (' + M.price.toLocaleString() + ')' : 'The yard\'s still drawing the plans', disabled: crewCount() < M.crew || !BUILT[inter.module], act: function () { confirmFit(inter.module); } },
                { label: 'All the modules', act: function () { shop(); } }],
      closeLabel: 'Leave' });
  }

  // who's where, by the ship's clock (js/aboard.js knows; without it, at their posts)
  function watchBill() {
    var c = clock(), rows = [];
    var crew = has('BridgeAboard') && BridgeAboard.roster ? BridgeAboard.roster() : (has('BridgeCrew') ? BridgeCrew.list().map(function (p) { return { id: p.id, name: p.name, role: p.role, doing: 'at their post', where: 'the bridge' }; }) : []);
    crew.forEach(function (p) {
      var who = !p.face && has('BridgePeople') && BridgePeople.all()[p.id];
      rows.push({ label: p.name, sub: p.role + ' · ' + p.doing, note: p.where, info: true, sheet: p.face || (who && who.sheet) });   // their portrait
    });
    BridgeInteractions.choose({ title: 'The watch bill', text: 'SHIP\'S TIME ' + c.text + ', THE ' + c.watch.toUpperCase() + '. ' +
        (rows.length ? 'WHO\'S WHERE, CHALKED UP AND RUBBED OUT ALL DAY:' : 'THE BOARD IS BARE: NOBODY ABOARD BUT YOU. HIRE CREW AND THEY\'LL KEEP THEIR WATCHES HERE.'),
      rows: rows, closeLabel: 'Done' });
  }
  var LAST_DRINK = 'bridge_wayfarer_butt';
  function butt() {
    var c = clock(), said = has('BridgeAboard') && BridgeAboard.gossip ? BridgeAboard.gossip() : null, last = 0;
    try { last = +localStorage.getItem(LAST_DRINK) || 0; } catch (e) { /* private mode */ }
    var fresh = Date.now() - last > SHIP_DAY / 6;              // once a watch
    if (fresh && has('BridgeInventory') && BridgeInventory.restoreEnergy) {
      BridgeInventory.restoreEnergy(10);
      try { localStorage.setItem(LAST_DRINK, String(Date.now())); } catch (e) { /* private mode */ }
    }
    BridgeInteractions.say('SCUTTLEBUTT', (fresh ? 'A DIPPER OF COLD WATER FROM THE CASK. +10 ENERGY.' : 'YOU\'VE HAD YOUR DIPPER THIS WATCH.') +
      '\n\n' + (said || 'NOBODY\'S BY THE CASK JUST NOW. IT\'S WHERE THE SHIP\'S NEWS GETS PASSED ROUND, WHEN THERE\'S ANYONE TO PASS IT.'));
  }
  function hatch() {
    var c = clock(), below = has('BridgeAboard') && BridgeAboard.below ? BridgeAboard.below() : [];
    var night = c.h < 6 || c.h >= 23;
    BridgeInteractions.say('THE CREW\'S BERTHS', 'A LADDER DOWN INTO LAMPLIGHT: HAMMOCKS SLUNG BETWEEN THE FRAMES, SEA BAGS, SOMEBODY\'S WASHING ON A LINE.\n\n' +
      (below.length ? (night ? 'SNORING. ' : '') + below.join(', ').toUpperCase() + (below.length === 1 ? ' IS' : ' ARE') + ' DOWN THERE' + (night ? ', ASLEEP.' : '.')
                    : 'NOBODY BELOW JUST NOW.') + ' IT\'S THEIR PLACE; YOU LEAVE THEM TO IT.');
  }

  function use(inter) {
    if (inter.part === 'watch') watchBill();
    else if (inter.part === 'butt') butt();
    else if (inter.part === 'hatch') hatch();
  }
  if (has('BridgeInteractions') && BridgeInteractions.register) {
    BridgeInteractions.register('bay', bay, 'Look');
    BridgeInteractions.register('wayfarer', use, 'Use');
  }
  if (has('BridgeState')) {
    BridgeState.onChange(function (s, prev, ctx) {
      if (s === 'world' && ctx && ctx.worldId === 'ship-passage') applyBays();
    });
  }

  return { MODULES: MODULES, ORDER: ORDER, mods: mods, fitted: fitted, list: list, key: key, fit: fit, shop: shop,
           clock: clock, until: until, hm: hm, decorate: decorate, shipArt: shipArt,
           _reset: function () { state = { mods: {} }; save(); }, _set: function (m) { state.mods = m || {}; save(); } };
})();
