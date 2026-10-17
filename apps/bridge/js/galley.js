/**
 * BridgeGalley — the galley and mess aboard the Wayfarer (ship-galley, a module: js/wayfarer.js): Dorrie Kettle the
 * cook, meals that do something, and the cards after supper.
 *
 * Meals come by the ship's clock (BridgeWayfarer.clock, four real hours to the ship's day): breakfast at 06:00,
 * dinner at 12:00, supper at 18:00, each served for a couple of ship's hours (MEALS). One of each a ship's day; a meal
 * leaves you fed (`fed`, localStorage `bridge_galley`) for FED_MS of real time — breakfast more energy, dinner more
 * health, supper a little of both — topped up to the new most as you eat. While you're fed BridgeGear.bonus() carries
 * it (so js/inventory.js puts it on the bars) and the chip under the bars says what and how long. Between meals the
 * stockpot's always on: a mug of broth, once a watch, and once a ship's day something wrapped to take with you.
 *
 * Give Dorrie a fish from your pack and it's the next meal's special: whatever that meal does, and a lighter step
 * (+6% speed, BridgeGear.speed) while it lasts. Greens from the greenhouse deck (when it's fitted: js/greenhouse.js
 * hands them over with `greens()`) make every meal last half as long again.
 *
 * Dorrie is at the pass from 05:00 to 21:00; after that the galley's dark but there's bread and cheese under a cloth.
 * The card table (`cards`): js/eights.js plays a hand of Eights with whoever's sat there after supper (js/aboard.js).
 *
 * `galley` interactions by `part`: cook (the pass), menu (the blackboard), cards (the card table).
 */
var BridgeGalley = (function () {
  var KEY = 'bridge_galley';
  var FED_MS = 90 * 60000;              // a meal sees you through an hour and a half of real time
  var MEALS = [
    { id: 'breakfast', name: 'Breakfast', from: 6, to: 8.5, dish: 'Porridge with honey, eggs and toast, strong tea',
      fx: { energy: 25 }, says: 'SIT DOWN BEFORE IT GOES COLD. TEA\'S STEWED, THE WAY BRAM LIKES IT.' },
    { id: 'dinner', name: 'Dinner', from: 12, to: 14, dish: 'Fish stew with dumplings, fresh bread',
      fx: { hp: 25 }, says: 'STEW. THERE\'S ALWAYS STEW AT DINNER; NOBODY HAS EVER COMPLAINED TWICE.' },
    { id: 'supper', name: 'Supper', from: 18, to: 20, dish: 'Roast with gravy, then a steamed pudding',
      fx: { hp: 15, energy: 15 }, says: 'PUDDING AFTER. THE CARDS COME OUT ONCE THE PLATES ARE AWAY.' }
  ];
  var COOK_FROM = 5, COOK_TO = 21;
  var SPECIAL_SPEED = 0.06;

  var state = load();
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; s.ate = s.ate || {}; return s; } catch (e) { return { ate: {} }; }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ } }
  function has(n) { return typeof window[n] !== 'undefined'; }
  function W() { return has('BridgeWayfarer') ? BridgeWayfarer : null; }
  function clock() { return W() ? W().clock() : { h: 12, text: '12:00', watch: 'afternoon watch', day: 0 }; }
  function sfx(n) { if (has('BridgeAudio') && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function toast(a, b, c) { if (has('BridgeQuests') && BridgeQuests.toast) BridgeQuests.toast(a, b, c); }
  function say(t, x) { if (has('BridgeInteractions')) BridgeInteractions.say(t, x); }

  /** The meal being served now, or null. */
  function mealNow(c) { c = c || clock(); return MEALS.filter(function (m) { return c.h >= m.from && c.h < m.to; })[0] || null; }
  /** The next meal and how long till it's served (real ms). */
  function nextMeal() {
    var c = clock(), best = null;
    MEALS.forEach(function (m) { var d = (m.from - c.h + 24) % 24 || 24; if (!best || d < best.d) best = { m: m, d: d }; });
    return { meal: best.m, ms: W() ? W().until(best.m.from) : 0 };
  }
  function cookIn(c) { c = c || clock(); return c.h >= COOK_FROM && c.h < COOK_TO; }
  function ateKey(m, c) { return (c || clock()).day + ':' + m.id; }

  // ---- being fed: on the bars while it lasts -------------------------------------------------------------------------
  /** The meal you're fed by now: { id, name, until, hp, energy, speed } or null. */
  function fed() { var f = state.fed; return f && f.until > Date.now() ? f : null; }
  function eat(m, special) {
    var c = clock(), long = state.greens && state.greens > Date.now() - 6 * 3600000;
    var mul = long ? 1.5 : 1;
    state.ate[ateKey(m, c)] = Date.now();
    // only today's ship-days are kept
    Object.keys(state.ate).forEach(function (k) { if (+k.split(':')[0] < c.day - 1) delete state.ate[k]; });
    state.fed = { id: m.id, name: m.name, dish: m.dish, until: Date.now() + FED_MS * mul, hp: m.fx.hp || 0, energy: m.fx.energy || 0,
                  speed: special ? SPECIAL_SPEED : 0, special: special || null, greens: !!long };
    if (special) state.special = null;
    if (long) state.greens = 0;
    save();
    refreshBars(true);
    sfx('pickup');
    var bits = [];
    if (m.fx.energy) bits.push('+' + m.fx.energy + ' most energy');
    if (m.fx.hp) bits.push('+' + m.fx.hp + ' most health');
    if (special) bits.push('a lighter step');
    toast('The galley', m.name + (special ? ' with ' + special : ''), bits.join(', ') + ' for ' + Math.round(FED_MS * mul / 60000) + ' min');
  }
  // top up to the new most (as a meal does) or just take the bonus off when it's over
  function refreshBars(fill) {
    if (!has('BridgeInventory')) return;
    if (BridgeInventory.refresh) BridgeInventory.refresh();
    if (fill && BridgeInventory.getStats) {
      var s = BridgeInventory.getStats(), f = state.fed;
      if (f && f.energy && BridgeInventory.restoreEnergy) BridgeInventory.restoreEnergy(s.maxEnergy - s.energy);
      if (f && f.hp && BridgeInventory.restoreHP) BridgeInventory.restoreHP(s.maxHP - s.hp);
    }
    paintChip();
  }
  // BridgeGear carries it, so the bars and the speed take it in wherever they're worked out
  if (has('BridgeGear')) {
    var bonus0 = BridgeGear.bonus, speed0 = BridgeGear.speed;
    BridgeGear.bonus = function () {
      var b = bonus0.apply(this, arguments), f = fed();
      return f ? { hp: (b.hp || 0) + f.hp, energy: (b.energy || 0) + f.energy } : b;
    };
    BridgeGear.speed = function () { var f = fed(); return speed0.apply(this, arguments) * (f && f.speed ? 1 + f.speed : 1); };
  }
  var wasFed = !!fed();
  setInterval(function () {
    var now = !!fed();
    if (wasFed && !now) { refreshBars(false); toast('The galley', 'That meal\'s worn off', 'Dorrie serves the next by the ship\'s clock'); }
    wasFed = now;
    paintChip();
  }, 15000);

  // the chip under the bars (desktop: #inv-stats)
  var chip = null;
  function paintChip() {
    var host = document.getElementById('inv-stats'), f = fed();
    if (!host) return;
    if (!chip || chip.parentNode !== host) {
      chip = document.createElement('div');
      chip.id = 'wf-fed';
      host.appendChild(chip);
    }
    if (!f) { chip.style.display = 'none'; return; }
    var m = Math.max(1, Math.round((f.until - Date.now()) / 60000));
    chip.style.display = '';
    chip.textContent = 'FED · ' + f.name.toUpperCase() + (f.special ? ' +' : '') + ' · ' + (m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : m + 'm');
    chip.title = f.dish + (f.special ? ', with ' + f.special : '') + (f.hp ? ' · +' + f.hp + ' most health' : '') + (f.energy ? ' · +' + f.energy + ' most energy' : '') + (f.speed ? ' · a lighter step' : '');
  }

  // ---- Dorrie at the pass -----------------------------------------------------------------------------------------
  function face(cv) { if (has('BridgeLook') && BridgeLook.npcFace) BridgeLook.npcFace(cv, 'npc-dorrie', { blink: true }); }
  function fishInPack() {
    if (!has('BridgeInventory') || !BridgeInventory.getAll || !has('BridgeFishing') || !BridgeFishing.size) return [];
    var all = BridgeInventory.getAll() || {}, out = [];
    Object.keys(all).forEach(function (id) {
      if (!BridgeFishing.size(id)) return;
      var it = has('BridgeItems') && BridgeItems.get(id);
      out.push({ id: id, name: it ? it.name : id, n: all[id] });
    });
    return out;
  }
  function cook(note) {
    var c = clock();
    if (!cookIn(c)) {
      var snack = state.snack !== c.day;
      if (snack) { state.snack = c.day; save(); if (has('BridgeInventory')) BridgeInventory.restoreEnergy(15); }
      say('THE PASS', 'THE GALLEY\'S DARK. DORRIE\'S TURNED IN; SHE\'S BACK AT ' + pad(COOK_FROM) + ':00 SHIP\'S TIME.\n\n' +
        (snack ? 'UNDER A CLOTH ON THE PASS: BREAD AND CHEESE AND A NOTE THAT SAYS "ONE EACH". YOU HAVE YOURS. +15 ENERGY.' : 'YOU\'VE HAD YOUR BREAD AND CHEESE. THE NOTE MEANT IT.'));
      return;
    }
    var m = mealNow(c), ate = m && state.ate[ateKey(m, c)], nx = nextMeal(), rows = [], f = fed();
    var text = (typeof note === 'string' ? note + '\n\n' : '') + (m
      ? (ate ? 'YOU\'VE HAD YOUR ' + m.name.toUpperCase() + '. ' : m.says + '\n\n') + m.name.toUpperCase() + ': ' + m.dish.toUpperCase() + '.'
      : 'NOTHING ON THE PASS JUST NOW. ' + nx.meal.name.toUpperCase() + ' AT ' + pad(nx.meal.from) + ':00, IN ' + W().hm(nx.ms).toUpperCase() + '.') +
      (state.special ? '\n\nYOUR ' + state.special.toUpperCase() + ' IS ON FOR THE NEXT MEAL.' : '');
    if (m && !ate) rows.push({ label: 'Have your ' + m.name.toLowerCase(), sub: m.dish + (state.special ? ', with your ' + state.special : ''),
      note: effectText(m.fx, !!state.special), icon: 'bowl_of_stew', pick: function () { eat(m, state.special || null); } });
    var broth = state.broth !== c.day + ':' + Math.floor(c.h / 4);
    rows.push({ label: 'A mug of broth', sub: broth ? 'from the stockpot: always on' : 'you\'ve had one this watch', note: '+15 energy', icon: 'mug_of_ale', disabled: !broth,
      pick: function () { state.broth = c.day + ':' + Math.floor(c.h / 4); save(); BridgeInventory.restoreEnergy(15); sfx('pickup'); cook('HOT AND SALTY. +15 ENERGY.'); } });
    var packed = state.packed !== c.day;
    rows.push({ label: 'Something to take with you', sub: packed ? 'a bowl of stew, wrapped' : 'once a ship\'s day: you\'ve had it', icon: 'bowl_of_stew', disabled: !packed,
      pick: function () {
        if (!BridgeInventory.addItem('bowl_of_stew', 1)) { cook('YOUR PACK\'S FULL, LOVE. MAKE SOME ROOM.'); return; }
        state.packed = c.day; save(); sfx('pickup'); cook('WRAPPED IN A CLOTH. BRING THE BOWL BACK.');
      } });
    var fish = fishInPack();
    rows.push({ label: 'Give her a fish for the pot', sub: state.special ? 'she has your ' + state.special : fish.length ? fish.map(function (x) { return x.name.toLowerCase(); }).slice(0, 3).join(', ') : 'you\'ve no fish on you',
      note: 'next meal: a lighter step', icon: fish[0] ? fish[0].id : 'silverfin', disabled: !fish.length || !!state.special, pick: function () { giveFish(fish); } });
    BridgeInteractions.choose({ title: 'Dorrie Kettle, the cook', face: face, text: text, rows: rows, closeLabel: 'Thanks, Dorrie' });
  }
  function giveFish(fish) {
    if (fish.length === 1) return takeFish(fish[0]);
    BridgeInteractions.choose({ title: 'For the pot', face: face, text: 'WHAT HAVE YOU GOT? SHE LOOKS EACH ONE OVER LIKE SHE\'S BUYING IT.',
      rows: fish.map(function (x) { return { label: x.name, sub: 'you have ' + x.n, icon: x.id, pick: function () { takeFish(x); } }; }),
      buttons: [{ label: 'Back', act: cook }], closeLabel: 'Leave' });
  }
  function takeFish(x) {
    if (!BridgeInventory.removeItem(x.id, 1)) return cook();
    state.special = x.name.toLowerCase(); save();
    sfx('give');
    cook('"' + x.name.toUpperCase() + '! THAT\'LL DO NICELY." IT GOES IN THE COLD BOX FOR THE NEXT MEAL.');
  }
  function effectText(fx, sp) {
    var b = [];
    if (fx.energy) b.push('+' + fx.energy + ' energy');
    if (fx.hp) b.push('+' + fx.hp + ' health');
    if (sp) b.push('+6% speed');
    return b.join(' · ');
  }
  function pad(h) { return (h < 10 ? '0' : '') + h; }

  function menu() {
    var c = clock(), now = mealNow(c), lines = MEALS.map(function (m) {
      return pad(m.from) + ':00  ' + m.name.toUpperCase() + ' - ' + m.dish.toUpperCase() + (now === m ? '  (NOW)' : state.ate[ateKey(m, c)] ? '  (HAD)' : '');
    });
    say('TODAY\'S MENU', 'SHIP\'S TIME ' + c.text + '.\n\n' + lines.join('\n') + '\n\nBROTH ON THE STOVE ALL DAY. CARDS AFTER SUPPER.' +
      (state.special ? '\n\nCHALKED IN THE CORNER: "SPECIAL - ' + state.special.toUpperCase() + '".' : ''));
  }
  function cards(inter) {
    if (has('BridgeEights') && BridgeEights.sitIn) return BridgeEights.sitIn(inter);
    say('CARD TABLE', 'GREEN BAIZE, WORN PALE WHERE THE ELBOWS GO. THE CARDS COME OUT AFTER SUPPER.');
  }

  function use(inter) {
    if (inter.part === 'cook') cook();
    else if (inter.part === 'menu') menu();
    else if (inter.part === 'cards') cards(inter);
  }
  if (has('BridgeInteractions') && BridgeInteractions.register) BridgeInteractions.register('galley', use, 'Use');
  setTimeout(function () { refreshBars(false); }, 0);

  return { MEALS: MEALS, mealNow: mealNow, nextMeal: nextMeal, fed: fed, cookIn: cookIn, eat: eat,
           greens: function () { state.greens = Date.now(); save(); }, special: function () { return state.special || null; },
           _state: function () { return state; }, _reset: function () { state = { ate: {} }; save(); refreshBars(false); } };
})();
