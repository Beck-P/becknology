/**
 * BridgeHolm — Starling Holm, the little island of your own (world "lumar-holm", scenes/lumar_holm.py).
 *
 * Tucked away off the Emerald Sea, a sail from Crownhaven and Diggen's Point. FOR SALE on a post at the head of the old
 * jetty: buy the deed and it's yours, ruins and all — then build it up, one thing at a time (BUILD: each is a scene
 * variant, switched on with BridgeScene layers as the island loads):
 *   - THE COTTAGE rebuilt: a roof, a fire, a bed (rest here), your ledger on the table;
 *   - THE DOCK rebuilt: new planking, lamps, a crane — and with it the holm becomes a home port: ships based here can be
 *     sent out trading with their crews (ROUTES), and repairs are done on your own slip;
 *   - THE GARDEN cleared and dug: a field of your own (js/farm.js farms any world with a `farm.plot`);
 *   - A WAREHOUSE: cargo kept ashore between ships (move it to and from a hold);
 *   - QUARTERS: a bunkhouse where your hands live between voyages (crew `ship: 'holm'`), up to eight;
 *   - THE WORKSHOP (once the dock's rebuilt): a forge, a saw-pit and benches — materials made into planks and bars,
 *     guns, fittings, tools, things for your homes, by your own hand or by smiths you hire (js/workshop.js). What it
 *     makes goes into the store (`store`, the warehouse's too: `stored`, `storeAdd`, `storeTake`).
 * Ships sent trading are away a while (`away`) and come back with the profit in the strongbox, or with a story: the
 * Crimson and Midnight seas are dangerous, and a ship with guns and fighters comes off better. Name the island what you
 * like. Kept in localStorage bridge_holm.
 */
var BridgeHolm = (function () {
  var KEY = 'bridge_holm', WID = 'lumar-holm';
  var DEED = 25000;
  var BUILD = {
    house:     { name: 'The cottage', price: 6000, what: 'ROOFED, GLAZED AND A FIRE IN THE GRATE. A BED, A TABLE, YOUR LEDGER.' },
    dock:      { name: 'The dock', price: 8000, what: 'NEW PLANKING ON THE JETTY, THE QUAY RE-SET, LAMPS AND A CRANE. YOUR SHIPS CAN BE BASED HERE AND SENT OUT TRADING.' },
    garden:    { name: 'The garden', price: 1000, what: 'THE BRAMBLES GRUBBED OUT, THE GROUND DUG OVER. A FIELD OF YOUR OWN WITHIN THE OLD WALL.' },
    warehouse: { name: 'A warehouse', price: 6000, what: 'TIMBER, ON STONE FOOTINGS. CARGO KEPT ASHORE BETWEEN SHIPS - AS MUCH AS YOU LIKE.' },
    quarters:  { name: 'Quarters for your hands', price: 4000, what: 'A BUNKHOUSE. YOUR HANDS CAN LIVE ASHORE BETWEEN VOYAGES, EIGHT OF THEM.' },
    // the Workshop (js/workshop.js): timber and iron come by sea, so the dock first
    workshop:  { name: 'The workshop', price: 9000, needs: 'dock', because: 'TIMBER AND IRON COME BY SEA',
                 what: 'A WORKSHOP ON THE LEVEL GROUND BY THE WELL: A FORGE AND ITS CHIMNEY, A SAW-PIT, BENCHES AND RACKS. MAKE THINGS WITH YOUR OWN HANDS - PLANKS AND BARS, GUNS AND FITTINGS, TOOLS - OR HIRE SMITHS TO MAKE THEM WHILE YOU\'RE AWAY.' },
    // the holm as a resort (js/legacy.js): the old boathouse rebuilt as a hotel, run as a venue (js/business.js `holm-resort`)
    resort:    { name: 'The Starling, a seaside hotel', price: 150000, needs: 'dock', because: 'THE GUESTS COME BY SEA',
                 what: 'THE OLD BOATHOUSE DOWN, A HOTEL UP IN ITS PLACE: TWELVE ROOMS ON THE WATER, PARASOLS ON THE LAWN, GUESTS OFF EVERY PACKET FROM THE CAPITAL. IT RUNS LIKE ANY VENUE: PUT A MANAGER IN AND IT EARNS, NIGHT AND DAY.' }
  };
  var QUARTERS = 8;
  // the Workshop's lot, by the well (scenes/lumar_holm.py LOTS; the world JSON's `holm.lots` once it's rendered), and
  // till then its stand-in: the quarters' bunkhouse moved sixteen tiles west onto it (BridgeScene.standIn), smoking
  // from its own chimney — a forge, as far as anyone can tell
  var WORKSHOP_LOT = [10, 6, 15, 9], WORKSHOP_AT = [13, 9], STAND_IN_SMOKE = [15.28, 5.294];
  if (typeof BridgeScene !== 'undefined' && BridgeScene.standIn) BridgeScene.standIn(WID, 'workshop', 'built', ['quarters', 'built'], -16, 0);

  var st = { owned: false, name: 'Starling Holm', built: {}, store: {}, chest: 0, log: [] };
  try { st = Object.assign(st, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* fresh */ }
  st.built = st.built || {}; st.store = st.store || {}; st.log = st.log || [];
  function store() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode */ } }

  function F() { return typeof BridgeFleet !== 'undefined' ? BridgeFleet : null; }
  function T() { return typeof BridgeTrade !== 'undefined' ? BridgeTrade : null; }
  function choose(spec) { if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.choose) BridgeInteractions.choose(spec); }
  function toast(a, b, c) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(a, b, c); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function pay(n, why) {
    return typeof BridgeProgression !== 'undefined' && BridgeProgression.wagerCoins ? BridgeProgression.wagerCoins(n, why) : Promise.resolve({ ok: false, reason: 'offline' });
  }
  function why(r) { var x = r && r.reason; return x === 'offline' || x === 'no_client' || x === 'no_pilot' || x === 'error' ? 'NO WAY TO MOVE COINS RIGHT NOW.' : 'NOT ENOUGH COINS.'; }
  function owned() { return !!st.owned; }
  function built(k) { return !!st.built[k]; }
  function canFarm() { return owned() && built('garden'); }
  function isles() { return typeof BridgeVoyage !== 'undefined' && BridgeVoyage._isles; }
  function nameIsle() { var I = isles(); if (I && I[WID]) I[WID].name = st.name; }
  nameIsle();

  // ---- as the island loads: what's built, what smokes, which lots are walls now -------------------------------------
  function decorate(worldId, data) {
    if (worldId !== WID || !data) return;
    returns();
    data.name = st.name;
    data.holm = data.holm || {};
    data.holm.lots = data.holm.lots || {};
    if (!data.holm.lots.workshop) { data.holm.lots.workshop = WORKSHOP_LOT.slice(); data.holm.standIn = true; }
    var rendered = !data.holm.standIn;                       // the island's render lays the workshop out (else the stand-in)
    if (data.scene) {
      data.scene.layers = { house: built('house') ? 'cottage' : 'ruin', garden: built('garden') ? 'tilled' : 'wild',
                            dock: built('dock') ? 'built' : null, warehouse: built('warehouse') ? 'built' : null, quarters: built('quarters') ? 'built' : null,
                            workshop: built('workshop') ? 'built' : null, resort: built('resort') ? 'built' : 'old' };
      var sm = Object.assign({}, data.holm.smoke || {});
      if (!sm.workshop && !rendered) sm.workshop = STAND_IN_SMOKE;
      data.scene.smoke = ['house', 'quarters', 'workshop'].filter(function (k) { return built(k) && sm[k]; }).map(function (k) { return sm[k]; });
    }
    if (!(data.interactions || []).some(function (it) { return it.type === 'holm' && it.act === 'workshop'; }))
      (data.interactions = data.interactions || []).push({ x: WORKSHOP_AT[0], y: WORKSHOP_AT[1], type: 'holm', act: 'workshop', label: 'WORKSHOP', prompt: 'PRESS E TO LOOK' });
    var lots = data.holm.lots;
    Object.keys(lots).forEach(function (k) {
      if (!built(k)) return;
      var L = lots[k];
      for (var y = L[1]; y <= L[3]; y++) for (var x = L[0]; x <= L[2]; x++) if (data.collisions[y]) data.collisions[y][x] = 1;
    });
    // the resort built: the boathouse is the Starling now, its door the business's (js/business.js)
    if (built('resort')) {
      data.interactions = (data.interactions || []).filter(function (it) { return it.label !== 'BOATHOUSE'; });
      if (!data.interactions.some(function (it) { return it.label === 'THE STARLING'; }))
        data.interactions.push({ x: 35, y: 20, type: 'dialog', label: 'THE STARLING', prompt: 'PRESS E TO GO IN',
                                 dialog: 'THE STARLING: TWELVE ROOMS ON THE WATER. THE BELL ON THE DESK SAYS "RING FOR THE MANAGER".' });
    }
    (data.interactions || []).forEach(function (it) {
      if (it.type !== 'holm') return;
      if (it.act === 'deed') { it.label = owned() ? st.name.toUpperCase() : 'FOR SALE'; it.prompt = owned() ? 'PRESS E FOR THE LEDGER' : 'PRESS E TO READ'; }
      if (it.act === 'house') it.prompt = built('house') ? 'PRESS E TO GO IN' : 'PRESS E TO LOOK';
      if (it.act === 'workshop') it.prompt = built('workshop') ? 'PRESS E FOR THE WORKSHOP' : 'PRESS E TO LOOK';
    });
  }

  // ---- E on the island's things -------------------------------------------------------------------------------------
  function use(it) {
    var a = it.act;
    if (a === 'deed') return owned() ? ledger() : forSale();
    if (!owned()) {
      return say({ house: 'THE COTTAGE IS A SHELL: NO ROOF, IVY THROUGH THE WINDOWS, A BIRD\'S NEST IN THE GRATE. IT MUST HAVE BEEN LOVELY ONCE.',
                   garden: 'AN OLD WALLED GARDEN, LOST UNDER BRAMBLES. THE BLACKBERRIES ARE GOOD.',
                   warehouse: 'FOUR STAKES IN THE GRASS, AND A ROTTED SIGN: "STORE".',
                   quarters: 'STAKES MARKING OUT A PLOT. NOBODY BUILT ON IT.',
                   workshop: 'LEVEL GROUND BY THE WELL, AND A RUSTED ANVIL HALF SUNK IN THE GRASS. SOMEBODY MEANT TO WORK HERE.' }[a] || 'NOTHING HERE YET.', it.label);
    }
    if (a === 'workshop') {                            // the forge and the benches (js/workshop.js)
      if (!built('workshop')) return offer('workshop');
      if (typeof BridgeWorkshop !== 'undefined') return BridgeWorkshop.open();
      return say('THE FORGE IS COLD.', 'The workshop');
    }
    if (a === 'house') {                               // the rebuilt cottage is a home to walk into (scenes/lumar_holm_home.py)
      if (!built('house')) return offer('house');
      if (typeof BridgeWorld !== 'undefined' && BridgeWorld.enterWorld) return BridgeWorld.enterWorld('lumar-holm-home', [7, 8]);
      return cottage();
    }
    if (a === 'ledger') return ledger();
    if (a === 'rest') return rest();
    if (a === 'garden') return built('garden') ? garden() : offer('garden');
    if (a === 'warehouse') return built('warehouse') ? warehouse() : offer('warehouse');
    if (a === 'quarters') return built('quarters') ? quarters() : offer('quarters');
  }
  function say(text, title) { choose({ title: title || st.name, text: text, closeLabel: 'Done' }); }

  function forSale() {
    choose({
      title: 'For sale',
      text: 'STARLING HOLM. A SMALL ISLAND, WITH JETTY, COTTAGE (IN NEED OF REPAIR), WALLED GARDEN AND ORCHARD. QUIET. ' +
            'THE DEED: ' + DEED + ' COINS. ENQUIRIES TO THE SIGN, APPARENTLY.',
      buttons: [{ label: 'Buy the deed (' + DEED + ')', act: function () {
        pay(DEED, 'holm:deed').then(function (r) {
          if (!r || !r.ok) { say(why(r), 'For sale'); return; }
          st.owned = true; store(); sfx('coin');
          toast('Yours', st.name, 'The deed to the island');
          reload(function () { rename(true); });
        });
      } }],
      closeLabel: 'Not today'
    });
  }
  function rename(first) {
    choose({ title: first ? 'Yours now' : 'Name the island', text: first ? 'THE DEED HAS YOUR NAME ON IT. AND THE ISLAND? CALL IT WHAT YOU LIKE.' : 'WHAT\'LL YOU CALL IT?',
             input: { value: st.name, max: 24, button: 'Name it', placeholder: 'Starling Holm', submit: function (v) {
               if (v) { st.name = v.slice(0, 24); store(); nameIsle(); reload(function () { ledger(); }); }
               else ledger();
             } },
             closeLabel: 'Keep the name' });
  }
  function offer(k) {
    var B = BUILD[k];
    if (B.needs && !built(B.needs)) return say('REBUILD THE ' + BUILD[B.needs].name.replace(/^The /, '').toUpperCase() + ' FIRST: ' + B.because + '.', B.name);
    choose({ title: B.name, text: B.what, buttons: [{ label: 'Build it (' + B.price.toLocaleString() + ')', act: function () {
      pay(B.price, 'holm:' + k).then(function (r) {
        if (!r || !r.ok) { say(why(r), B.name); return; }
        st.built[k] = Date.now(); store(); sfx('coin');
        toast('Built', B.name, st.name);
        if (k === 'garden') tools();
        if (k === 'resort' && typeof BridgeBusiness !== 'undefined' && BridgeBusiness.grant) BridgeBusiness.grant('holm-resort');
        reload();
      });
    } }], closeLabel: 'Not yet' });
  }
  // reload the island so the new building shows (and its walls stand)
  function reload(then) {
    if (typeof BridgeWorld === 'undefined' || BridgeWorld.getWorldId() !== WID) { if (then) then(); return; }
    var x = BridgeCharacter.getX(), y = BridgeCharacter.getY();
    BridgeWorld.load(WID, function () {
      BridgeState.transition('world', { worldId: WID, spawn: { x: x, y: y } });
      var w = BridgeWorld.getWorld();
      if (w.collisions[y] && w.collisions[y][x]) BridgeCharacter.init(w.spawns.player[0], w.spawns.player[1]);
      if (then) setTimeout(then, 400);
    });
  }
  function tools() {
    if (typeof BridgeInventory === 'undefined') return;
    ['hoe', 'watering_can'].forEach(function (id) { if (!BridgeInventory.getCount(id)) BridgeInventory.addItem(id, 1); });
    if (!BridgeInventory.getCount('seed_turnip')) BridgeInventory.addItem('seed_turnip', 6);
  }

  // ---- the cottage: rest, the ledger ------------------------------------------------------------------------------
  function cottage() {
    choose({ title: st.name, text: 'THE FIRE\'S IN. THE LEDGER\'S ON THE TABLE.',
             rows: [{ label: 'Rest by the fire', sub: 'health and energy back', pick: rest },
                    { label: 'The ledger', sub: 'your ships, voyages, the strongbox', pick: ledger }],
             closeLabel: 'Done' });
  }
  function rest() {
    if (typeof BridgeInventory !== 'undefined' && BridgeInventory.restoreAll) BridgeInventory.restoreAll();
    sfx('sit');
    say('YOU DOZE BY THE FIRE WITH THE SEA OUTSIDE. YOU WAKE RESTED.', st.name);
  }

  // ---- the garden -------------------------------------------------------------------------------------------------
  function garden() {
    tools();
    say('YOUR GARDEN. TILL A ROW WITH THE HOE, PLANT WHAT YOU\'VE GOT (HOLLIN ON VERDANCE SELLS SEED), WATER IT FROM THE WELL. ' +
        'THE SEA AIR SUITS TURNIPS.', 'The garden');
  }

  // ---- the warehouse: cargo ashore --------------------------------------------------------------------------------
  function warehouse(note) {
    var f = F(), t = T();
    if (!f || !t) return;
    var ships = f.here(WID);
    var rows = Object.keys(st.store).map(function (id) {
      return { label: t.name(id), icon: id, sub: st.store[id] + ' in store', note: 'load',
               pick: function () { pickShip('Load into which ship?', function (s) {
                 var n = Math.min(st.store[id], t.fits(s, id));
                 if (n <= 0) { warehouse('HER HOLD IS FULL.'); return; }
                 s.hold[id] = (s.hold[id] || 0) + n; f.save();
                 st.store[id] -= n; if (st.store[id] <= 0) delete st.store[id]; store();
                 warehouse(n + ' LOADED INTO THE ' + s.name.toUpperCase() + '.');
               }); } };
    });
    ships.forEach(function (s) {
      Object.keys(s.hold).forEach(function (id) {
        rows.push({ label: t.name(id), icon: id, sub: s.hold[id] + ' aboard the ' + s.name, note: 'unload',
                    pick: function () {
                      st.store[id] = (st.store[id] || 0) + s.hold[id]; delete s.hold[id]; f.save(); store();
                      warehouse('UNLOADED INTO THE WAREHOUSE.');
                    } });
      });
    });
    choose({ title: 'The warehouse', text: note || 'CARGO ASHORE, AND IN YOUR SHIPS AT THE JETTY. PICK ONE TO MOVE IT.', rows: rows, closeLabel: 'Done' });
    function pickShip(title, then) {
      if (ships.length === 1) { then(ships[0]); return; }
      choose({ title: title, rows: ships.map(function (s) { return { label: s.name, sub: f.line(s), pick: function () { then(s); } }; }), closeLabel: 'Back' });
    }
  }

  // ---- quarters: hands ashore -------------------------------------------------------------------------------------
  function quarters(note) {
    var f = F();
    if (!f) return;
    var ashore = f.crew().filter(function (c) { return c.ship === 'holm'; });
    var ships = f.here(WID);
    var rows = ashore.map(function (c) {
      return { label: c.name, sub: f.ROLES[c.role].name + ' · skill ' + c.skill + ' · ashore', note: 'send aboard', pick: function () {
        choose({ title: 'Send ' + c.name + ' aboard', rows: ships.map(function (s) {
          var room = f.crewOn(s.id).length < f.berths(s);
          return { label: s.name, sub: f.crewOn(s.id).length + '/' + f.berths(s) + ' berths', disabled: !room, pick: function () { f.assign(c.id, s.id); quarters(c.name.toUpperCase() + ' GOES ABOARD.'); } };
        }), closeLabel: 'Back' });
      } };
    });
    ships.forEach(function (s) {
      f.crewOn(s.id).forEach(function (c) {
        rows.push({ label: c.name, sub: f.ROLES[c.role].name + ' · aboard the ' + s.name, note: 'bring ashore', disabled: ashore.length >= QUARTERS,
                    pick: function () { c.ship = 'holm'; f.save(); quarters(c.name.toUpperCase() + ' COMES ASHORE.'); } });
      });
    });
    choose({ title: 'Quarters', text: note || ashore.length + ' OF ' + QUARTERS + ' BUNKS TAKEN. HANDS ASHORE WAIT HERE FOR A SHIP.', rows: rows, closeLabel: 'Done' });
  }

  // ---- the ledger: building, voyages, the strongbox ---------------------------------------------------------------
  var PORT_NAMES = function (id) { var I = isles(); return I && I[id] ? I[id].name : id; };
  function routes(room) { return T() ? T().routes(room) : []; }
  function circuits(room) { return T() && T().circuits ? T().circuits(room) : []; }
  function legs(r) { return r.legs || [r]; }
  function risky(r) { return legs(r).some(function (l) { return DANGER[l.from] || DANGER[l.to]; }); }
  function path(r) { return [r.from].concat(legs(r).map(function (l) { return l.to; })).map(PORT_NAMES).join(' → '); }
  var DANGER = { 'lumar-crimson': 0.35, 'lumar-midnight': 0.4, 'lumar-rose': 0.12, 'lumar-sapphire': 0.12 };
  // how long she's away: a leg is the better part of an hour and a half at sea, more for a big cargo or bad water
  // (voyages took minutes, and every ship could run the day's best route over and over)
  var VOYAGE = 6;
  function voyageMins(r) {
    var mins = legs(r).reduce(function (m, l) { return m + 14 + Math.round(l.crates / 12) + (DANGER[l.from] || DANGER[l.to] ? 6 : 0); }, 0) * VOYAGE;
    return r.circuit ? Math.round(mins * 0.85) : mins;   // no running home empty between legs
  }
  function hm(mins) { return mins < 90 ? mins + ' MINUTES' : (Math.round(mins / 30) / 2) + ' HOURS'; }
  function send(s, r) {
    var f = F(), sp = f.effective(s);
    var mins = voyageMins(r);
    s.away = { from: r.from, to: r.to, good: r.good, goods: r.goods, crates: r.crates, profit: r.profit, back: Date.now() + mins * 60000, out: Date.now(),
               legs: r.circuit ? legs(r).map(function (l) { return [l.from, l.to]; }) : null };
    s.at = 'away';
    f.save();
    st.log.unshift('The ' + s.name + ' sailed for ' + PORT_NAMES(r.from) + ' to load ' + (T() ? T().name(r.good) : r.good) + '.');
    st.log = st.log.slice(0, 12); store();
    sfx('bell');
    return mins;
  }
  /** Ships back from their voyages: the profit into the strongbox, the story into the log. */
  function returns() {
    var f = F();
    if (!f) return [];
    var back = [];
    f.all().forEach(function (s) {
      if (!s.away || s.away.passage || Date.now() < s.away.back) return;    // (a passage you ordered: js/fleet.js arrivals)
      var a = s.away, sp = f.effective(s), hops = a.legs || [[a.from, a.to]];
      var profit = Math.round((a.profit || 0) * 0.6 * (1 + (f.crewOn(s.id).some(function (c) { return c.role === 'navigator'; }) ? 0.15 : 0)));   // wages and wear
      var story = hops.length > 1 ? 'a fair circuit' : 'a fair passage';
      hops.forEach(function (h) {                       // every leg rolls its own trouble
        var risk = Math.max(DANGER[h[0]] || 0.05, DANGER[h[1]] || 0.05);
        if (Math.random() >= risk) return;
        var teeth = (sp.guns.length * 2 + sp.fighters) / (4 + sp.guns.length * 2 + sp.fighters);
        if (Math.random() < teeth) { story = 'pirates came at her off ' + PORT_NAMES(h[1]) + ' and she beat them off'; profit += 80; s.hull = Math.max(0.3, s.hull - 0.2); }
        else { story = 'pirates took a third of her cargo off ' + PORT_NAMES(h[1]); profit = Math.round(profit * (hops.length > 1 ? 0.8 : 0.6)); s.hull = Math.max(0.2, s.hull - 0.35); }
      });
      st.chest += Math.max(0, profit);
      if (T() && T().noteSold) (a.legs || [[a.from, a.to]]).forEach(function (h, i) {     // her cargo sold: those markets feel it
        T().noteSold(i === 0 && a.goods && a.goods.length ? a.goods[0].good : a.good, h[1], Math.round((a.crates || 0) / (a.legs ? a.legs.length : 1)));
      });
      st.log.unshift('The ' + s.name + ' came home from ' + PORT_NAMES(a.to) + ': ' + story + ', ' + profit + ' coins clear.');
      st.log = st.log.slice(0, 12);
      delete s.away; s.at = WID;
      back.push({ ship: s, profit: profit, story: story });
    });
    if (back.length) { f.save(); store(); back.forEach(function (b) { toast('Home', b.ship.name + ' is back', '+' + b.profit + ' to the strongbox'); }); }
    return back;
  }
  function ledger(note) {
    var f = F();
    returns();
    var rows = [];
    if (st.chest > 0) rows.push({ label: 'The strongbox', sub: st.chest + ' coins from your ships\' voyages', note: 'take it', pick: collect });
    Object.keys(BUILD).forEach(function (k) {
      var B = BUILD[k];
      rows.push({ label: B.name, sub: built(k) ? 'built' : B.price.toLocaleString() + ' coins', note: built(k) ? '✓' : 'build', disabled: built(k), pick: function () { offer(k); } });
    });
    if (built('workshop') && typeof BridgeWorkshop !== 'undefined') {
      var ws = BridgeWorkshop.summary();
      rows.push({ label: 'The workshop', sub: (ws.smiths.length ? ws.smiths.map(function (p) { return p.name; }).join(', ') : 'no smiths') + ' · ' + ws.line,
                  note: ws.working ? 'at work' : 'idle', pick: function () { BridgeWorkshop.open(); } });
    }
    rows.push({ label: 'Send a ship trading', sub: built('dock') ? 'a ship based here, with her hands' : 'rebuild the dock first', disabled: !built('dock'), pick: voyage });
    rows.push({ label: 'Your ships', sub: f ? f.all().length + ' in all' : '', pick: function () { if (typeof BridgeHarbour !== 'undefined') BridgeHarbour.ledger(WID); } });
    if (built('dock') && f && f.here(WID).some(function (x) { return f.repairCost(x) > 0; }))
      rows.push({ label: 'Repairs', sub: 'on your own slip', pick: function () { if (typeof BridgeHarbour !== 'undefined') BridgeHarbour.repairs(WID); } });
    rows.push({ label: 'Name the island', sub: st.name, pick: function () { rename(false); } });
    choose({ title: st.name, text: note || (st.log[0] || 'THE LEDGER. WHAT\'S BUILT, WHAT\'S AT SEA, WHAT\'S IN THE STRONGBOX.').toUpperCase(), rows: rows, closeLabel: 'Done' });
  }
  function collect() {
    var n = st.chest;
    if (!n || typeof BridgeProgression === 'undefined' || !BridgeProgression.awardCoins) return;
    BridgeProgression.awardCoins(n, 'holm:voyages').then(function (b) {
      if (b == null) { ledger('NO WAY TO MOVE COINS RIGHT NOW.'); return; }
      st.chest = 0; store(); sfx('coin');
      ledger(n + ' COINS, FROM THE STRONGBOX TO YOUR PURSE.');
    });
  }
  function voyage() {
    var f = F(), t = T();
    var ships = f.all().filter(function (s) { return s.at === WID && !s.away && s.type !== 'sloop'; });
    var away = f.all().filter(function (s) { return s.away; });
    var rows = ships.map(function (s) {
      var sp = f.effective(s), ok = !sp.short && f.crewOn(s.id).length > 0;
      return { label: s.name, sub: f.line(s), note: ok ? 'send her' : 'needs hands', disabled: !ok, pick: function () {
        var room = Math.round(f.effective(s).hold * 0.9), rs = routes(room).slice(0, 4).concat(circuits(room));
        choose({ title: 'Where to?', text: 'TODAY\'S BEST RUNS: SHE BUYS AT ONE END AND SELLS AT THE OTHER. OR A CIRCUIT: SHE TRADES HER WAY ROUND TWO OR THREE PORTS - MORE FOR A BIG HOLD, LONGER AT SEA.',
                 rows: rs.map(function (r) {
                   var mins = voyageMins(r);
                   return { label: (r.circuit ? 'Circuit: ' : '') + path(r), icon: r.good,
                            sub: (r.circuit ? legs(r).length + ' legs' : r.goods.map(function (g) { return g.n + ' ' + (t ? t.name(g.good) : g.good); }).join(', ')) +
                                 ' · ~' + Math.round(r.profit * 0.6) + ' coins · ' + hm(mins).toLowerCase() + (risky(r) ? ' · risky water' : ''),
                            pick: function () { var m = send(s, r); ledger('THE ' + s.name.toUpperCase() + ' SAILS ON THE TIDE. BACK IN ABOUT ' + hm(m) + '.'); } };
                 }), closeLabel: 'Back' });
      } };
    }).concat(away.map(function (s) {
      var m = Math.max(0, Math.ceil((s.away.back - Date.now()) / 60000));
      return { label: s.name, sub: 'at sea: ' + (s.away.legs ? [s.away.legs[0][0]].concat(s.away.legs.map(function (h) { return h[1]; })).map(PORT_NAMES).join(' → ') : PORT_NAMES(s.away.from) + ' → ' + PORT_NAMES(s.away.to)),
               note: m ? 'back in ' + hm(m).toLowerCase() : 'due', disabled: true };
    }));
    choose({ title: 'Voyages', text: ships.length ? 'SHIPS BASED HERE WITH THEIR HANDS ABOARD CAN BE SENT OUT. (THE SLOOP STAYS WITH YOU.)' : 'NO SHIP OF YOURS IS TIED UP HERE. SAIL ONE IN AND LEAVE HER.',
             rows: rows, closeLabel: 'Back' });
  }

  // ---- the store: cargo ashore (the warehouse) and what the workshop makes, by id ----------------------------------
  function stored(id) { return id ? st.store[id] || 0 : Object.assign({}, st.store); }
  function storeAdd(id, n) { if (n > 0) { st.store[id] = (st.store[id] || 0) + n; store(); } }
  function storeTake(id, n) {
    n = Math.min(n, st.store[id] || 0);
    if (n > 0) { st.store[id] -= n; if (st.store[id] <= 0) delete st.store[id]; store(); }
    return n;
  }

  return { reload: function () { st = { owned: false, name: 'Starling Holm', built: {}, store: {}, chest: 0, log: [] };
                                try { st = Object.assign(st, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* fresh */ } },
           decorate: decorate, use: use, owned: owned, built: built, canFarm: canFarm, returns: returns, ledger: ledger,
           stored: stored, storeAdd: storeAdd, storeTake: storeTake, BUILD: BUILD,
           name: function () { return st.name; }, _state: function () { return st; } };
})();
