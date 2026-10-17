/**
 * BridgeImplants — chrome you have put in (Beck: implants "tiered by level: back-alley chrome below (cheap, now and
 * then it glitches), clinic-grade on the District, designer up top").
 *
 * Six slots, one implant in each (installing over one swaps it out, nothing back):
 *   eyes   — a chance that a blow lands as a critical (×1.75)
 *   arm    — your weapons hit harder (×1.15 … ×1.4)
 *   skin   — dermal plate: every blow on you is lighter by a few points (never below 1)
 *   legs   — a quicker step
 *   core   — more health
 *   lungs  — more energy
 * Three tiers:
 *   street   — back-alley chrome (the Undercity's chop shop, Doc Sallow): cheap, and now and then it glitches — the
 *              arm seizes for a swing, the legs lock, the plate drops out, the eyes fill with static, the core spikes
 *              and takes energy. More often in a fight. A clinic can tune a street piece (`tune`) and it stops.
 *   clinic   — the Chrome Clinic on the District (Dr. Nakuri): about twice the street's numbers, never glitches.
 *   trophy   — fitted at the chop shop from what the bosses leave: Saint Ruin's knuckles, the Dredge's heart (`item`).
 *   designer — up top (Workstream D's boutique in the Spires): the best numbers, a finish of your choosing.
 *
 * What each slot gives feeds the game where it already asks: BridgeGear.bonus() and .speed() add `hp`, `energy`
 * and `speed` (so max health, max energy and the step follow), BridgeCombat.damageFor multiplies by `damage()`
 * and rolls `crit()`, and interactions.js takes a blow through `absorb(dmg)`. Saved in localStorage `bridge_implants`.
 *
 * API (for the clinic, the chop shop, and the Spires' boutique):
 *   BridgeImplants.open({ shop: 'street' | 'clinic' | 'designer' | <your registered shop> })   the shop's chooser
 *   BridgeImplants.shop(id, { title, who, tiers: ['designer'], tune: price|0, line })        register a shop
 *   BridgeImplants.register(id, { slot, tier, name, price, perk: { damage, armour, speed, hp, energy, crit },
 *                                 blurb, finish })                                           add an implant
 *   BridgeImplants.install(id, { free }) → Promise<{ ok, reason }>   pays its price (BridgeProgression.wagerCoins)
 *   BridgeImplants.remove(slot) · .installed() → { slot: { id, tuned } } · .has(id) · .tier(slot)
 *   BridgeImplants.bonus() → { hp, energy, speed, damage, armour, crit } — what everything put in adds up to
 *   BridgeImplants.damage() · .crit() · .absorb(dmg) · .speed() — the hooks above
 *   BridgeImplants.CATALOG · .SLOTS · .SHOPS · _glitch(slot) (tests: make one happen now) · _reset()
 */
var BridgeImplants = (function () {
  var KEY = 'bridge_implants';
  var SLOTS = ['eyes', 'arm', 'skin', 'legs', 'core', 'lungs'];
  var SLOT_NAME = { eyes: 'Eyes', arm: 'Arm', skin: 'Skin', legs: 'Legs', core: 'Core', lungs: 'Lungs' };
  var TIER_NAME = { street: 'Street chrome', clinic: 'Clinic grade', designer: 'Designer', trophy: 'Trophy' };
  var TIER_COL = { street: '#c8783a', clinic: '#5cc8d0', designer: '#f0d080', trophy: '#ff7a2a' };

  var CATALOG = {
    // ---- street: the chop shop under the District -----------------------------------------------------------------
    cracked_optics: { slot: 'eyes', tier: 'street', name: 'Cracked Optics', price: 140, perk: { crit: 0.08 },
                      blurb: 'Second-hand eyes with a hairline crack across one lens. You see where things are soft.' },
    scrap_knuckles: { slot: 'arm', tier: 'street', name: 'Scrap Knuckles', price: 120, perk: { damage: 0.15 },
                      blurb: 'A forearm servo out of a cargo loader, sleeved in a gutter pipe. Hits like one, too.' },
    tin_plating:    { slot: 'skin', tier: 'street', name: 'Tin Plating', price: 140, perk: { armour: 2 },
                      blurb: 'Plates riveted under the skin. Takes the edge off a blow. Itches in the rain.' },
    junk_springs:   { slot: 'legs', tier: 'street', name: 'Junk Springs', price: 150, perk: { speed: 0.08 },
                      blurb: 'Coil springs in the calves. A bounce in your step, and a squeak.' },
    gutter_heart:   { slot: 'core', tier: 'street', name: 'Gutter Heart', price: 160, perk: { hp: 15 },
                      blurb: 'A pump that has been in three people before you. It keeps going. That is the main thing.' },
    bellows:        { slot: 'lungs', tier: 'street', name: 'Bellows', price: 130, perk: { energy: 15 },
                      blurb: 'A filter stack in the chest. You breathe the Undercity\'s air and it breathes back cleaner.' },
    // ---- clinic: Dr. Nakuri's, on the District street ---------------------------------------------------------------
    kestrel_eyes:   { slot: 'eyes', tier: 'clinic', name: 'Kestrel Optics', price: 700, perk: { crit: 0.12 },
                      blurb: 'Clinic optics with a tracking overlay. Weak points come up outlined in white.' },
    piston_arm:     { slot: 'arm', tier: 'clinic', name: 'Piston Arm', price: 600, perk: { damage: 0.25 },
                      blurb: 'A matched hydraulic forearm, tuned to your swing. Quiet, warm, very strong.' },
    weave_dermis:   { slot: 'skin', tier: 'clinic', name: 'Weave Dermis', price: 650, perk: { armour: 4 },
                      blurb: 'A mesh under the skin that stiffens where it is struck. You bruise less.' },
    sprint_tendons: { slot: 'legs', tier: 'clinic', name: 'Sprint Tendons', price: 700, perk: { speed: 0.12 },
                      blurb: 'Synthetic tendons, sprung for the street. You get there first.' },
    vital_core:     { slot: 'core', tier: 'clinic', name: 'Vital Core', price: 750, perk: { hp: 30 },
                      blurb: 'A clinic heart with a backup in the same housing. Rated for a hundred years.' },
    ox_lungs:       { slot: 'lungs', tier: 'clinic', name: 'Oxygenator', price: 650, perk: { energy: 30 },
                      blurb: 'Lungs that keep a reserve. You run out of breath a long way after everyone else.' },
    // ---- trophies: fitted from what the Undercity's and the Sump's bosses leave (the item is used up; a fitting fee)
    ruin_fist:      { slot: 'arm', tier: 'trophy', item: 'ruin_knuckles', name: "Ruin's Fist", price: 50, perk: { damage: 0.32 },
                      blurb: 'Saint Ruin\'s chrome knuckles on your own arm. Street chrome that never glitches: he paid for the good stuff.' },
    dredge_core:    { slot: 'core', tier: 'trophy', item: 'dredge_heart', name: 'Dredge Core', price: 80, perk: { hp: 45 },
                      blurb: 'The Dredge\'s sealed gold heart, wired into yours. It hums when you are hurt.' },
    // ---- designer: up top (the Spires' boutique opens these) --------------------------------------------------------
    halo_eyes:      { slot: 'eyes', tier: 'designer', name: 'Halo Irises', price: 2400, perk: { crit: 0.18 }, finish: 'gold-ringed irises',
                      blurb: 'Gold-ringed irises from a Spires atelier. Everything soft in a fight glows for you.' },
    seraph_arm:     { slot: 'arm', tier: 'designer', name: 'Seraph Arm', price: 2200, perk: { damage: 0.4 }, finish: 'white enamel',
                      blurb: 'Enamelled white, inlaid along the knuckles. Hand-fitted. It never misses a beat.' },
    pearl_dermis:   { slot: 'skin', tier: 'designer', name: 'Pearl Dermis', price: 2300, perk: { armour: 6 }, finish: 'a pearl sheen',
                      blurb: 'A lattice that hardens in a millisecond and leaves a faint pearl sheen on the skin.' },
    gazelle_legs:   { slot: 'legs', tier: 'designer', name: 'Gazelle Legs', price: 2400, perk: { speed: 0.18 }, finish: 'carbon and brass',
                      blurb: 'Carbon and brass, made to measure. You barely touch the ground.' },
    aurum_core:     { slot: 'core', tier: 'designer', name: 'Aurum Core', price: 2600, perk: { hp: 50 }, finish: 'gold',
                      blurb: 'A gold-cased heart with three redundancies and a warranty longer than you.' },
    zephyr_lungs:   { slot: 'lungs', tier: 'designer', name: 'Zephyr Lungs', price: 2200, perk: { energy: 50 }, finish: 'glass',
                      blurb: 'Glass bronchi you can see the light through, if you could see inside yourself.' }
  };
  var SHOPS = {
    street:   { title: 'DOC SALLOW\'S CHROME', who: 'DOC SALLOW', tiers: ['street', 'trophy'], tune: 0,
                line: 'A RIPPER IN A STAINED APRON, A JEWELLER\'S LOUPE IN ONE EYE. "CASH, NO NAMES, NO REFUNDS. IT MIGHT HICCUP. EVERYTHING DOWN HERE HICCUPS."' },
    clinic:   { title: 'CHROME CLINIC — IMPLANT SUITE', who: 'DR. NAKURI', tiers: ['clinic'], tune: 60,
                line: 'NAKURI PULLS UP A SCHEMATIC OF YOU, TURNING SLOWLY. "CLINIC GRADE: FITTED, TESTED, GUARANTEED. AND IF YOU\'VE LET SOMEONE DOWNSTAIRS PUT JUNK IN YOU, I CAN TUNE IT."' },
    designer: { title: 'DESIGNER IMPLANTS', who: 'THE ATELIER', tiers: ['designer'], tune: 0,
                line: 'EVERYTHING HERE IS FITTED BY HAND, AND PRICED THAT WAY.' }
  };

  // ---- what's in you ------------------------------------------------------------------------------------------------
  var state = { slots: {} };
  try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.slots) state = s; } catch (e) { /* fresh */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private */ } }
  function changed() {
    save();
    if (typeof BridgeInventory !== 'undefined' && BridgeInventory.refresh) BridgeInventory.refresh();   // max health, energy
  }
  function installed() { var o = {}; SLOTS.forEach(function (k) { if (state.slots[k] && CATALOG[state.slots[k].id]) o[k] = Object.assign({}, state.slots[k]); }); return o; }
  function itemIn(slot) { var s = state.slots[slot]; return s && CATALOG[s.id] ? CATALOG[s.id] : null; }
  function has(id) { return SLOTS.some(function (k) { return state.slots[k] && state.slots[k].id === id; }); }
  function tier(slot) { var c = itemIn(slot); return c ? c.tier : null; }

  // ---- glitches: street chrome now and then lets you down -----------------------------------------------------------
  var off = {};            // slot → performance.now() it's back
  var whiff = false;       // the arm's next swing does nothing
  function now() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }
  function glitchy(slot) { var s = state.slots[slot], c = itemIn(slot); return !!(c && c.tier === 'street' && !(s && s.tuned)); }
  function down(slot) { return (off[slot] || 0) > now(); }

  function bonus() {
    var b = { hp: 0, energy: 0, speed: 0, damage: 0, armour: 0, crit: 0 };
    SLOTS.forEach(function (k) {
      var c = itemIn(k);
      if (!c || down(k)) return;
      Object.keys(c.perk).forEach(function (p) { b[p] = (b[p] || 0) + c.perk[p]; });
    });
    return b;
  }
  function damage() { if (whiff) { whiff = false; flash('ARM SEIZES', '#ff9050'); return 0; } return 1 + bonus().damage; }
  function crit() { var c = bonus().crit; return c > 0 && Math.random() < c; }
  function absorb(dmg) { var a = bonus().armour; return a ? Math.max(1, dmg - a) : dmg; }
  function speed() { var b = bonus().speed; return down('legs') && glitchy('legs') ? -0.45 : b; }

  function flash(text, col) {
    if (typeof BridgeFX !== 'undefined' && BridgeFX.spawnFloatingText && typeof BridgeCharacter !== 'undefined')
      BridgeFX.spawnFloatingText(BridgeCharacter.getX(), BridgeCharacter.getY() - 0.5, text, col || '#ff9050');
    if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('glitch');
  }
  var veil = null;
  function staticVeil(ms) {                 // the eyes: a second or two of snow over everything
    if (typeof document === 'undefined') return;
    if (!veil) {
      veil = document.createElement('canvas');
      veil.width = 160; veil.height = 90;
      veil.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:60;pointer-events:none;image-rendering:pixelated;opacity:0;transition:opacity .15s;mix-blend-mode:screen';
      document.body.appendChild(veil);
    }
    var g = veil.getContext('2d'), until = now() + ms;
    veil.style.opacity = '0.55';
    (function snow() {
      var img = g.createImageData(160, 90);
      for (var i = 0; i < img.data.length; i += 4) {
        var v = Math.random() < 0.5 ? 0 : 120 + Math.random() * 135;
        img.data[i] = v * 0.7; img.data[i + 1] = v; img.data[i + 2] = v * 0.9; img.data[i + 3] = 255;
      }
      for (var y = 0; y < 90; y += 3 + Math.floor(Math.random() * 9)) for (var x = 0; x < 160; x++) { var j = (y * 160 + x) * 4; img.data[j + 3] = 0; }
      g.putImageData(img, 0, 0);
      if (now() < until) requestAnimationFrame(snow); else veil.style.opacity = '0';
    })();
  }
  var GLITCH = {
    arm:   function () { whiff = true; flash('ARM TWITCH', '#ff9050'); },
    legs:  function () { off.legs = now() + 3500; flash('LEGS LOCK', '#ff9050'); },
    skin:  function () { off.skin = now() + 12000; flash('PLATE OFFLINE', '#ff9050'); },
    eyes:  function () { off.eyes = now() + 6000; staticVeil(1400); flash('OPTICS STATIC', '#90ffd0'); },
    core:  function () { if (typeof BridgeInventory !== 'undefined') BridgeInventory.useEnergy(10); flash('CORE SPIKE -10', '#ff9050'); },
    lungs: function () { if (typeof BridgeInventory !== 'undefined') BridgeInventory.useEnergy(8); flash('COUGH -8', '#ff9050'); }
  };
  function glitch(slot) { if (GLITCH[slot]) GLITCH[slot](); }
  function fighting() {
    var w = typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorld ? BridgeWorld.getWorld() : null;
    return !!(w && (w.interactions || []).some(function (h) { return h.type === 'hostile' && h._attackPhase && h._attackPhase !== 'idle'; }));
  }
  // every few seconds each untuned street piece rolls: about once in four minutes walking about, once a minute mid-fight
  var TICK = 5000;
  function tick() {
    if (typeof document !== 'undefined' && document.hidden) return;
    var p = (fighting() ? 1 / 12 : 1 / 48);
    SLOTS.forEach(function (k) { if (glitchy(k) && Math.random() < p) glitch(k); });
  }
  if (typeof setInterval !== 'undefined') setInterval(tick, TICK);

  // ---- buying, swapping, tuning -------------------------------------------------------------------------------------
  function pay(n, why) {
    if (!n) return Promise.resolve({ ok: true });
    if (typeof BridgeProgression === 'undefined' || !BridgeProgression.wagerCoins) return Promise.resolve({ ok: false, reason: 'offline' });
    return BridgeProgression.wagerCoins(n, why).then(function (r) { return r || { ok: false, reason: 'error' }; }, function () { return { ok: false, reason: 'error' }; });
  }
  function install(id, opts) {
    var c = CATALOG[id];
    if (!c) return Promise.resolve({ ok: false, reason: 'unknown' });
    if (has(id)) return Promise.resolve({ ok: false, reason: 'have' });
    var inv = typeof BridgeInventory !== 'undefined' ? BridgeInventory : null;
    if (c.item && !(opts && opts.free) && !(inv && inv.getCount(c.item))) return Promise.resolve({ ok: false, reason: 'item' });
    return pay(opts && opts.free ? 0 : c.price, 'implant:' + id).then(function (r) {
      if (!r.ok) return { ok: false, reason: r.reason || 'coins' };
      if (c.item && !(opts && opts.free) && inv) inv.removeItem(c.item, 1);
      state.slots[c.slot] = { id: id, tuned: false, at: Date.now() };
      delete off[c.slot];
      changed();
      if (typeof BridgeQuests !== 'undefined' && BridgeQuests.note) BridgeQuests.note('Implant', c.name, TIER_NAME[c.tier] + ' — ' + perkLine(c.perk));
      return { ok: true };
    });
  }
  function remove(slot) { if (!state.slots[slot]) return false; delete state.slots[slot]; delete off[slot]; changed(); return true; }
  function tune(slot, price) {
    if (!glitchy(slot)) return Promise.resolve({ ok: false, reason: 'steady' });
    return pay(price, 'implant-tune:' + slot).then(function (r) {
      if (!r.ok) return { ok: false, reason: r.reason || 'coins' };
      state.slots[slot].tuned = true; changed();
      return { ok: true };
    });
  }
  function register(id, def) { CATALOG[id] = def; return CATALOG[id]; }
  function shop(id, def) { SHOPS[id] = def; return SHOPS[id]; }

  function perkLine(p) {
    var out = [];
    if (p.damage) out.push('+' + Math.round(p.damage * 100) + '% damage');
    if (p.crit) out.push(Math.round(p.crit * 100) + '% criticals');
    if (p.armour) out.push('-' + p.armour + ' every blow taken');
    if (p.speed) out.push('+' + Math.round(p.speed * 100) + '% speed');
    if (p.hp) out.push('+' + p.hp + ' health');
    if (p.energy) out.push('+' + p.energy + ' energy');
    return out.join(', ');
  }

  // a small chip for each slot in the chooser: a dark disc, the slot's mark in its tier's colour
  function icon(slot, col) {
    return function (g, S) {
      var u = S / 24;
      g.fillStyle = '#100c18'; g.beginPath(); g.arc(12 * u, 12 * u, 10.5 * u, 0, Math.PI * 2); g.fill();
      g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 2 * u;
      if (slot === 'eyes') { g.beginPath(); g.ellipse(12 * u, 12 * u, 7 * u, 4 * u, 0, 0, Math.PI * 2); g.stroke(); g.fillRect(10 * u, 10 * u, 4 * u, 4 * u); }
      else if (slot === 'arm') { g.fillRect(5 * u, 10 * u, 10 * u, 5 * u); g.fillRect(15 * u, 8 * u, 4 * u, 9 * u); }
      else if (slot === 'skin') { for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) g.fillRect((6 + i * 4.5) * u, (6 + j * 4.5) * u, 3.5 * u, 3.5 * u); }
      else if (slot === 'legs') { g.fillRect(8 * u, 5 * u, 3 * u, 13 * u); g.fillRect(13 * u, 5 * u, 3 * u, 13 * u); g.fillRect(6 * u, 17 * u, 5 * u, 2 * u); g.fillRect(13 * u, 17 * u, 5 * u, 2 * u); }
      else if (slot === 'core') { g.beginPath(); g.moveTo(12 * u, 18 * u); g.lineTo(5 * u, 11 * u); g.arc(8.5 * u, 9 * u, 3.5 * u, Math.PI, 0); g.arc(15.5 * u, 9 * u, 3.5 * u, Math.PI, 0); g.closePath(); g.fill(); }
      else { g.fillRect(11 * u, 4 * u, 2 * u, 6 * u); g.beginPath(); g.ellipse(8 * u, 14 * u, 3.5 * u, 5 * u, 0.3, 0, Math.PI * 2); g.ellipse(16 * u, 14 * u, 3.5 * u, 5 * u, -0.3, 0, Math.PI * 2); g.fill(); }
    };
  }

  function say(who, t) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(who, t); }
  function fail(r) {
    return r.reason === 'have' ? 'YOU ALREADY HAVE THAT ONE IN.' : r.reason === 'item' ? 'YOU NEED THE PART ITSELF FOR THAT ONE.' :
      r.reason === 'offline' || r.reason === 'error' || r.reason === 'no_pilot' || r.reason === 'no_client' ? 'THE PAYMENT WON\'T GO THROUGH RIGHT NOW.' : 'NOT ENOUGH COINS.';
  }
  function open(opts) {
    var S = SHOPS[(opts && opts.shop) || 'street'] || SHOPS.street, tiers = S.tiers || ['street'];
    var rows = [];
    SLOTS.forEach(function (slot) {
      var inNow = itemIn(slot);
      Object.keys(CATALOG).forEach(function (id) {
        var c = CATALOG[id];
        if (c.slot !== slot || tiers.indexOf(c.tier) < 0) return;
        if (c.item && !has(id) && !(typeof BridgeInventory !== 'undefined' && BridgeInventory.getCount(c.item))) return;   // a trophy: only once you carry it
        var mine = has(id);
        rows.push({ label: c.name, sub: SLOT_NAME[slot] + ' · ' + perkLine(c.perk) + (inNow && !mine ? ' (replaces ' + inNow.name + ')' : ''),
          note: mine ? 'Fitted' : c.price + ' coins', disabled: mine, draw: icon(slot, TIER_COL[c.tier]),
          pick: function () { confirm(S, opts, id); } });
      });
      if (S.tune && glitchy(slot)) {
        rows.push({ label: 'Tune: ' + inNow.name, sub: SLOT_NAME[slot] + ' · street chrome, steadied — no more glitches', note: S.tune + ' coins',
          draw: icon(slot, TIER_COL.clinic), pick: function () {
            tune(slot, S.tune).then(function (r) {
              if (!r.ok) return say(S.who, fail(r));
              if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('success');
              say(S.who, 'A PROBE, A CLICK, A SMELL OF HOT SOLDER. YOUR ' + inNow.name.toUpperCase() + ' SETTLES INTO A STEADY HUM.');
            });
          } });
      }
    });
    var have = SLOTS.filter(function (k) { return itemIn(k); }).map(function (k) { var c = itemIn(k); return c.name + (glitchy(k) ? ' (glitchy)' : ''); });
    BridgeInteractions.choose({
      title: S.title,
      text: S.line + (have.length ? '\n\nIN YOU NOW: ' + have.join(', ').toUpperCase() + '.' : ''),
      rows: rows, closeLabel: 'Walk out'
    });
  }
  function confirm(S, opts, id) {
    var c = CATALOG[id];
    BridgeInteractions.choose({
      title: c.name, text: c.blurb.toUpperCase() + '\n\n' + perkLine(c.perk).toUpperCase() + (c.tier === 'street' ? '\n\nSTREET CHROME: IT WILL GLITCH NOW AND THEN.' : '') +
        (itemIn(c.slot) ? '\n\nIT TAKES THE PLACE OF YOUR ' + itemIn(c.slot).name.toUpperCase() + '.' : ''),
      rows: [{ label: 'Put it in', sub: TIER_NAME[c.tier], note: c.price + ' coins', draw: icon(c.slot, TIER_COL[c.tier]), pick: function () {
        install(id).then(function (r) {
          if (!r.ok) return say(S.who, fail(r));
          if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('success');
          say(S.who, c.tier === 'street' ? 'A NEEDLE, A BURN, A LONG MINUTE YOU WON\'T REMEMBER. THEN YOU\'RE UP, AND THE ' + c.name.toUpperCase() + ' IS PART OF YOU. MOSTLY.'
            : 'A HUM, A WARMTH, THE ROOM GOES SOFT FOR A MOMENT. WHEN IT COMES BACK, THE ' + c.name.toUpperCase() + ' FEELS LIKE IT WAS ALWAYS THERE.');
        });
      } }],
      buttons: [{ label: 'Back', act: function () { open(opts); } }],
      closeLabel: 'Not today'
    });
  }

  return { SLOTS: SLOTS, CATALOG: CATALOG, SHOPS: SHOPS, TIERS: TIER_NAME,
           open: open, shop: shop, register: register, install: install, remove: remove, tune: tune,
           installed: installed, has: has, tier: tier, bonus: bonus, damage: damage, crit: crit, absorb: absorb, speed: speed,
           perkLine: perkLine, _glitch: glitch, _reset: function () { state = { slots: {} }; off = {}; whiff = false; changed(); } };
})();
