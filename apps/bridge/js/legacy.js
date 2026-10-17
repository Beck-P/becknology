/**
 * BridgeLegacy — what a fortune is for: the long goals at the top of the ramp (_claude_docs/spec-living-worlds.md §8).
 *
 * Beck: "we want there to be some things that are like worth going after for higher priced stuff later on in the game."
 * The goals (`GOALS`), each with where to go for it, ticked off as you reach them — the ledger lists them (js/ledger.js):
 *   a statue of you in Crownhaven's square (250,000: commission it at Captain Mira's statue — then you stand beside her,
 *   cast in bronze, in whatever you were wearing), the Sovereign (300,000: a legendary ship the Royal Yard builds to
 *   order, js/fleet.js), an enterprise of your own, ten businesses, the Penthouse at the top of Skyport 7 (250,000) and
 *   Ashcombe House on Crownhaven's waterfront (400,000) (js/home.js), the Starling, a hotel on your holm (150,000,
 *   js/holm.js), and the Neon Royale's high-roller room (2,000,000).
 * State in localStorage `bridge_legacy`.
 */
var BridgeLegacy = (function () {
  var KEY = 'bridge_legacy', STATUE = 250000;
  var save = {};
  try { save = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { save = {}; }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode */ } }
  function has(n) { return typeof window[n] !== 'undefined'; }
  function owns(id) { return has('BridgeBusiness') && BridgeBusiness.owned(id); }
  function businesses() { return has('BridgeBusiness') ? BridgeBusiness.all().filter(function (d) { return BridgeBusiness.owned(d.id); }) : []; }

  var GOALS = [
    { id: 'tycoon', name: 'Ten businesses', price: null, world: null, how: 'Stalls, shops, venues: any ten of them',
      progress: function () { return Math.min(10, businesses().length) + ' of 10'; }, done: function () { return businesses().length >= 10; } },
    { id: 'enterprise', name: 'An enterprise of your own', price: 250000, world: 'lumar-crown', how: 'A table at the Neon Royale, a trading house on Crownhaven\'s quay, or a share in the Royal Yard',
      done: function () { return businesses().some(function (d) { return d.kind === 'enterprise'; }); } },
    { id: 'penthouse', name: 'The Penthouse', price: 250000, world: 'arcadia-skypad', how: 'The top of Skyport 7\'s tower: its brass door is on the roof pad',
      done: function () { return has('BridgeHome') && BridgeHome.owns('arcadia-penthouse'); } },
    { id: 'manor', name: 'Ashcombe House', price: 400000, world: 'lumar-crown', how: 'The Ashcombes\' house on Crownhaven\'s waterfront, beside the Crown & Anchor',
      done: function () { return has('BridgeHome') && BridgeHome.owns('lumar-manor'); } },
    { id: 'resort', name: 'A resort on your island', price: 150000, world: 'lumar-holm', how: 'The Starling, a hotel where the old boathouse stands: build it from the holm\'s ledger',
      done: function () { return owns('holm-resort'); } },
    { id: 'statue', name: 'A statue in Crownhaven', price: STATUE, world: 'lumar-crown', how: 'Commission it at Captain Mira\'s statue in the square',
      done: function () { return !!save.statue; } },
    { id: 'sovereign', name: 'The Sovereign', price: 300000, world: 'lumar-crown', how: 'A legendary ship: the Royal Yard builds one to order',
      done: function () { return has('BridgeFleet') && BridgeFleet.all().some(function (s) { return s.type === 'sovereign'; }); } },
    { id: 'high-roller', name: 'The High-Roller Room', price: 2000000, world: 'arcadia-casino-vip', how: 'The Duchess sells the Neon Royale\'s best room, if you can pay',
      done: function () { return owns('high-roller'); } }
  ];
  function list() { return GOALS.map(function (g) { return { id: g.id, name: g.name, price: g.price, world: g.world, how: g.how, done: g.done(), progress: g.progress ? g.progress() : null }; }); }

  // ---- the statue -------------------------------------------------------------------------------------------------
  function say(label, text) { if (has('BridgeInteractions')) BridgeInteractions.say(label, text); }
  function pilotName() { var p = has('BridgeState') && BridgeState.getPilot ? BridgeState.getPilot() : null; return (p && p.name) || 'A CAPTAIN'; }
  /** Asked first by executeInteraction (js/interactions.js): true when it took the interaction. */
  function handle(inter) {
    if (!inter || inter.label !== 'STATUE' || !has('BridgeWorld') || BridgeWorld.getWorldId() !== 'lumar-crown') return false;
    if (save.statue) {
      say('STATUE', 'CAPTAIN MIRA LUMAR, WHO FIRST CHARTED THE FIVE SEAS. AND BESIDE HER NOW, IN BRONZE: ' + save.statue.name +
          ', CAST ' + new Date(save.statue.at).toLocaleDateString().toUpperCase() + '. THE NEW PLAQUE: "THEY CAME FROM THE STARS, AND STAYED."');
      return true;
    }
    if (!has('BridgeInteractions') || !BridgeInteractions.choose) return false;
    BridgeInteractions.choose({ title: 'Captain Mira\'s statue', text: (inter.dialog || '') + '\n\nA CARD AT THE FOOT OF THE PLINTH, IN THE REGISTRAR\'S HAND: "ROOM FOR ONE MORE. THE CROWN WILL CAST IN BRONZE ANY CAPTAIN WHO PAYS FOR THE METAL - ' + STATUE.toLocaleString() + ' COINS."',
      rows: [{ label: 'Commission your statue', sub: STATUE.toLocaleString() + ' coins', pick: commission }], closeLabel: 'Not now' });
    return true;
  }
  function commission() {
    var P = has('BridgeProgression') && BridgeProgression.wagerCoins ? BridgeProgression : null;
    if (!P) return say('STATUE', 'NO WAY TO PAY RIGHT NOW.');
    P.wagerCoins(STATUE, 'legacy:statue').then(function (r) {
      if (!r || !r.ok) return say('STATUE', r && (r.reason === 'insufficient' || r.reason === 'coins' || r.reason === 'no_balance') ? 'THAT\'S ' + STATUE.toLocaleString() + ' COINS. THE CARD WILL WAIT.' : 'THE SALE WON\'T GO THROUGH RIGHT NOW.');
      var look = has('BridgeLook') ? BridgeLook.get() : null, gear = has('BridgeGear') ? { style: BridgeGear.style(), colour: BridgeGear.colour() } : {};
      save.statue = { at: Date.now(), name: pilotName().toUpperCase(), look: look, style: gear.style, colour: gear.colour };
      store(); cast = null;
      if (has('BridgeAudio')) BridgeAudio.sfx('fanfare');
      if (has('BridgeQuests') && BridgeQuests.toast) BridgeQuests.toast('Legacy', 'A statue in Crownhaven', 'You stand beside Captain Mira, in bronze');
      say('STATUE', 'THE FOUNDRY TAKES A WEEK AND A NIGHT. THEN THERE YOU ARE, BESIDE CAPTAIN MIRA, GREEN-GOLD IN THE SALT AIR. CHILDREN ARE ALREADY CLIMBING YOU.');
    });
  }
  // you in bronze, as you stood when you paid for it: your sprite, tinted and a little larger than life, on Mira's plinth
  var cast = null;
  function bronze() {
    if (cast) return cast.ready ? cast : null;
    if (!save.statue || !has('BridgeLook')) return null;
    var sh = BridgeLook.sheet('', save.statue.style || 'flight', save.statue.colour || null, save.statue.look || BridgeLook.get());
    if (!sh || !sh.ready) return null;
    var c = document.createElement('canvas'); c.width = 32; c.height = 48;
    var g = c.getContext('2d');
    g.drawImage(sh.img, 0, 0, 32, 48, 0, 0, 32, 48);                     // standing, facing you
    var px = g.getImageData(0, 0, 32, 48), d = px.data;
    for (var i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      var l = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255, v = 0.3 + l * 0.95;
      // bronze gone green in the salt air, like Mira's: verdigris in the folds, a worn gold where hands touch it
      d[i] = Math.min(255, 64 * v + 10); d[i + 1] = Math.min(255, 132 * v + 16); d[i + 2] = Math.min(255, 118 * v + 16);
      if (l > 0.72) { d[i] = Math.min(255, d[i] + 70); d[i + 1] = Math.min(255, d[i + 1] + 30); }
    }
    g.putImageData(px, 0, 0);
    cast = { img: c, ready: true };
    return cast;
  }
  function items(world, offX, offY, ts) {
    if (!save.statue || !has('BridgeWorld') || BridgeWorld.getWorldId() !== 'lumar-crown') return [];
    var b = bronze();
    if (!b) return [];
    var cx = Math.round(offX + 33.2 * ts), foot = Math.round(offY + 23.75 * ts);
    return [{ footRow: 23.75, draw: function (c) {                     // a plinth of its own, then you on it
      c.imageSmoothingEnabled = false;
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(cx - 14, foot - 2, 30, 4);
      c.fillStyle = '#55524e'; c.fillRect(cx - 13, foot - 14, 26, 14);
      c.fillStyle = '#6c6863'; c.fillRect(cx - 13, foot - 14, 26, 3);
      c.fillStyle = '#a88440'; c.fillRect(cx - 5, foot - 9, 10, 4);            // the plaque
      c.drawImage(b.img, cx - 16, foot - 14 - 44);
    } }];
  }
  if (has('BridgeWorld') && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('*', { items: items });

  return { list: list, handle: handle, GOALS: GOALS, _state: function () { return save; } };
})();
