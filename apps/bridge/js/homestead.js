/**
 * BridgeHomestead — making the farm on Verdance yours, and running it.
 *
 * You start with Edda's kitchen garden: the first few columns of the field are yours to work, alone, with the
 * tools from the shed. The farmhouse door has her note — the deed is 1,500 coins — and once you've bought it the
 * whole field is yours, the farmhouse (rest by the stove, give the place a name, read the ledger) and the rest:
 *
 *   - the SHIPPING BIN by the mailbox: put in anything Marlo buys; he comes round every twenty minutes, empties it
 *     and pays (the flag is up while there's something waiting);
 *   - the SEED BOX in the barn: seed for Odile to replant with;
 *   - the ORDER BOARD (the notice board): three orders a day from people across the worlds — Tove wants pumpkins
 *     for pie, Chef Miyu carrots for broth — paid well over Marlo's price, and they think the better of you;
 *   - HANDS for hire, by the day: Tam keeps every planted row watered, Odile brings in what's ripe (into the bin)
 *     and replants it from the seed box. You'll see them at it in the field;
 *   - SPRINKLERS (Hollin's stall): set one in the field and the ground round it never dries.
 *
 * Kept in localStorage (bridge_homestead). js/farm.js asks canWork / keptWet / sprinklerAt and hands in the
 * crops Odile picks; the Verdance scene hooks call items / over here for the bin, sprinklers and hands.
 */
var BridgeHomestead = (function () {
  var KEY = 'bridge_homestead';
  var DEED = 1500, STARTER = 5, DAY = 24 * 3600 * 1000, ROUND = 20 * 60000;
  var BIN = [9, 8];                                       // by the mailbox
  var HANDS = {
    tam:   { name: 'Tam Rook', sheet: 'npc-tam', job: 'water', wage: 40, idle: [31, 24], label: 'TAM',
             does: 'keeps every planted row watered' },
    odile: { name: 'Odile Marsh', sheet: 'npc-odile', job: 'harvest', wage: 60, idle: [33, 24], label: 'ODILE',
             does: 'brings in what\'s ripe (into the shipping bin) and replants it from the seed box' }
  };
  var TERMS = [[1, 1], [3, 2.6], [7, 5.5]];               // days, and what they cost in days' wages
  var ORDERS = [
    { who: 'tove', item: 'pumpkin', n: 2, x: 1.6, why: 'pumpkin pie for the lift crew' },
    { who: 'miyu', item: 'carrot', n: 6, x: 1.5, why: 'carrots for the broth — "real ones, from dirt"' },
    { who: 'regular', item: 'turnip', n: 8, x: 1.5, why: 'turnips for the tavern stew' },
    { who: 'gran-wilde', item: 'strawberry', n: 6, x: 1.7, why: 'strawberries for jam, "and one for you"' },
    { who: 'joro', item: 'starfruit', n: 1, x: 1.5, why: 'one starfruit, "for a client"' },
    { who: 'keeper', item: 'sunflower', n: 3, x: 1.6, why: 'sunflowers for the lamp room' },
    { who: 'okafor', item: 'carrot', n: 4, x: 1.6, why: 'something green for the hydroponics crew' },
    { who: 'hob', item: 'pumpkin', n: 1, x: 1.8, why: 'a pumpkin. He won\'t say why' },
    { who: 'ysolde', item: 'honey', n: 3, x: 1.5, why: 'honey for the climbers\' porridge' },
    { who: 'pip', item: 'strawberry', n: 1, x: 3, why: 'a strawberry. Just the one' },
    { who: 'morwen', item: 'starfruit', n: 2, x: 1.6, why: 'starfruit, "picked under a true sun"' },
    { who: 'potter', item: 'sunflower', n: 2, x: 1.5, why: 'sunflowers to paint' },
    { who: 'merchant', item: 'turnip', n: 12, x: 1.4, why: 'turnips by the crate for a ship\'s hold' },
    { who: 'cook', item: 'carrot', n: 3, x: 1.6, why: 'carrots he can\'t get in the District' },
    { who: 'miyu', item: 'egg', n: 6, x: 1.6, why: 'eggs for the ramen, "soft, seven minutes"' },
    { who: 'tove', item: 'milk', n: 2, x: 1.6, why: 'milk for the cocoa, "the real thing"' },
    { who: 'regular', item: 'egg', n: 4, x: 1.5, why: 'eggs for the tavern\'s breakfast' }
  ];
  var BASE = { starfruit: 280, pumpkin: 95, sunflower: 32, carrot: 20, strawberry: 14, turnip: 12, honey: 25, apple: 5, egg: 10, milk: 30 };

  var s = load();
  var hands = {};                                          // live positions of hired hands in the field
  var bits = [];

  function load() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    d = d || {};
    return { owned: d.owned || 0, name: d.name || '', sprinklers: d.sprinklers || [], hands: d.hands || {}, bin: d.bin || {},
             seeds: d.seeds || {}, round: d.round || 0, ledger: d.ledger || { coins: 0, rounds: 0, orders: 0, shipped: {} },
             orders: d.orders || { day: '', done: [] }, glut: d.glut || { day: '', n: {} } };
  }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private mode */ } }
  function say(title, text) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(title, text); }
  function choose(spec) { if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.choose) BridgeInteractions.choose(spec); }
  function toast(k, t, sub) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(k, t, sub); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }
  function count(id) { return typeof BridgeInventory !== 'undefined' ? BridgeInventory.getCount(id) : 0; }
  function item(id) { return typeof BridgeItems !== 'undefined' && BridgeItems.get(id); }
  function nameOf(id) { var i = item(id); return i ? i.name : id; }
  function farmName() { return s.name ? s.name : 'Edda\'s farm'; }
  function onFarm() { return typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId && BridgeWorld.getWorldId() === 'verdance'; }
  function pay(n, why) {
    return typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins ? BridgeProgression.awardCoins(n, why) : Promise.resolve(null);
  }
  function charge(n, why) {
    return typeof BridgeProgression !== 'undefined' && BridgeProgression.wagerCoins
      ? BridgeProgression.wagerCoins(n, why).then(function (r) { return r || { ok: false }; }, function () { return { ok: false }; })
      : Promise.resolve({ ok: false, reason: 'offline' });
  }
  // Marlo's prices (his sell list in people.json), so the bin always pays what he does
  function prices() {
    var P = {}, m = typeof BridgePeople !== 'undefined' && BridgePeople.all().marlo;
    var t = m && m.topics.filter(function (q) { return q.sell; })[0];
    (t ? t.sell : []).forEach(function (b) { P[b.id] = b.price; });
    for (var k in BASE) if (!P[k]) P[k] = BASE[k];
    return P;
  }
  function person(id) { var all = typeof BridgePeople !== 'undefined' ? BridgePeople.all() : {}; return all[id] || null; }

  // ---- the land ------------------------------------------------------------------------------------------------
  function owned() { return !!s.owned; }
  /** May you work this tile of the field? All of it once the farm's yours; before that, Edda's kitchen garden. */
  function canWork(world, x) {
    var p = world && world.farm && world.farm.plot;
    return owned() || !p || x < p[0] + STARTER;
  }
  function starterEdge(world) { var p = world && world.farm && world.farm.plot; return p ? p[0] + STARTER : 0; }
  function sprinklerAt(k) { return s.sprinklers.indexOf(k) >= 0; }
  /** Until when a field tile counts as watered without you: a sprinkler beside it (always), or Tam while he's hired. */
  function keptWet(k, now) {
    var xy = k.split(','), x = +xy[0], y = +xy[1];
    for (var i = 0; i < s.sprinklers.length; i++) {
      var q = s.sprinklers[i].split(','), dx = Math.abs(+q[0] - x), dy = Math.abs(+q[1] - y);
      if (dx <= 1 && dy <= 1) return Infinity;
    }
    // rain (js/weather.js) waters everything: now, to the end of the Verdance day; worked out for a moment while you
    // were away (js/farm.js catches up), the rain then
    var W = typeof BridgeWeather !== 'undefined' ? BridgeWeather : null;
    if (W && Math.abs(now - Date.now()) < 60000 && W.rainDay()) return W.endOfDay();
    if (W && W.at) { var w = W.at('verdance', now); if (w && w.def.wet && w.k > 0.3) return now + 2 * 3600000; }
    return activeAt('tam', now) ? s.hands.tam : 0;
  }
  function placeSprinkler(x, y) {
    var k = x + ',' + y;
    if (sprinklerAt(k) || count('sprinkler') <= 0) return false;
    BridgeInventory.removeItem('sprinkler', 1);
    s.sprinklers.push(k); store();
    sfx('till');
    say('SPRINKLER', 'YOU SET THE SPRINKLER IN THE EARTH AND TURN THE TAP. THE GROUND ROUND IT - ONE TILE EVERY WAY - WILL NEVER DRY NOW.');
    return true;
  }
  function liftSprinkler(x, y) {
    var k = x + ',' + y, i = s.sprinklers.indexOf(k);
    if (i < 0) return false;
    if (!BridgeInventory.addItem('sprinkler', 1)) { say('SPRINKLER', 'NO ROOM IN YOUR PACK FOR IT.'); return false; }
    s.sprinklers.splice(i, 1); store();
    sfx('pickup');
    return true;
  }

  // ---- the hands -------------------------------------------------------------------------------------------------
  function active(id) { return (s.hands[id] || 0) > Date.now(); }
  function activeAt(id, at) { return (s.hands[id] || 0) > at; }                // was on at that moment (catching up)
  function hire(id) {
    var H = HANDS[id];
    if (!H) return;
    if (!owned()) {
      return say(H.name.toUpperCase(), '"WORK FOR YOU? ON WHAT? YOU\'RE WORKING EDDA\'S KITCHEN GARDEN. BUY THE PLACE AND COME FIND ME - I\'LL BE HERE."');
    }
    var left = Math.max(0, (s.hands[id] || 0) - Date.now());
    choose({
      title: H.name,
      text: (left ? 'ON THE FARM FOR ANOTHER ' + hours(left) + '. ' : '') + H.name.split(' ')[0].toUpperCase() + ' ' + H.does.toUpperCase() +
            ', WHILE YOU\'RE HERE OR AWAY. ' + H.wage + ' COINS A DAY.',
      rows: TERMS.map(function (t) {
        var cost = Math.round(H.wage * t[1]);
        return { label: t[0] === 1 ? 'A day' : t[0] + ' days', note: cost + ' coins', pick: function () { sign(id, t[0], cost); } };
      })
    });
  }
  function sign(id, days, cost) {
    var H = HANDS[id];
    charge(cost, 'farm:hand:' + id).then(function (r) {
      if (!r.ok) { say(H.name.toUpperCase(), r.reason === 'offline' ? 'NO WAY TO PAY RIGHT NOW.' : '"COME BACK WHEN YOU CAN PAY, BOSS."'); return; }
      s.hands[id] = Math.max(Date.now(), s.hands[id] || 0) + days * DAY;
      store();
      toast('Farm', H.name + ' works for you', days + (days === 1 ? ' day' : ' days'));
      say(H.name.toUpperCase(), id === 'tam' ? '"RIGHT YOU ARE. I\'LL KEEP THE ROWS WET - YOU KEEP THE SEED COMING."'
                                               : '"GOOD. LEAVE SEED IN THE BOX IN THE BARN AND I\'LL PUT BACK WHAT I TAKE OUT."');
      if (onFarm()) placeHands(BridgeWorld.getWorld());
    });
  }
  function hours(ms) { var h = Math.round(ms / 3600000); return h >= 24 ? Math.round(h / 24) + (h >= 36 ? ' DAYS' : ' DAY') : h <= 1 ? 'HOUR OR SO' : h + ' HOURS'; }

  // ---- the shipping bin and Marlo's round ------------------------------------------------------------------------
  // a glut: the first GLUT of a kind in a real day fetch Marlo's full price, then every one after a little less (2%
  // each), never under half — a field of one crop doesn't buy the world any more
  var GLUT = 24;
  function today() { return typeof BridgeClock !== 'undefined' ? Math.floor(BridgeClock.etNow() / 86400000) + '' : new Date().toDateString(); }
  function glutN(id) { if (s.glut.day !== today()) s.glut = { day: today(), n: {} }; return s.glut.n[id] || 0; }
  function worthOf(id, n, P) {
    var base = (P || prices())[id] || 0, had = glutN(id), t = 0;
    for (var i = 0; i < n; i++) t += base * Math.max(0.5, 1 - Math.max(0, had + i + 1 - GLUT) * 0.02);
    return Math.round(t);
  }
  function binWorth() { var P = prices(), t = 0; for (var k in s.bin) t += worthOf(k, s.bin[k], P); return t; }
  function binList() { return Object.keys(s.bin).filter(function (k) { return s.bin[k] > 0; }).map(function (k) { return s.bin[k] + ' ' + nameOf(k).toUpperCase(); }).join(', '); }
  function toBin(id, n) { if (n > 0) { s.bin[id] = (s.bin[id] || 0) + n; if (!s.round) s.round = Date.now() + ROUND; store(); } }
  function bin() {
    if (!owned()) return say('SHIPPING BIN', 'EDDA\'S OLD SHIPPING BIN, LID PADLOCKED. "FOR THE FARM\'S USE," SAYS A LABEL. THE FARM ISN\'T YOURS YET.');
    var P = prices(), have = Object.keys(P).filter(function (k) { return count(k) > 0; });
    var wait = s.round ? Math.max(0, s.round - Date.now()) : ROUND;
    var inside = binList();
    choose({
      title: 'Shipping bin',
      text: (inside ? 'IN THE BIN: ' + inside + ' - WORTH ' + binWorth() + ' COINS. MARLO COMES ROUND IN ' + mins(wait) + '.'
                    : 'EMPTY. PUT IN WHAT YOU WANT MARLO TO TAKE; HE COMES ROUND EVERY TWENTY MINUTES AND PAYS WHAT HE PAYS AT THE CART - LESS FOR EACH ONE PAST TWO DOZEN OF A KIND IN A DAY.'),
      rows: have.map(function (k) {
        return { label: nameOf(k), icon: k, sub: 'you have ' + count(k), note: P[k] + ' ea',
                 pick: function () { var n = count(k); BridgeInventory.removeItem(k, n); toBin(k, n); sfx('pickup'); bin(); } };
      }),
      buttons: have.length ? [{ label: 'Put in everything Marlo buys', act: function () {
        have.forEach(function (k) { var n = count(k); BridgeInventory.removeItem(k, n); toBin(k, n); });
        sfx('pickup'); bin();
      } }] : []
    });
  }
  function mins(ms) { var m = Math.ceil(ms / 60000); return m <= 1 ? 'A MINUTE' : m + ' MINUTES'; }
  var paying = false;
  function round() {
    var now = Date.now();
    if (paying || !s.round || now < s.round) return;
    var total = binWorth(), list = binList();
    if (!total) { s.round = 0; store(); return; }
    paying = true;
    pay(total, 'farm:ship').then(function (bal) {
      paying = false;
      if (bal === null || bal === undefined) { s.round = now + 5 * 60000; store(); return; }    // try again on the next pass
      for (var k in s.bin) { s.ledger.shipped[k] = (s.ledger.shipped[k] || 0) + s.bin[k]; glutN(k); s.glut.n[k] = (s.glut.n[k] || 0) + s.bin[k]; }
      s.ledger.coins += total; s.ledger.rounds++;
      s.bin = {}; s.round = 0; store();
      toast('Marlo\'s round', '+' + total + ' coins', list.toLowerCase());
      sfx('coin');
    }, function () { paying = false; });
  }
  setInterval(round, 10000);

  // ---- the seed box in the barn ----------------------------------------------------------------------------------
  function seedBox() {
    if (!owned()) return say('BARN', 'HAY, HARNESS, A CAT ASLEEP IN A FEED SACK. EDDA\'S PADLOCK ON THE SEED BOX. NOT YOURS YET.');
    var carried = Object.keys(BridgeFarm.CROPS).map(function (c) { return 'seed_' + c; }).filter(function (id) { return count(id) > 0; });
    var boxed = Object.keys(s.seeds).filter(function (id) { return s.seeds[id] > 0; });
    var animals = typeof BridgeAnimals !== 'undefined' ? [{ label: 'The animals', sub: 'hens and cows for the meadow', pick: function () { BridgeAnimals.barn(); } }] : [];
    choose({
      title: 'The seed box',
      text: 'WHAT ODILE REPLANTS WITH: WHEN SHE BRINGS A CROP IN, SHE PUTS THE SAME BACK IN THE GROUND IF THERE\'S SEED FOR IT HERE.' +
            (boxed.length ? '\n\nIN THE BOX: ' + boxed.map(function (id) { return s.seeds[id] + ' ' + nameOf(id).toUpperCase(); }).join(', ') + '.' : '\n\nTHE BOX IS EMPTY.'),
      rows: animals.concat(carried.map(function (id) {
        return { label: 'Put in ' + nameOf(id), icon: id, sub: 'you have ' + count(id), pick: function () {
          var n = count(id); BridgeInventory.removeItem(id, n); s.seeds[id] = (s.seeds[id] || 0) + n; store(); sfx('sow'); seedBox();
        } };
      }).concat(boxed.map(function (id) {
        return { label: 'Take out ' + nameOf(id), icon: id, sub: s.seeds[id] + ' in the box', pick: function () {
          var n = s.seeds[id];
          if (BridgeInventory.addItem(id, n)) { delete s.seeds[id]; store(); sfx('pickup'); }
          seedBox();
        } };
      })))
    });
  }
  function takeSeed(crop) {
    var id = 'seed_' + crop;
    if (!(s.seeds[id] > 0)) return false;
    s.seeds[id]--; if (!s.seeds[id]) delete s.seeds[id];
    store();
    return true;
  }

  // ---- the order board -------------------------------------------------------------------------------------------
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function todays() {
    var day = today();
    if (s.orders.day !== day) { s.orders = { day: day, done: [] }; store(); }
    var seed = day.split('-').reduce(function (a, b) { return a * 31 + +b; }, 7), picks = [], i = 0;
    while (picks.length < 3 && i < 40) {
      var j = Math.abs((seed * 9301 + 49297 * (i + 1)) % 233280) % ORDERS.length;
      if (picks.indexOf(j) < 0) picks.push(j);
      i++;
    }
    return picks.map(function (j) { return ORDERS[j]; });
  }
  function board() {
    var P = prices(), list = todays();
    choose({
      title: 'Order board',
      text: owned() ? 'ORDERS COME IN ON THE EVENING POST, PINNED UP BY HOLLIN. FILL ONE FROM YOUR PACK AND MARLO CARRIES IT ON HIS ROUND - THEY PAY WELL, AND THEY REMEMBER WHO GREW IT.'
                    : 'ORDERS PINNED UP FOR WHOEVER FARMS HERE. A NOTE AT THE BOTTOM IN HOLLIN\'S HAND: "THE FARM\'S FOR SALE - SEE EDDA\'S DOOR."',
      rows: list.map(function (o) {
        var p = person(o.who), who = p ? p.name : o.who, done = s.orders.done.indexOf(o.who + ':' + o.item) >= 0;
        var payN = Math.round((P[o.item] || 10) * o.n * o.x), have = count(o.item);
        return { label: who, icon: o.item, sub: done ? 'sent - thank you' : o.n + ' ' + plural(nameOf(o.item).toLowerCase(), o.n) + ': ' + o.why + (have < o.n && !done ? ' (you have ' + have + ')' : ''),
                 note: done ? 'done' : payN + ' coins', disabled: done || !owned() || have < o.n,
                 pick: function () { fill(o, payN, who); } };
      })
    });
  }
  function plural(w, n) { return n === 1 ? w : /y$/.test(w) ? w.slice(0, -1) + 'ies' : /s$/.test(w) ? w : w + 's'; }
  function fill(o, payN, who) {
    BridgeInventory.removeItem(o.item, o.n);
    pay(payN, 'farm:order:' + o.who).then(function (bal) {
      if (bal === null || bal === undefined) { BridgeInventory.addItem(o.item, o.n); say('ORDER BOARD', 'MARLO CAN\'T TAKE IT TODAY - NO WAY TO PAY YOU. TRY AGAIN LATER.'); return; }
      s.orders.done.push(o.who + ':' + o.item);
      s.ledger.orders++; s.ledger.coins += payN;
      store();
      if (typeof BridgeTalk !== 'undefined' && BridgeTalk.nudge) BridgeTalk.nudge(o.who, 1, 'They grew ' + o.n + ' ' + nameOf(o.item).toLowerCase() + ' on their farm on Verdance and sent them to me');
      toast('Order filled', who, '+' + payN + ' coins');
      sfx('coin');
    });
  }

  // ---- the farmhouse ---------------------------------------------------------------------------------------------
  function house() {
    if (owned()) { sfx('door'); return BridgeWorld.enterWorld('verdance-home', [7, 8]); }   // inside: js/home.js, scenes/verdance_home.py
    choose({
      title: 'Farmhouse',
      text: 'A NOTE PINNED TO THE DOOR IN A BIG SLOPING HAND:\n\n"FOR WHOEVER COMES DOWN IN THE NEXT SHIP. WORK THE KITCHEN GARDEN - THE NEAR END OF THE FIELD - FOR FREE, AND WELCOME. THE REST, THE HOUSE AND ALL, IS ' +
            DEED + ' COINS, PAID TO HOLLIN FOR MY KNEES. THE DOOR STICKS. - EDDA"',
      buttons: [{ label: 'Buy the farm — ' + DEED + ' coins', act: buy }]
    });
  }
  // the ledger on Edda's kitchen table, inside
  function ledgerTable() {
    var ledger = s.ledger;
    choose({
      title: farmName(),
      text: 'THE KITCHEN SMELLS OF WOODSMOKE AND EARTH. YOUR BOOTS BY THE STOVE, THE LEDGER ON THE TABLE.\n\n' +
            'SHIPPED: ' + ledger.coins + ' COINS OVER ' + ledger.rounds + ' ROUNDS · ORDERS FILLED: ' + ledger.orders +
            (active('tam') ? ' · TAM ON FOR ' + hours(s.hands.tam - Date.now()) : '') + (active('odile') ? ' · ODILE ON FOR ' + hours(s.hands.odile - Date.now()) : ''),
      rows: [
        { label: 'Rest by the stove', sub: 'energy and health back', pick: function () {
          if (typeof BridgeInventory !== 'undefined' && BridgeInventory.restoreAll) BridgeInventory.restoreAll();
          sfx('sleep'); say(farmName().toUpperCase(), 'YOU DOZE IN EDDA\'S OLD CHAIR WITH YOUR FEET TO THE STOVE, AND WAKE WITH THE KETTLE SINGING.');
        } },
        { label: 'Name the farm', sub: s.name ? 'now: ' + s.name : 'it has no name of its own yet', pick: rename }
      ]
    });
  }
  function buy() {
    charge(DEED, 'farm:deed').then(function (r) {
      if (!r.ok) { say('FARMHOUSE', r.reason === 'offline' ? 'NO WAY TO PAY RIGHT NOW.' : 'YOU COUNT YOUR COINS TWICE. NOT ENOUGH - NOT YET. THE KITCHEN GARDEN\'S STILL YOURS TO WORK.'); return; }
      s.owned = Date.now(); store();
      sfx('quest');
      toast('The farm is yours', 'Edda\'s farm, Verdance', 'The whole field, the house, the bin');
      say('FARMHOUSE', 'HOLLIN TAKES THE COINS, WRITES YOUR NAME UNDER EDDA\'S IN THE DEED, AND HANDS YOU THE KEY - WHICH THE DOOR IGNORES. YOU SHOULDER IT OPEN.\n\n' +
                       'THE WHOLE FIELD IS YOURS NOW, AND THE SHIPPING BIN, THE SEED BOX AND THE HANDS IN THE VILLAGE WHO\'LL WORK FOR A WAGE. GIVE THE PLACE A NAME AT THE KITCHEN TABLE.');
    });
  }
  function rename() {
    choose({
      title: 'Name the farm',
      text: 'WHAT GOES ON THE GATE?',
      input: { placeholder: 'e.g. Starfall Acres', value: s.name, max: 24, button: 'Paint it', submit: function (v) {
        v = String(v || '').replace(/[^\w '\-&.]/g, '').trim().slice(0, 24);
        if (!v) return;
        s.name = v; store();
        toast('Farm', 'Welcome to ' + v, 'Painted on the gate');
      } }
    });
  }

  // ---- in the world -----------------------------------------------------------------------------------------------
  var stumbled = false;
  function decorate(worldId, data) {
    if (worldId !== 'verdance') return;
    (data.interactions || []).forEach(function (it) {
      if (it.label === 'FARMHOUSE') { it.type = 'farm_house'; it.prompt = 'PRESS E TO GO IN'; }
      if (it.label === 'BARN') { it.type = 'farm_barn'; it.prompt = 'PRESS E FOR THE SEED BOX'; }
      if (it.label === 'NOTICE BOARD') { it.type = 'farm_board'; it.prompt = 'PRESS E TO READ THE ORDERS'; }
      if (it.type === 'vendor' && it.label === 'SEED STALL' && !it.items.some(function (q) { return q.id === 'sprinkler'; })) it.items.push({ id: 'sprinkler', price: 150 });
    });
    if (!data.interactions.some(function (it) { return it.type === 'farm_bin'; })) {
      data.interactions.push({ x: BIN[0], y: BIN[1], type: 'farm_bin', label: 'SHIPPING BIN', prompt: 'PRESS E TO SHIP', noBeacon: true });
      if (data.collisions && data.collisions[BIN[1]]) data.collisions[BIN[1]][BIN[0]] = 1;
    }
    placeHands(data);
    if (s.name) setTimeout(function () { toast(s.name, 'Verdance', owned() ? 'Your farm' : ''); }, 1200);
    else if (!owned() && !stumbled) {                                  // down Meadow Lane from Brambleford, and there it is
      stumbled = true;
      setTimeout(function () { toast('An old farm', 'At the end of Meadow Lane - empty since Edda went', 'Hollin lives next door'); }, 1200);
    }
    round();
  }
  // the hands: in the village waiting for work, or out in the field doing it
  function placeHands(data) {
    data.scene = data.scene || {};
    data.scene.actors = (data.scene.actors || []).filter(function (a) { return a.sheet !== 'npc-tam' && a.sheet !== 'npc-odile'; });
    data.interactions = data.interactions.filter(function (it) { return !it.hand; });
    Object.keys(HANDS).forEach(function (id) {
      var H = HANDS[id], on = active(id), p = on && hands[id] ? hands[id] : null;
      if (!on) data.scene.actors.push({ sheet: H.sheet, x: H.idle[0], y: H.idle[1], facing: 'down' });
      var it = { x: p ? Math.round(p.x) : H.idle[0], y: p ? Math.round(p.y) : H.idle[1], type: 'dialog', label: H.label, hand: id, text: '...' };
      data.interactions.push(it);
      var gate = data.farm && data.farm.plot ? [Math.round((data.farm.plot[0] + data.farm.plot[2]) / 2) + (id === 'tam' ? -2 : 2), data.farm.plot[3] + 1] : H.idle;
      if (on && !hands[id]) { hands[id] = { x: gate[0], y: gate[1], tx: null, ty: null, wait: 0.5, facing: 'up', dist: 0, inter: it }; it.x = gate[0]; it.y = gate[1]; }
      else if (hands[id]) hands[id].inter = it;
    });
  }

  // a hand's day: walk to a tile with work on it, work it a moment, move on
  function workHand(id, world, dt, now) {
    var h = hands[id], p = world.farm && world.farm.plot, save = BridgeFarm._save();
    if (!h || !p) return;
    if (h.wait > 0) { h.wait -= dt; if (h.wait <= 0) h.tx = null; return; }
    if (h.tx === null) {
      var cands = [];
      for (var k in save.tiles) {
        var t = save.tiles[k];
        if (!t.crop) continue;
        if (id === 'odile' && t.crop.g < t.crop.need) continue;
        var xy = k.split(','); cands.push([+xy[0], +xy[1]]);
      }
      if (!cands.length) cands.push([p[0] + Math.floor(Math.random() * (p[2] - p[0])), p[3] + 1]);       // nothing to do: the headland
      var c = cands[Math.floor(Math.random() * cands.length)];
      h.tx = c[0]; h.ty = c[1];
    }
    var dx = h.tx - h.x, dy = h.ty - h.y, d = Math.hypot(dx, dy), step = 2.1 * dt;
    if (d <= step) {
      h.x = h.tx; h.y = h.ty; h.wait = 1.6 + Math.random() * 1.6;
      var k2 = h.tx + ',' + h.ty, t2 = save.tiles[k2];
      if (id === 'tam' && t2 && t2.crop) { for (var i = 0; i < 6; i++) bits.push({ x: h.x + 0.5 + (Math.random() - 0.5) * 0.6, y: h.y + 0.4, vx: (Math.random() - 0.5) * 1.2, vy: -0.6 - Math.random(), life: 1, c: '#9ad8f8' }); }
      if (id === 'odile' && t2 && t2.crop && t2.crop.g >= t2.crop.need) BridgeFarm.pickFor(k2);
    } else {
      h.x += dx / d * step; h.y += dy / d * step; h.dist += step;
      h.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    }
    if (h.inter) { h.inter.x = Math.round(h.x); h.inter.y = Math.round(h.y); }
  }

  var lastT = 0;
  function items(world, offX, offY, ts, now, sc) {
    var out = [], dt = Math.min(0.05, (now - (lastT || now)) / 1000);
    lastT = now;
    // the shipping bin, its flag up when there's something in it for Marlo
    out.push({ footRow: BIN[1] + 0.85, draw: function (c) { drawBin(c, Math.round(offX + BIN[0] * ts), Math.round(offY + BIN[1] * ts), ts, now); } });
    // sprinklers
    s.sprinklers.forEach(function (k) {
      var xy = k.split(','), x = +xy[0], y = +xy[1];
      out.push({ footRow: y + 0.7, draw: function (c) { drawSprinkler(c, Math.round(offX + x * ts), Math.round(offY + y * ts), ts, now, x * 7 + y); } });
    });
    // the hands at work
    Object.keys(HANDS).forEach(function (id) {
      if (!active(id)) { if (hands[id]) { delete hands[id]; placeHands(world); } return; }
      if (!hands[id]) placeHands(world);
      workHand(id, world, dt, now);
      var h = hands[id];
      if (!h) return;
      var foot = h.y + 0.9;
      out.push({ footRow: foot, draw: function (c) { drawHand(c, id, h, offX, offY, ts, now, sc, world, foot); } });
    });
    return out;
  }
  var handSheets = {};
  function handSheet(name) {
    if (!handSheets[name]) { var im = new Image(); handSheets[name] = { img: im, ready: false }; im.onload = function () { handSheets[name].ready = true; }; im.src = '/bridge/assets/characters/' + name + '.png'; }
    return handSheets[name];
  }
  function drawHand(c, id, h, offX, offY, ts, now, sc, world, foot) {
    var sh = handSheet(HANDS[id].sheet);
    if (!sh.ready) return;
    var moving = h.wait <= 0 && h.tx !== null;
    var col = moving ? 4 + Math.floor(h.dist / 0.3) % 8 : [0, 1, 2, 1][Math.floor(now / 360) % 4];
    var row = { down: 0, right: 1, up: 2, left: 3 }[h.facing] || 0;
    var cx = Math.round(offX + (h.x + 0.5) * ts), fy = Math.round(offY + foot * ts);
    if (sc && BridgeScene.drawOccluded) {
      BridgeScene.drawOccluded(c, sc, sh.img, col * 32, row * 48, 32, 48, cx - 16, fy - 45, foot, offX, offY,
        BridgeScene.tintAt ? BridgeScene.tintAt(sc, world, Math.round(h.x), Math.round(h.y), now) : null, { x: cx, y: fy, rx: 8, ry: 3 });
    } else c.drawImage(sh.img, col * 32, row * 48, 32, 48, cx - 16, fy - 45, 32, 48);
  }

  // a wooden bin on legs with a hinged lid and a red flag, 16-unit art
  function drawBin(c, x, y, ts, now) {
    var u = ts / 16, full = Object.keys(s.bin).some(function (k) { return s.bin[k] > 0; });
    function r(col, a, b, w, h) { c.fillStyle = col; c.fillRect(x + a * u, y + b * u, w * u, h * u); }
    r('rgba(0,0,0,0.22)', 1, 14, 14, 2);
    r('#2a1a10', 1, 5, 14, 10);                          // outline
    r('#9a6a38', 2, 6, 12, 8);                           // the box
    r('#b8844a', 2, 6, 12, 1); r('#7a5028', 2, 13, 12, 1);
    r('#7a5028', 5, 6, 1, 8); r('#7a5028', 10, 6, 1, 8);   // slats
    r('#2a1a10', 0, 3, 16, 3); r('#6a4422', 1, 4, 14, 1); r('#8a5a30', 1, 3, 14, 1);   // the lid
    r('#c8a050', 7, 9, 2, 2);                            // the hasp
    if (full) { r('#2a1a10', 14, -3, 1, 7); r('#d83a2e', 15, -3, 3, 2); }               // flag up: something for Marlo
    else { r('#2a1a10', 14, 2, 1, 3); }
  }
  // a brass sprinkler head on its pipe; now and then it spins up and throws water round
  function drawSprinkler(c, x, y, ts, now, seed) {
    var u = ts / 16;
    function r(col, a, b, w, h) { c.fillStyle = col; c.fillRect(x + a * u, y + b * u, w * u, h * u); }
    r('rgba(0,0,0,0.2)', 5, 12, 6, 2);
    r('#2a1a10', 7, 6, 2, 7); r('#a08040', 7, 7, 1, 5);
    r('#2a1a10', 5, 4, 6, 3); r('#e0c060', 6, 5, 4, 1);
    var ph = ((now / 1000 + seed * 0.37) % 5) / 5;
    if (ph < 0.35) {
      var a0 = ph / 0.35 * Math.PI * 2;
      for (var i = 0; i < 10; i++) {
        var a = a0 + i * 0.63, d = (2 + (i % 4) * 4) * u;
        c.fillStyle = 'rgba(170,220,250,' + (0.8 - (i % 4) * 0.15).toFixed(2) + ')';
        c.fillRect(Math.round(x + 8 * u + Math.cos(a) * d * 1.6), Math.round(y + 6 * u + Math.sin(a) * d * 0.7 - (6 - (i % 4)) * u * 0.5), u, u);
      }
    }
  }
  function over(ctx, world, offX, offY, ts) {
    bits.forEach(function (d) {
      d.x += d.vx * 0.016; d.y += d.vy * 0.016; d.vy += 0.09; d.life -= 0.04;
      ctx.globalAlpha = Math.max(0, d.life); ctx.fillStyle = d.c;
      ctx.fillRect(Math.round(offX + d.x * ts), Math.round(offY + d.y * ts), 2, 2);
    });
    ctx.globalAlpha = 1;
    bits = bits.filter(function (d) { return d.life > 0; });
  }

  function use(inter) {
    if (inter.type === 'farm_house') return house();
    if (inter.type === 'farm_ledger') return ledgerTable();
    if (inter.type === 'farm_bin') return bin();
    if (inter.type === 'farm_barn') return seedBox();
    if (inter.type === 'farm_board') return board();
  }

  function journal() {
    return { owned: owned(), name: farmName(), coins: s.ledger.coins, rounds: s.ledger.rounds, orders: s.ledger.orders,
             tam: active('tam') ? s.hands.tam : 0, odile: active('odile') ? s.hands.odile : 0, bin: binWorth(), sprinklers: s.sprinklers.length };
  }

  return { reload: function () { s = load(); }, decorate: decorate, use: use, items: items, over: over, canWork: canWork, starterEdge: starterEdge, keptWet: keptWet,
           sprinklerAt: sprinklerAt, placeSprinkler: placeSprinkler, liftSprinkler: liftSprinkler, active: active, activeAt: activeAt, hire: hire,
           toBin: toBin, takeSeed: takeSeed, owned: owned, name: farmName, journal: journal, HANDS: HANDS,
           _s: function () { return s; }, _round: function () { s.round = 1; round(); } };
})();
