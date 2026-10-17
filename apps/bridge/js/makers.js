/**
 * BridgeMakers — Verdance's local makers and the countryside's trade (Beck: "cozy town, small town, farm vibes, a cute
 * little café… local artisan goods… very local granola… our own cool things").
 *
 * The Downs (scenes/verdance_downs.py):
 *   farm_stand   the stand at the crossroads with its honesty box: stock it with your produce and walkers-by take what
 *                they like and leave the money in the tin (a little over Marlo's price) — mostly. Now and then someone
 *                leaves something instead: a jar of jam, an egg, a note. Worked out from the clock, so it sells while
 *                you're away; empty the tin when you pass.
 *   flower_farm  Marigold Larkin's Larkspur Flowers: seed (moonflowers, the twin-moon melon, sunflowers), posies and
 *                bouquets, and she buys cut flowers — moonflowers dearest, picked by night.
 *   flower_bed   her moonflower bed: open and glowing after dark.
 *   cider_press  Ezra Cobb's press: his cider by the bottle, and your own apples pressed — a dozen make a bottle of
 *                farm cider, ready in two days in his casks.
 *   lane         a lane on to the next place (the towns along it), once it's there.
 * Kept in localStorage `bridge_makers`.
 */
var BridgeMakers = (function () {
  var KEY = 'bridge_makers';
  var DAY = 86400000;
  var PLACES = ['verdance-downs'];                             // the places built so far (a lane to anywhere else waits)
  var s = load();
  function load() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    d = d || {};
    return { stand: d.stand || { stock: {}, tin: 0, t: 0, left: [], sold: 0 }, casks: d.casks || [], ledger: d.ledger || { stand: 0, flowers: 0 },
             dips: d.dips || [], stall: d.stall || null, export: d.export || null, cellar: d.cellar || [], picked: d.picked || {} };
  }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private mode */ } }
  function say(t, x) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(t, x); }
  function choose(spec) { if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.choose) BridgeInteractions.choose(spec); }
  function toast(a, b, c) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(a, b, c); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function count(id) { return typeof BridgeInventory !== 'undefined' ? BridgeInventory.getCount(id) : 0; }
  function item(id) { return typeof BridgeItems !== 'undefined' && BridgeItems.get(id); }
  function nameOf(id) { var i = item(id); return i ? i.name : id; }
  function charge(n, why) {
    return typeof BridgeProgression !== 'undefined' && BridgeProgression.wagerCoins
      ? BridgeProgression.wagerCoins(n, why).then(function (r) { return r || { ok: false }; }, function () { return { ok: false }; })
      : Promise.resolve({ ok: false, reason: 'offline' });
  }
  function pay(n, why) { return typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins ? BridgeProgression.awardCoins(n, why) : Promise.resolve(null); }
  function why(r) { var x = r && r.reason; return x === 'offline' || x === 'no_client' || x === 'no_pilot' || x === 'error' ? 'NO WAY TO MOVE COINS RIGHT NOW.' : 'NOT ENOUGH COINS.'; }
  function hash01(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10007) / 10007; }
  function night() { return typeof BridgeFarm !== 'undefined' && BridgeFarm.nightAt ? BridgeFarm.nightAt(Date.now()) : false; }
  function buy(title, id, price, then) {
    charge(price, 'makers:' + id).then(function (r) {
      if (!r.ok) return say(title, why(r));
      if (!BridgeInventory.addItem(id, 1)) { pay(price, 'makers:refund'); return say(title, 'NO ROOM IN YOUR PACK.'); }
      sfx('coin'); if (then) then();
    });
  }
  function sellRows(title, prices, back) {
    return Object.keys(prices).filter(function (k) { return count(k) > 0; }).map(function (k) {
      return { label: 'Sell ' + nameOf(k), icon: k, sub: 'you have ' + count(k), note: prices[k] + ' ea', pick: function () {
        var n = count(k); BridgeInventory.removeItem(k, n);
        pay(prices[k] * n, 'makers:sell').then(function () { sfx('coin'); toast(title, '+' + prices[k] * n + ' coins', n + ' ' + nameOf(k).toLowerCase()); if (back) back(); });
      } };
    });
  }

  // ---- the farm stand and its honesty box ----------------------------------------------------------------------------
  // what walkers-by pay (a little over Marlo's), and how often someone stops: one every few minutes by day, fewer at night
  var STAND = { strawberry: 17, turnip: 14, carrot: 23, pumpkin: 105, sunflower: 36, apple: 6, honey: 29, egg: 12, large_egg: 20, milk: 34,
                wold_cheese: 20, farm_cheese: 48, flour: 18, moonflower: 55, granola: 14, posy: 12, farm_cider: 60, jam: 20 };
  var LEFT = [['jam', 'A JAR OF HOMEMADE JAM, AND A NOTE: "SWAPSIES? - THE FOLK AT HOLLY COTTAGE"'], ['egg', 'TWO BROWN EGGS IN A TWIST OF NEWSPAPER, AND A SMILEY FACE'],
              ['posy', 'A POSY OF WILDFLOWERS TIED WITH STRING. "FOR WHOEVER GROWS THE CARROTS"'], ['honey_cake', 'A SLICE OF HONEY CAKE IN A NAPKIN. "BRIDGET SAYS HELLO"']];
  var STOP = 5 * 60000;
  function standTick(now) {
    var st = s.stand;
    if (!st.t) { st.t = now; return; }
    var t = st.t, changed = false;
    while (t + STOP <= now) {
      t += STOP;
      var ids = Object.keys(st.stock).filter(function (k) { return st.stock[k] > 0; });
      if (!ids.length) { t = now; break; }
      var h = hash01('stand:' + t), dark = typeof BridgeFarm !== 'undefined' && BridgeFarm.nightAt && BridgeFarm.nightAt(t);
      if (h > (dark ? 0.25 : 0.8)) continue;                                   // nobody this time
      var id = ids[Math.floor(hash01('pick:' + t) * ids.length)], n = Math.min(st.stock[id], 1 + Math.floor(hash01('n:' + t) * 3));
      st.stock[id] -= n; if (!st.stock[id]) delete st.stock[id];
      st.sold += n; changed = true;
      var honest = hash01('honest:' + t);
      if (honest < 0.04) continue;                                             // the odd one doesn't pay
      if (honest < 0.09) { var L = LEFT[Math.floor(hash01('left:' + t) * LEFT.length)]; st.left.push(L[0]); if (st.left.length > 6) st.left.shift(); st.note = L[1]; continue; }
      st.tin += (STAND[id] || 10) * n;
    }
    st.t = t;
    if (changed) store();
  }
  setInterval(function () { standTick(Date.now()); }, 30000);
  function stand() {
    standTick(Date.now());
    var st = s.stand, stocked = Object.keys(st.stock).filter(function (k) { return st.stock[k] > 0; });
    var have = Object.keys(STAND).filter(function (k) { return count(k) > 0; });
    var rows = [];
    if (st.tin > 0 || st.left.length) rows.push({ label: 'Empty the honesty box', sub: st.tin + ' coins' + (st.left.length ? ' and ' + st.left.length + ' thing' + (st.left.length > 1 ? 's' : '') + ' left' : ''), pick: emptyTin });
    stocked.forEach(function (k) { rows.push({ label: 'Take back ' + nameOf(k), icon: k, sub: st.stock[k] + ' on the stand', pick: function () {
      var n = st.stock[k]; if (BridgeInventory.addItem(k, n)) { delete st.stock[k]; store(); sfx('pickup'); } stand(); } }); });
    have.forEach(function (k) { rows.push({ label: 'Put out ' + nameOf(k), icon: k, sub: 'you have ' + count(k), note: STAND[k] + ' ea', pick: function () {
      var n = count(k); BridgeInventory.removeItem(k, n); st.stock[k] = (st.stock[k] || 0) + n; if (!st.t) st.t = Date.now(); store(); sfx('pickup'); stand(); } }); });
    choose({
      title: 'The farm stand',
      text: 'A TABLE UNDER A LITTLE ROOF AT THE CROSSROADS, A SLATE OF PRICES AND A TIN WITH A SLOT: "HELP YOURSELF - MONEY IN THE BOX." ' +
            (stocked.length ? 'ON IT: ' + stocked.map(function (k) { return st.stock[k] + ' ' + nameOf(k).toUpperCase(); }).join(', ') + '. ' : 'IT\'S BARE. ') +
            'WALKERS BY TAKE WHAT THEY LIKE AND PAY WHAT THE SLATE SAYS - MOSTLY - WHILE YOU\'RE HERE OR NOT.' + (st.sold ? ' ' + st.sold + ' SOLD SO FAR.' : ''),
      rows: rows
    });
  }
  function emptyTin() {
    var st = s.stand, n = st.tin, left = st.left.slice();
    st.tin = 0; st.left = []; store();
    left.forEach(function (id) { BridgeInventory.addItem(id, 1); });
    var note = st.note; st.note = null; store();
    if (n) pay(n, 'makers:stand').then(function () { sfx('coin'); s.ledger.stand += n; store(); });
    say('THE HONESTY BOX', (n ? n + ' COINS IN THE TIN, MOSTLY SMALL CHANGE AND ONE BUTTON.' : 'NO COINS, BUT —') + (left.length ? '\n\n' + (note || 'SOMEBODY LEFT SOMETHING.') : ''));
  }

  // ---- Larkspur Flowers ---------------------------------------------------------------------------------------------------
  var SEEDS = [{ id: 'seed_moonflower', price: 25 }, { id: 'seed_moonmelon', price: 60 }, { id: 'seed_sunflower', price: 12 }, { id: 'posy', price: 10 }];
  var FLOWERS_BUY = { moonflower: 60, sunflower: 36, posy: 8 };
  function flowers() {
    choose({
      title: 'Larkspur Flowers',
      text: 'BUCKETS OF DAHLIAS AND SWEET PEAS, SEED PACKETS IN A WOODEN RACK, MARIGOLD\'S HANDWRITING ON EVERYTHING. "MOONFLOWERS ARE THE THING THIS YEAR. PLANT THEM, WATER THEM, AND PICK THEM AFTER DARK - THEY GLOW. I\'LL PAY WELL FOR EVERY ONE."',
      rows: SEEDS.map(function (m) { return { label: nameOf(m.id), icon: m.id, note: m.price + ' coins', pick: function () { buy('LARKSPUR FLOWERS', m.id, m.price, flowers); } }; })
        .concat(sellRows('Larkspur Flowers', FLOWERS_BUY, flowers))
    });
  }
  function flowerBed() {
    say('THE MOONFLOWER BED', night() ? 'THE MOONFLOWERS ARE OPEN: PALE TRUMPETS GLOWING SOFTLY ALL ALONG THE ROW, MOTHS DRIFTING BETWEEN THEM. THE SMELL OF HONEY AND RAIN.'
                                       : 'A ROW OF TIGHT GREEN BUDS ON TWINING STEMS. "THEY OPEN AFTER DARK," SAYS THE LITTLE SIGN. "WORTH THE WAIT."');
  }

  // ---- Cobb's cider -------------------------------------------------------------------------------------------------------
  var APPLES = 12, CASK = 2 * DAY;
  function cider() {
    var now = Date.now(), ready = s.casks.filter(function (c) { return c.ready <= now; }).length, ageing = s.casks.length - ready;
    var rows = [{ label: nameOf('cider'), icon: 'cider', note: '18 coins', pick: function () { buy("COBB'S CIDER", 'cider', 18, cider); } }];
    rows.push({ label: 'Press your apples', sub: APPLES + ' apples a bottle · you have ' + count('apple'), note: 'two days in the cask', disabled: count('apple') < APPLES, pick: function () {
      var n = Math.floor(count('apple') / APPLES);
      BridgeInventory.removeItem('apple', n * APPLES);
      for (var i = 0; i < n; i++) s.casks.push({ ready: Date.now() + CASK });
      store(); sfx('pickup');
      say("COBB'S CIDER", '"INTO THE PRESS WITH \'EM." THE OLD SCREWS CREAK DOWN; JUICE RUNS GOLD INTO THE TUB. "TWO DAYS IN THE CASK AND YOU\'LL HAVE ' + n + ' BOTTLE' + (n > 1 ? 'S' : '') + ' OF YOUR OWN."');
    } });
    if (ready) rows.push({ label: 'Collect your cider', icon: 'farm_cider', sub: ready + ' ready', pick: function () {
      var got = 0;
      s.casks = s.casks.filter(function (c) { if (c.ready <= Date.now() && BridgeInventory.addItem('farm_cider', 1)) { got++; return false; } return true; });
      store(); sfx('pickup'); toast("Cobb's Cider", got + ' bottle' + (got > 1 ? 's' : '') + ' of farm cider', 'from your own apples'); cider();
    } });
    choose({ title: "Cobb's Cider", text: 'THE PRESS BARN SMELLS OF APPLES AND OAK. ' + (ageing ? ageing + ' OF YOURS IN THE CASKS. ' : '') + 'EZRA BUYS APPLES TOO, IF YOU\'VE MORE THAN YOU CAN PRESS.',
             rows: rows.concat(sellRows("Cobb's Cider", { apple: 7 }, cider)) });
  }

  // ---- lanes on ------------------------------------------------------------------------------------------------------------
  function lane(inter) {
    if (PLACES.indexOf(inter.to) >= 0) return BridgeWorld.enterWorld(inter.to, inter.spawn);
    say(inter.label, {
      'verdance-market': 'THE LANE RUNS ON EAST BETWEEN HIGH HEDGES TOWARD THISTLECOMBE. A CART HAS SHED A WHEEL ACROSS IT - THE CARTER SAYS IT\'LL BE CLEAR SOON.',
      'verdance-hill': 'THE LANE CLIMBS PAST THE CHALK HORSE TOWARD VINEHALLOW. A FLOCK OF SHEEP IS BEING MOVED ALONG IT - YOU\'LL HAVE TO WAIT.',
      'verdance-mill': 'THE LANE WINDS DOWN TO THE RIVER AND THE MILL HAMLET. THE FORD\'S UP AFTER THE RAIN - NOT TODAY.'
    }[inter.to] || 'THE LANE GOES ON.');
  }

  // ---- Thistlecombe's makers -------------------------------------------------------------------------------------------
  var MAKERS = {
    roaster: { title: 'Ember & Bean', text: 'SACKS OF GREEN BEANS FROM THE HILLS ABOVE THISTLECOMBE, THE DRUM TURNING BY THE DOOR, THE WHOLE STREET SMELLING OF IT. ADA ROASTS FOR THE WOOLPACK AND, NOW, THE KETTLE & CRUMB.',
               sell: [{ id: 'coffee_beans', price: 22 }, { id: 'flat_white', price: 7 }], buy: { honey: 30 } },
    potter:  { title: 'Thistle Pottery', text: 'SHELVES OF JUGS AND BOWLS IN BLUE AND GREEN GLAZES, THE WHEEL STILL TURNING, THE KILN TICKING AS IT COOLS. WREN MAKES THE KETTLE & CRUMB\'S MUGS - "THE CHIPPED ONES ARE THE SECONDS."',
               sell: [{ id: 'stoneware_jug', price: 45 }, { id: 'honey_crock', price: 30 }, { id: 'pottery_mug', price: 18 }] },
    candles: { title: 'Wick & Comb', text: 'TAPERS HANGING IN PAIRS TO COOL, PILLARS ON THE SHELVES, SKEPS IN THE WINDOW. SILAS WANTS HONEYCOMB: "BRING ME YOUR HONEY - I\'LL TAKE THE COMB, RENDER THE WAX AND DIP YOU CANDLES FROM IT, AND GIVE YOU THE HONEY BACK IN A CROCK."',
               sell: [{ id: 'beeswax_candles', price: 34 }] }
  };
  var WAX = 4;                                               // honey for a bundle of your own candles, a day at the dipping
  function maker(inter) {
    var M = MAKERS[inter.maker];
    if (!M) return;
    var rows = M.sell.map(function (m) { return { label: nameOf(m.id), icon: m.id, note: m.price + ' coins', pick: function () { buy(M.title.toUpperCase(), m.id, m.price, function () { maker(inter); }); } }; });
    if (inter.maker === 'candles') {
      var now = Date.now(), ready = (s.dips || []).filter(function (d) { return d.ready <= now; }).length;
      rows.push({ label: 'Leave honey for candles', sub: WAX + ' honey a bundle · you have ' + count('honey'), note: 'a day', disabled: count('honey') < WAX, pick: function () {
        BridgeInventory.removeItem('honey', WAX); (s.dips = s.dips || []).push({ ready: Date.now() + DAY }); store(); sfx('pickup');
        say('WICK & COMB', '"LOVELY COMB. I\'LL RENDER IT TONIGHT AND DIP TOMORROW. COME BACK FOR YOUR CANDLES - AND A CROCK OF THE HONEY, STRAINED."');
      } });
      if (ready) rows.push({ label: 'Collect your candles', sub: ready + ' ready', icon: 'beeswax_candles', pick: function () {
        var n = 0;
        s.dips = s.dips.filter(function (d) { if (d.ready <= Date.now() && BridgeInventory.addItem('beeswax_candles', 1)) { BridgeInventory.addItem('honey_crock', 1); n++; return false; } return true; });
        store(); sfx('pickup'); toast('Wick & Comb', n + ' bundle' + (n > 1 ? 's' : '') + ' of beeswax candles', 'from your own skeps'); maker(inter);
      } });
    }
    choose({ title: M.title, text: M.text, rows: rows.concat(sellRows(M.title, M.buy || {}, function () { maker(inter); })) });
  }

  // ---- your stall on the square, and Effie who keeps it --------------------------------------------------------------------
  // Effie, hired by the day, sells what you leave on the stall at market prices (half again Marlo's); Saturday's market
  // day brings the whole countryside in and she sells three times as fast. You see it in the square: the goods on the
  // counter, Effie behind it.
  var EFFIE_WAGE = 45, TERMS = [[1, 1], [3, 2.6], [7, 5.5]];
  var MARKET = { strawberry: 21, turnip: 18, carrot: 30, pumpkin: 140, sunflower: 48, apple: 8, honey: 38, egg: 15, large_egg: 26, milk: 44, golden_egg: 200,
                 wold_cheese: 24, farm_cheese: 60, flour: 22, moonflower: 70, moonmelon: 150, granola: 18, posy: 14, farm_cider: 72, wine: 120, starfruit: 380,
                 wheat: 6, beeswax_candles: 50, jam: 24 };
  function marketDay(t) { var d = new Date((t || Date.now()) - 5 * 3600000); return d.getUTCDay() === 6; }   // Saturday, ET
  function stall() { return s.stall || (s.stall = { stock: {}, till: 0, hired: 0, t: 0, sold: 0 }); }
  function stallTick(now) {
    var st = stall();
    if (!st.t) { st.t = now; return; }
    var t = st.t, STEPS = 3 * 60000, changed = false;
    while (t + STEPS <= now) {
      t += STEPS;
      if (!(st.hired > t)) continue;                                                 // nobody keeping it: covered over
      var ids = Object.keys(st.stock).filter(function (k) { return st.stock[k] > 0; });
      if (!ids.length) continue;
      var busy = marketDay(t) ? 0.9 : 0.35, h = hash01('stall:' + t);
      if (h > busy) continue;
      var id = ids[Math.floor(hash01('spick:' + t) * ids.length)], n = Math.min(st.stock[id], 1 + Math.floor(hash01('sn:' + t) * (marketDay(t) ? 4 : 2)));
      st.stock[id] -= n; if (!st.stock[id]) delete st.stock[id];
      st.till += (MARKET[id] || 12) * n; st.sold += n; changed = true;
    }
    st.t = t;
    if (changed) store();
  }
  setInterval(function () { stallTick(Date.now()); }, 30000);
  function marketStall() {
    stallTick(Date.now());
    var st = stall(), now = Date.now(), on = st.hired > now;
    var stocked = Object.keys(st.stock).filter(function (k) { return st.stock[k] > 0; });
    var have = Object.keys(MARKET).filter(function (k) { return count(k) > 0; });
    var load = typeof BridgeCountryside !== 'undefined' ? BridgeCountryside._s().hold : {};
    var loaded = Object.keys(load || {}).filter(function (k) { return MARKET[k] && load[k] > 0; });
    var rows = [];
    if (st.till > 0) rows.push({ label: 'Take the takings', sub: st.till + ' coins in the till', pick: function () {
      var n = st.till; st.till = 0; store(); pay(n, 'makers:stall').then(function () { sfx('coin'); toast('Your stall', '+' + n + ' coins', 'Thistlecombe market'); marketStall(); });
    } });
    rows.push({ label: on ? 'Effie\'s here for ' + left(st.hired - now) : 'Hire Effie to keep the stall', sub: EFFIE_WAGE + ' coins a day', face: null, pick: hireEffie });
    stocked.forEach(function (k) { rows.push({ label: 'Take back ' + nameOf(k), icon: k, sub: st.stock[k] + ' on the stall', pick: function () {
      var n = st.stock[k]; if (BridgeInventory.addItem(k, n)) { delete st.stock[k]; store(); sfx('pickup'); } marketStall(); } }); });
    have.forEach(function (k) { rows.push({ label: 'Lay out ' + nameOf(k), icon: k, sub: 'you have ' + count(k), note: MARKET[k] + ' ea', pick: function () {
      var n = count(k); BridgeInventory.removeItem(k, n); st.stock[k] = (st.stock[k] || 0) + n; store(); sfx('pickup'); marketStall(); } }); });
    loaded.forEach(function (k) { rows.push({ label: 'Unload ' + nameOf(k) + ' from the buggy', icon: k, sub: load[k] + ' in the back', note: MARKET[k] + ' ea', pick: function () {
      var n = BridgeCountryside.fromHold(k, load[k]); st.stock[k] = (st.stock[k] || 0) + n; store(); sfx('pickup'); marketStall(); } }); });
    choose({
      title: 'Your stall',
      text: 'A STALL OF YOUR OWN ON THISTLECOMBE SQUARE, A GREEN-AND-CREAM AWNING. ' + (marketDay() ? 'IT\'S MARKET DAY: THE WHOLE COUNTRYSIDE\'S IN. ' : 'MARKET DAY IS SATURDAY; THE REST OF THE WEEK IT\'S QUIETER. ') +
            (on ? 'EFFIE BRIGHT IS BEHIND IT, SELLING FOR YOU AT MARKET PRICES. ' : 'NOBODY\'S KEEPING IT - HIRE EFFIE AND SHE\'LL SELL WHAT YOU LEAVE, HERE OR NOT. ') +
            (stocked.length ? 'ON IT: ' + stocked.map(function (k) { return st.stock[k] + ' ' + nameOf(k).toUpperCase(); }).join(', ') + '.' : 'IT\'S BARE.') + (st.sold ? ' ' + st.sold + ' SOLD SO FAR.' : ''),
      rows: rows
    });
  }
  function left(ms) { var h = Math.round(ms / 3600000); return h >= 24 ? Math.round(h / 24) + (h >= 36 ? ' days' : ' day') : Math.max(1, h) + ' hours'; }
  function hireEffie() {
    choose({ title: 'Effie Bright', text: '"FOURTEEN AND THREE QUARTERS, AND I CAN ADD UP FASTER THAN MR PIKE. I\'LL KEEP YOUR STALL, SELL WHAT YOU LEAVE, AND PUT EVERY COIN IN THE TILL. ' + EFFIE_WAGE + ' A DAY - I\'M SAVING FOR A BICYCLE."',
             rows: TERMS.map(function (t) { var cost = Math.round(EFFIE_WAGE * t[1]); return { label: t[0] === 1 ? 'A day' : t[0] + ' days', note: cost + ' coins', pick: function () {
               charge(cost, 'makers:effie').then(function (r) {
                 if (!r.ok) return say('EFFIE', why(r));
                 var st = stall(); st.hired = Math.max(Date.now(), st.hired || 0) + t[0] * DAY; if (!st.t) st.t = Date.now(); store();
                 toast('Your stall', 'Effie keeps it', t[0] + (t[0] === 1 ? ' day' : ' days'));
                 say('EFFIE', '"BRILLIANT! LEAVE IT TO ME. I\'LL DO A SIGN. A GOOD SIGN."');
               });
             } }; }), closeLabel: 'Back' });
  }

  // ---- Verdant & Co.: produce to Arcadia's restaurants -----------------------------------------------------------------------
  // Three orders a day from Arcadia's kitchens (seeded by the date, the same for everyone), paid well over market; and
  // a crate on the next pod for anything else at a good price. Each order filled tells that chef your farm's name.
  var ORDERS = [
    { who: 'mori', where: 'Aurum, the Neon Royale', item: 'moonmelon', n: 2, x: 2.2, why: 'twin-moon melon for the tasting menu' },
    { who: 'miyu', where: 'Miyu\'s Noodles', item: 'egg', n: 12, x: 1.8, why: 'farm eggs for the ramen' },
    { who: 'miyu', where: 'Miyu\'s Noodles', item: 'carrot', n: 10, x: 1.7, why: 'carrots "that taste of dirt, in the good way"' },
    { who: 'mori', where: 'Aurum, the Neon Royale', item: 'farm_cheese', n: 2, x: 2.0, why: 'farmhouse cheese for the board' },
    { who: 'laurent', where: 'Aurum, the Neon Royale', item: 'moonflower', n: 4, x: 2.0, why: 'moonflowers for the tables' },
    { who: 'cook', where: 'Cyber Noodles', item: 'pumpkin', n: 3, x: 1.7, why: 'pumpkins for a curry nobody believes in' },
    { who: 'mori', where: 'Aurum, the Neon Royale', item: 'strawberry', n: 12, x: 1.8, why: 'strawberries for the soufflé' },
    { who: 'velvet', where: 'the Royale\'s lounge', item: 'farm_cider', n: 3, x: 1.8, why: 'farm cider, "for a song about orchards"' },
    { who: 'mori', where: 'Aurum, the Neon Royale', item: 'honey', n: 6, x: 1.8, why: 'honey for the glaze' },
    { who: 'miyu', where: 'Miyu\'s Noodles', item: 'flour', n: 4, x: 1.9, why: 'flour for hand-pulled noodles' },
    { who: 'laurent', where: 'Aurum, the Neon Royale', item: 'wine', n: 2, x: 1.9, why: 'Vinehallow wine for the cellar' },
    { who: 'cook', where: 'Cyber Noodles', item: 'milk', n: 6, x: 1.7, why: 'real milk for the tea' }
  ];
  var CRATE = 1.3;                                           // anything on the next pod: this much over Marlo's
  function day() { var d = new Date(Date.now() - 5 * 3600000); return d.getUTCFullYear() + '-' + (d.getUTCMonth() + 1) + '-' + d.getUTCDate(); }
  function todays() {
    var dd = day();
    if (!s.export || s.export.day !== dd) { s.export = { day: dd, done: [], shipped: (s.export && s.export.shipped) || 0, fame: (s.export && s.export.fame) || {} }; store(); }
    var seed = dd.split('-').reduce(function (a, b) { return a * 31 + +b; }, 11), picks = [], i = 0;
    while (picks.length < 3 && i < 50) { var j = Math.abs((seed * 9301 + 49297 * (i + 1)) % 233280) % ORDERS.length; if (picks.indexOf(j) < 0) picks.push(j); i++; }
    return picks;
  }
  function price(id) {
    var it = item(id);
    return MARKET[id] || (it && it.value ? it.value * 2 : 10);
  }
  function exporter() {
    var picks = todays(), ex = s.export;
    var load = typeof BridgeCountryside !== 'undefined' ? BridgeCountryside._s().hold : {};
    var rows = picks.map(function (j) {
      var o = ORDERS[j], got = count(o.item) + (load[o.item] || 0), done = ex.done.indexOf(j) >= 0, pay_ = Math.round(price(o.item) * o.x) * o.n;
      return { label: o.n + ' ' + nameOf(o.item) + ' - ' + o.where, icon: o.item, sub: done ? 'on the pod' : o.why + ' · you have ' + got, note: done ? '' : pay_ + ' coins',
               disabled: done || got < o.n, pick: function () { fill(j, pay_); } };
    });
    var have = Object.keys(MARKET).filter(function (k) { return count(k) > 0; });
    rows = rows.concat(have.map(function (k) { var each = Math.round(price(k) / 1.5 * CRATE); return { label: 'Crate up ' + nameOf(k), icon: k, sub: 'you have ' + count(k), note: each + ' ea', pick: function () {
      var n = count(k); BridgeInventory.removeItem(k, n); ex.shipped += n; store();
      pay(each * n, 'makers:export').then(function () { sfx('coin'); toast('Verdant & Co.', '+' + each * n + ' coins', n + ' ' + nameOf(k).toLowerCase() + ' to Arcadia'); exporter(); });
    } }; }));
    var fame = Object.keys(ex.fame || {}).length;
    choose({
      title: 'Verdant & Co.',
      text: 'CRATES STENCILLED FOR ARCADIA, A PACKING BENCH, CHILLED SHELVES, AND MS OKORO WITH HER CLIPBOARD. "THE POD GOES UP TO THE FREIGHTER EVERY EVENING; BY MIDNIGHT IT\'S ON A PLATE ON THE DISTRICT. THESE ARE TODAY\'S ORDERS FROM THE KITCHENS - THEY PAY FOR THE REAL THING."' +
            (fame ? '\n\n' + fame + ' OF ARCADIA\'S KITCHENS KNOW YOUR FARM BY NAME NOW.' : ''),
      rows: rows
    });
  }
  function fill(j, pay_) {
    var o = ORDERS[j], ex = s.export, need = o.n;
    var fromPack = Math.min(count(o.item), need);
    if (fromPack) BridgeInventory.removeItem(o.item, fromPack);
    need -= fromPack;
    if (need > 0 && typeof BridgeCountryside !== 'undefined') need -= BridgeCountryside.fromHold(o.item, need);
    ex.done.push(j); ex.fame[o.who] = (ex.fame[o.who] || 0) + 1; ex.shipped += o.n; store();
    pay(pay_, 'makers:order').then(function () {
      sfx('coin');
      toast('Verdant & Co.', '+' + pay_ + ' coins', o.where);
      if (typeof BridgeTalk !== 'undefined' && BridgeTalk.nudge) BridgeTalk.nudge(o.who, 1, 'sent ' + o.n + ' ' + nameOf(o.item).toLowerCase() + ' from their farm on Verdance, for ' + o.why);
      exporter();
    });
  }

  // ---- the ferry and the train: a little journey through the countryside ---------------------------------------------------
  var STOPS = {
    ferry: [{ id: 'verdance-market', name: 'Thistlecombe wharf', spawn: [12, 27] }, { id: 'verdance-mill', name: 'the mill hamlet', spawn: [6, 20] },
            { id: 'verdance-hill', name: 'Vinehallow landing', spawn: [5, 34] }],
    train: [{ id: 'verdance-east', name: 'Brambleford Halt', spawn: [37, 12] }, { id: 'verdance-market', name: 'Thistlecombe', spawn: [43, 13] }]
  };
  function travel(kind) {
    var here_ = BridgeWorld.getWorldId();
    if (kind === 'train' && !(typeof BridgeVillage !== 'undefined' && BridgeVillage.done('station')))
      return say(here_ === 'verdance-market' ? 'THISTLECOMBE STATION' : 'BRAMBLEFORD HALT', 'THE BRANCH LINE TO BRAMBLEFORD IS SHUT AT THE OTHER END - THE HALT WANTS REOPENING. (THE VILLAGE FUND, ON BRAMBLEFORD\'S GREEN.)');
    var stops = STOPS[kind].filter(function (st) { return st.id !== here_; });
    choose({ title: kind === 'train' ? 'The branch line' : 'The ferry', text: kind === 'train' ? 'THE LITTLE TANK ENGINE SIMMERS AT THE PLATFORM, ONE GREEN CARRIAGE BEHIND. A FEW MINUTES DOWN THE LINE.' :
             'OLD RUDD\'S CHAIN FERRY, UP AND DOWN THE WEND: "TUPPENCE, AND MIND THE DUCKS."',
             rows: stops.map(function (st) {
               var open = PLACES.indexOf(st.id) >= 0;
               return { label: st.name, sub: open ? (kind === 'train' ? '10 coins' : '6 coins') : 'not running there yet', disabled: !open, pick: function () { go(kind, st); } };
             }) });
  }
  function go(kind, st) {
    charge(kind === 'train' ? 10 : 6, 'makers:' + kind).then(function (r) {
      if (!r.ok) return say(kind === 'train' ? 'THE TRAIN' : 'THE FERRY', why(r));
      if (typeof BridgeCountryside !== 'undefined' && BridgeCountryside.journey) BridgeCountryside.journey(kind, function () { BridgeWorld.enterWorld(st.id, st.spawn); });
      else BridgeWorld.enterWorld(st.id, st.spawn);
    });
  }

  // ---- Vinehallow: the vines, the winery, the cellar where your casks age over real weeks ---------------------------------
  // Pick grapes from the estate's rows on the level (a basket a row each Verdance day, not in winter), press ten into a
  // cask at the winery, and it goes down to the cellar. It gets better the longer you leave it — real weeks: bottle it
  // young, or wait for a reserve, or a grand cru. A cask fills three bottles.
  var GRAPES = 10, WEEK = 7 * DAY;
  var VINTAGES = [{ weeks: 6, id: 'wine_grand', name: 'GRAND CRU' }, { weeks: 3, id: 'wine_fine', name: 'RESERVE' }, { weeks: 1, id: 'wine', name: 'VINEHALLOW RED' },
                  { weeks: 0, id: 'wine_young', name: 'YOUNG WINE' }];
  function vintage(age) { for (var i = 0; i < VINTAGES.length; i++) if (age >= VINTAGES[i].weeks * WEEK) return VINTAGES[i]; return VINTAGES[3]; }
  function vdayKey() { var T = typeof BridgeClock !== 'undefined' ? BridgeClock.time('verdance') : null; return T ? Math.round((Date.now() - T.t) / 60000) : 0; }   // which Verdance day (its start, in minutes)
  function winter() { var S = typeof BridgeClock !== 'undefined' ? BridgeClock.season('verdance') : null; return S && S.id === 'winter'; }
  function vines(inter) {
    s.picked = s.picked || {};
    if (winter()) return say('THE VINES', 'PRUNED BACK TO BARE KNUCKLES FOR THE WINTER, TIED IN ALONG THE WIRES. NOTHING TO PICK TILL SPRING.');
    var key = inter.row + ':' + vdayKey();
    if (s.picked[inter.row] === key) return say('THE VINES', 'YOU\'VE PICKED THIS ROW CLEAN TODAY. THE REST ARE STILL RIPENING - COME BACK TOMORROW (A VERDANCE DAY).');
    var n = 4 + Math.floor(Math.random() * 3);
    if (!BridgeInventory.addItem('grapes', n)) return say('THE VINES', 'NO ROOM IN YOUR PACK.');
    s.picked[inter.row] = key; store(); sfx('harvest');
    toast('Vinehallow', n + ' bunches of grapes', 'from the estate\'s rows');
  }
  function winery() {
    var rows = [{ label: nameOf('wine'), icon: 'wine', note: '48 coins', pick: function () { buy('VANE ESTATE', 'wine', 48, winery); } },
                { label: 'Press grapes into a cask', sub: GRAPES + ' grapes a cask · you have ' + count('grapes'), note: 'down to the cellar', disabled: count('grapes') < GRAPES, pick: function () {
                  var n = Math.floor(count('grapes') / GRAPES);
                  BridgeInventory.removeItem('grapes', n * GRAPES);
                  s.cellar = s.cellar || [];
                  for (var i = 0; i < n; i++) s.cellar.push({ laid: Date.now(), n: (s.cellar.length + 1) });
                  store(); sfx('pickup');
                  say('VANE ESTATE', '"INTO THE PRESS... AND DOWN TO THE CELLAR." ROSALIND CHALKS THE DATE ON ' + (n > 1 ? n + ' NEW CASKS' : 'A NEW CASK') + '. "A WEEK MAKES IT WINE. THREE, A RESERVE. SIX AND IT\'S A GRAND CRU - THE BEST THING THIS HILL MAKES. YOUR CHOICE WHEN YOU BOTTLE IT."');
                } }];
    choose({ title: 'Vane Estate', text: 'A LONG STONE BARN, THE PRESS AT ONE END, THE SMELL OF CRUSHED GRAPES AND OAK. ROSALIND VANE BUYS GRAPES, SELLS THE ESTATE\'S RED, AND WILL PRESS YOUR OWN PICKING INTO A CASK TO AGE IN HER CELLAR.',
             rows: rows.concat(sellRows('Vane Estate', { grapes: 9 }, winery)) });
  }
  function cellar() {
    var now = Date.now(), casks = s.cellar || [];
    if (!casks.length) return say('THE CELLAR', 'A COOL VAULT CUT INTO THE HILL, CASKS IN ROWS IN THE LAMPLIGHT, THE ESTATE\'S AND THE VILLAGE\'S. NONE OF THEM YOURS YET - PRESS SOME GRAPES AT THE WINERY.');
    choose({ title: 'The cellar', text: 'COOL, DIM AND QUIET, THE CASKS IN ROWS. YOURS HAVE YOUR NAME CHALKED ON THE END. EACH FILLS THREE BOTTLES WHEN YOU DRAW IT - AND THE LONGER IT\'S DOWN HERE, THE BETTER.',
             rows: casks.map(function (c, i) {
               var age = now - c.laid, v = vintage(age), wk = age / WEEK, next = VINTAGES.filter(function (x) { return x.weeks * WEEK > age; }).pop();
               return { label: 'Cask ' + (i + 1) + ': ' + v.name.toLowerCase().replace(/(^|\s)\w/g, function (m) { return m.toUpperCase(); }), icon: v.id,
                        sub: (wk < 1 ? Math.max(1, Math.round(age / DAY)) + ' days' : wk.toFixed(1) + ' weeks') + ' down' + (next ? ' · ' + next.name.toLowerCase() + ' in ' + Math.ceil((next.weeks * WEEK - age) / DAY) + ' days' : ''),
                        note: 'bottle it', pick: function () { draw(i); } };
             }) });
  }
  function draw(i) {
    var c = s.cellar[i], v = vintage(Date.now() - c.laid);
    choose({ title: 'Bottle it?', text: 'DRAW THIS CASK NOW AS ' + v.name + '? THREE BOTTLES. ' + (v.id === 'wine_grand' ? 'IT WON\'T GET ANY BETTER THAN THIS.' : 'LEAVE IT AND IT KEEPS GETTING BETTER.'),
             rows: [{ label: 'Bottle it', icon: v.id, pick: function () {
               if (!BridgeInventory.addItem(v.id, 3)) return say('THE CELLAR', 'NO ROOM IN YOUR PACK FOR THREE BOTTLES.');
               s.cellar.splice(i, 1); store(); sfx('pickup');
               toast('The cellar', '3 bottles of ' + nameOf(v.id), 'from your own picking');
             } }], closeLabel: 'Leave it longer' });
  }
  function tasting() {
    choose({ title: 'The tasting terrace', text: 'TABLES UNDER A PERGOLA OF VINES, THE WHOLE VALLEY BELOW: THE CHALK HORSE, THE DOWNS IN WAVES, THE SPIRE AT THISTLECOMBE, THE RIVER SHINING.',
             rows: [{ label: 'A glass of the red', icon: 'wine', note: '9 coins', pick: function () {
               charge(9, 'makers:glass').then(function (r) {
                 if (!r.ok) return say('THE TASTING TERRACE', why(r));
                 if (typeof BridgeInventory !== 'undefined') BridgeInventory.restoreEnergy(25);
                 say('THE TASTING TERRACE', 'DARK, SOFT, A LITTLE PEPPERY. YOU SIT WITH IT A LONG TIME AND WATCH THE LIGHT GO ACROSS THE DOWNS.');
               });
             } }, { label: 'Just sit', pick: function () { if (typeof BridgeInventory !== 'undefined') BridgeInventory.restoreEnergy(10);
               say('THE TASTING TERRACE', 'BEES IN THE VINE LEAVES OVERHEAD. SOMEONE\'S LAUGHING IN THE SQUARE. YOU COULD STAY HERE ALL DAY.'); } }] });
  }

  // ---- Wendmill: Tobias grinds your wheat; the bakehouse bakes your flour ----------------------------------------------------
  var GRIND = 3;
  function mill() {
    var rows = [{ label: 'Grind your wheat', sub: GRIND + ' wheat a sack of flour · you have ' + count('wheat'), disabled: count('wheat') < GRIND, pick: function () {
      var n = Math.floor(count('wheat') / GRIND);
      BridgeInventory.removeItem('wheat', n * GRIND);
      if (!BridgeInventory.addItem('flour', n)) { BridgeInventory.addItem('wheat', n * GRIND); return say('WEND MILL', 'NO ROOM IN YOUR PACK FOR THE FLOUR.'); }
      sfx('harvest'); toast('Wend Mill', n + ' sack' + (n > 1 ? 's' : '') + ' of flour', 'ground from your wheat');
      say('WEND MILL', 'TOBIAS TIPS YOUR WHEAT INTO THE HOPPER. THE WHOLE MILL RUMBLES - THE WHEEL, THE GEARS, THE BIG STONES - AND FLOUR POURS WARM INTO THE SACK. "THERE. YOUR OWN. BRIDGET\'LL PAY WELL FOR THAT."');
    } }, { label: nameOf('seed_wheat'), icon: 'seed_wheat', note: '6 coins', pick: function () { buy('WEND MILL', 'seed_wheat', 6, mill); } },
         { label: nameOf('flour'), icon: 'flour', note: '20 coins', pick: function () { buy('WEND MILL', 'flour', 20, mill); } }];
    choose({ title: 'Wend Mill', text: 'INSIDE IT\'S ALL NOISE AND FLOUR-DUST AND MOVING WOOD: THE GREAT SPUR WHEEL, THE STONES TURNING, SACKS GOING UP THROUGH THE TRAPS ON THE HOIST. TOBIAS GRINDS ANYONE\'S WHEAT - "THREE SHEAVES TO A SACK."',
             rows: rows.concat(sellRows('Wend Mill', { wheat: 7 }, mill)) });
  }
  function bakehouse() {
    choose({ title: 'The Bakehouse', text: 'A LOW STONE ROOM WITH A BREAD OVEN AS BIG AS A CART, AND MARTHA LUDD SLIDING LOAVES OUT ON A PEEL. BRING HER FLOUR AND SHE\'LL BAKE IT FOR YOU.',
             rows: [{ label: nameOf('country_loaf'), icon: 'country_loaf', note: '10 coins', pick: function () { buy('THE BAKEHOUSE', 'country_loaf', 10, bakehouse); } },
                    { label: 'Bake your flour', sub: 'a sack makes three loaves · you have ' + count('flour'), disabled: count('flour') < 1, pick: function () {
                      var n = count('flour'); BridgeInventory.removeItem('flour', n);
                      if (!BridgeInventory.addItem('country_loaf', n * 3)) { BridgeInventory.addItem('flour', n); return say('THE BAKEHOUSE', 'NO ROOM IN YOUR PACK.'); }
                      sfx('pickup'); toast('The Bakehouse', n * 3 + ' country loaves', 'from your own flour');
                    } }] });
  }

  // ---- in the square: your goods on the stall, Effie behind it --------------------------------------------------------------
  var effieSheet = null;
  function items(world, offX, offY, ts, now, sc) {
    if (BridgeWorld.getWorldId() !== 'verdance-market' || !s.stall) return [];
    var st = s.stall, ids = Object.keys(st.stock).filter(function (k) { return st.stock[k] > 0; }).slice(0, 6), out = [];
    var on = st.hired > Date.now();
    if (on) {
      if (!effieSheet) { effieSheet = new Image(); effieSheet.src = '/bridge/assets/characters/npc-effie.png'; }
      var ex = 17, ey = 19, fr = ey + 1 - 3 / 32;
      out.push({ footRow: fr, draw: function (c) {
        if (!effieSheet.complete || !effieSheet.naturalWidth) return;
        var col = [0, 1, 2, 1][Math.floor(now / 400) % 4], cx = Math.round(offX + (ex + 0.5) * ts), fy = Math.round(offY + fr * ts);
        BridgeScene.drawOccluded(c, sc, effieSheet, col * 32, 0, 32, 48, cx - 16, fy - 45, fr, offX, offY, BridgeScene.tintAt ? BridgeScene.tintAt(sc, world, ex, ey, now) : null, { x: cx, y: fy, rx: 8, ry: 3 }, null, 'auto');
      } });
    }
    if (ids.length) out.push({ footRow: 20.75, draw: function (c) {
      ids.forEach(function (id, i) {
        var it = item(id); if (!it || !it.draw) return;
        var x = Math.round(offX + (16.55 + i * 0.34) * ts), y = Math.round(offY + 19.95 * ts) - Math.round(ts * 0.56);
        c.save(); c.imageSmoothingEnabled = false; it.draw(c, x, y, Math.round(ts * 0.55)); c.restore();
      });
    } });
    return out;
  }

  function decorate(worldId, data) {
    if (worldId === 'verdance-downs') standTick(Date.now());
    if (worldId === 'verdance-market') {
      stallTick(Date.now());
      if (data.scene) data.scene.layers = { market: marketDay() ? 'on' : null };
      var st = s.stall;
      if (st && st.hired > Date.now() && data.collisions[19]) data.collisions[19][17] = 1;      // Effie stands behind it
    }
    if (worldId === 'verdance-east' && typeof BridgeVillage !== 'undefined' && BridgeVillage.done('station'))
      (data.interactions || []).forEach(function (it) { if (it.site === 'station') { it.type = 'train'; it.prompt = 'PRESS E FOR THE TRAIN'; } });
  }

  if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.register) {
    BridgeInteractions.register('farm_stand', stand, 'Look');
    BridgeInteractions.register('flower_farm', flowers, 'Browse');
    BridgeInteractions.register('flower_bed', flowerBed, 'Look');
    BridgeInteractions.register('cider_press', cider, 'Go in');
    BridgeInteractions.register('lane', lane, 'Follow');
    BridgeInteractions.register('maker', maker, 'Go in');
    BridgeInteractions.register('market_stall', marketStall, 'See to');
    BridgeInteractions.register('export', exporter, 'Go in');
    BridgeInteractions.register('ferry', function () { travel('ferry'); }, 'Board');
    BridgeInteractions.register('train', function () { travel('train'); }, 'Board');
    BridgeInteractions.register('vines', vines, 'Pick');
    BridgeInteractions.register('winery', winery, 'Go in');
    BridgeInteractions.register('cellar', cellar, 'Go down');
    BridgeInteractions.register('tasting', tasting, 'Sit');
    BridgeInteractions.register('mill', mill, 'Go in');
    BridgeInteractions.register('bakehouse', bakehouse, 'Go in');
  }
  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('verdance', { items: items });
  return { decorate: decorate, vintage: vintage, PLACES: PLACES, stand: stand, standTick: standTick, stallTick: stallTick, marketDay: marketDay, todays: todays, ORDERS: ORDERS, MARKET: MARKET, journal: function () { return { stand: s.stand, casks: s.casks.length, ledger: s.ledger }; },
           _s: function () { return s; }, reload: function () { s = load(); } };
})();
