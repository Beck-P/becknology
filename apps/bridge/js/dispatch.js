/**
 * BridgeDispatch — the morning dispatch on the desk in the captain's office (the empire plan's chunk 3): each Eastern-time
 * day, two to four small opportunities and troubles across your holdings, each with a choice that makes a small, real
 * difference. Seeded by the date and made once, the first time the day's asked for (so it fits what you own that morning):
 *
 *   buyer     a merchant at a port wants so many crates of a good by a day, for a fee well over what they cost: take it
 *             and it's a contract (js/trade.js, `dispatch: true`) — delivered at that port's harbourmaster by you, or
 *             carried by any captain on standing orders whose leg runs from a port that sells it (js/orders.js)
 *   tip       a broker's tip: a good cheap at one port and dear at another today — note it, or send a ship of yours
 *             with a captain on that loop
 *   blockade  pirates blockade a sea today and tomorrow (your ships): pay for an escort (safe, full speed), go the long
 *             way round (the default: safe, two fifths slower), or run it (more trouble, a quarter more for what she sells)
 *   storm     a storm will close a port tomorrow (your ships): lie up (the default) or run for it (two fifths more for
 *             what she sells, and a chance it costs her hull); your businesses on that island are quiet that day
 *   bid       a rival bids for one of your businesses: sell (BridgeBusiness.sellTo) or refuse (its staff hear of it and
 *             work the harder for three days)
 *   fair      a market day by one of your businesses: a tenth more trade today, a third more with extra hands
 *   lot       a wrecked trader's stores going cheap (your holm): buy them into the store for the Workshop
 *   bonus     a captain of yours asks for a bonus: their next three runs bring you 15% more
 *
 * Nothing needs deciding: what you leave is the default, and the day moves on. What's decided lasts in `fx` (what the
 * orders and businesses ask: `blockade(sea, ms)`, `closed(port, ms)`, `lift(business, ms)`).
 *
 *   BridgeDispatch.today()  .pick(itemId, key)  .unread()  .open(note)  .item(itemId)   test hooks: _day(d), _state()
 */
var BridgeDispatch = (function () {
  var KEY = 'bridge_dispatch', DAY = 86400000;
  var RIVALS = ['Lady Marchbank of the Exchange', 'the Gilt Lantern Company', 'old Corvin Rusk', 'a broker for the Crimson Combine', 'the Widow Tresize', 'Haskel & Daughters'];
  var LOTS = [['iron_bar', 12], ['oak_plank', 16], ['rope', 12], ['copper_sheet', 8], ['pitch', 10], ['sailcloth', 6], ['plank', 24]];
  var st = { day: null, items: [], picks: {}, read: false, fx: [] };
  try { st = Object.assign(st, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* fresh */ }
  st.items = st.items || []; st.picks = st.picks || {}; st.fx = st.fx || [];
  var force = null;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode */ } }
  function has(n) { return typeof window[n] !== 'undefined'; }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; }
  function shift() { return has('BridgeClock') && BridgeClock.etNow ? BridgeClock.etNow() - Date.now() : 0; }
  function etDay() { return force != null ? force : Math.floor((Date.now() + shift()) / DAY); }
  function dayStart(d) { return d * DAY - shift(); }                       // ET midnight, as a real moment
  function coins(n) { return Math.round(n).toLocaleString(); }
  function isles() { return has('BridgeVoyage') && BridgeVoyage._isles || {}; }
  function pname(id) { var I = isles(); return I[id] ? I[id].name : id; }
  function choose(spec) { if (has('BridgeInteractions') && BridgeInteractions.choose) BridgeInteractions.choose(spec); }
  function toast(a, b, c) { if (has('BridgeQuests') && BridgeQuests.toast) BridgeQuests.toast(a, b, c); }
  function sfx(n) { if (has('BridgeAudio') && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function wager(n, why) {
    return has('BridgeProgression') && BridgeProgression.wagerCoins ? Promise.resolve(BridgeProgression.wagerCoins(n, why)).then(function (r) { return r || { ok: false, reason: 'error' }; }, function () { return { ok: false, reason: 'error' }; })
                                                                   : Promise.resolve({ ok: false, reason: 'offline' });
  }
  function broke(r) { var x = r && r.reason; return x === 'offline' || x === 'no_client' || x === 'no_pilot' || x === 'error' ? 'NO WAY TO MOVE COINS RIGHT NOW.' : 'NOT ENOUGH COINS.'; }
  function myShips() { return has('BridgeFleet') ? BridgeFleet.all().filter(function (s) { return s.type !== 'sloop'; }) : []; }
  function myBiz() { return has('BridgeBusiness') ? BridgeBusiness.all().filter(function (d) { return BridgeBusiness.owned(d.id) && d.kind !== 'legacy' && !d.built; }) : []; }
  function captained() { return has('BridgeOrders') ? myShips().filter(function (s) { return BridgeOrders.captainOf(s.id); }) : []; }
  function weekday(localDue) {
    var T = BridgeTrade, d = new Date(Date.now() + (localDue - T.today()) * DAY);
    return localDue - T.today() <= 1 ? 'tomorrow' : d.toLocaleDateString('en-US', { weekday: 'long' });
  }

  // ---- the day's items ------------------------------------------------------------------------------------------------
  var MAKE = {
    buyer: function (d, k) {
      var T = has('BridgeTrade') ? BridgeTrade : null;
      if (!T) return null;
      var to = T.PORTS[Math.floor(k('to') * T.PORTS.length)];
      var goods = Object.keys(T.GOODS).filter(function (g) { return !T.GOODS[g].rare && (T.MARKET[to][g] || 1) >= 1.05 && T.PORTS.some(function (p) { return p !== to && T.stock(p).indexOf(g) >= 0; }); });
      if (!goods.length) return null;
      var good = goods[Math.floor(k('g') * goods.length)], hold = myShips().reduce(function (m, s) { return Math.max(m, BridgeFleet.effective(s).hold); }, 12);
      var n = Math.max(6, Math.min(60, Math.round((0.3 + k('n') * 0.4) * hold)));
      var from = T.PORTS.filter(function (p) { return p !== to && T.stock(p).indexOf(good) >= 0; }).sort(function (a, b) { return T.price(good, a, 'buy', n) - T.price(good, b, 'buy', n); })[0];
      var fee = Math.round(T.GOODS[good].base * n * (1.6 + k('f') * 0.6) / 10) * 10, due = T.today() + 2 + (k('d') > 0.5 ? 1 : 0);
      return { kind: 'buyer', title: 'A buyer at ' + pname(to), to: to, from: from, good: good, n: n, fee: fee, due: due,
               text: 'A MERCHANT AT ' + pname(to).toUpperCase() + ' WANTS ' + n + ' CRATES OF ' + T.name(good).toUpperCase() + ' BY ' + weekday(due).toUpperCase() + ', AND PAYS ' + coins(fee) +
                     ' OVER WHAT THEY COST YOU. ' + T.name(good).toUpperCase() + ' IS CHEAPEST AT ' + pname(from).toUpperCase() + '. HAND THEM OVER AT ' + pname(to).toUpperCase() + '\'S HARBOURMASTER - ' +
                     'OR A CAPTAIN OF YOURS WHOSE LOOP RUNS FROM A PORT THAT SELLS THEM TO ' + pname(to).toUpperCase() + ' CARRIES THEM.',
               choices: [{ key: 'take', label: 'Take it on' }, { key: 'pass', label: 'Pass' }] };
    },
    tip: function (d, k) {
      var T = has('BridgeTrade') ? BridgeTrade : null, rs = T ? T.routes(40) : [];
      if (!rs.length) return null;
      var r = rs[Math.min(rs.length - 1, Math.floor(k('r') * 3))], g = r.goods[0], each = Math.max(1, Math.round(r.profit / Math.max(1, r.crates)));
      var ch = captained().slice(0, 2).map(function (s) { return { key: 'send:' + s.id, label: 'Send the ' + s.name + ' on it' }; });
      return { kind: 'tip', title: 'A tip from the Exchange', a: r.from, b: r.to, good: g.good,
               text: 'A BROKER AT THE EXCHANGE LEANS IN: ' + T.name(g.good).toUpperCase() + ' IS CHEAP AT ' + pname(r.from).toUpperCase() + ' AND DEAR AT ' + pname(r.to).toUpperCase() +
                     ' TODAY - ABOUT ' + each + ' A CRATE CLEAR.' + (ch.length ? ' A SHIP OF YOURS WITH A CAPTAIN COULD RUN BETWEEN THE TWO.' : ''),
               choices: ch.concat([{ key: 'note', label: 'Make a note of it' }]) };
    },
    blockade: function (d, k) {
      var ships = myShips();
      if (!ships.length) return null;
      var sea = ['crimson', 'crimson', 'rose', 'sapphire'][Math.floor(k('s') * 4)], fee = 150 + 120 * ships.length;
      var ports = Object.keys(isles()).filter(function (id) { return isles()[id].pal === sea; }).map(pname).join(' and ');
      return { kind: 'blockade', title: 'Pirates in the ' + cap(sea) + ' Sea', sea: sea, fee: fee, dflt: 'reroute', dfltText: 'your captains go the long way round',
               fx: { kind: 'blockade', sea: sea, from: dayStart(d), until: dayStart(d + 2), choice: 'reroute' },
               text: 'BLACK SAILS: PIRATES ARE BLOCKADING THE ' + sea.toUpperCase() + ' SEA TODAY AND TOMORROW (' + ports.toUpperCase() + '). YOUR CAPTAINS CAN BUY AN ESCORT (' + coins(fee) +
                     '), GO THE LONG WAY ROUND - SAFE, BUT TWO FIFTHS SLOWER, AND WHAT THEY\'LL DO IF YOU SAY NOTHING - OR RUN IT: TROUBLE LIKELIER, BUT A PORT UNDER BLOCKADE PAYS A QUARTER MORE.',
               choices: [{ key: 'escort', label: 'Buy an escort (' + coins(fee) + ')' }, { key: 'reroute', label: 'Go the long way round' }, { key: 'run', label: 'Run the blockade' }] };
    },
    storm: function (d, k) {
      if (!myShips().length) return null;
      var P = has('BridgeTrade') ? BridgeTrade.PORTS.filter(function (p) { return p !== 'lumar-midnight'; }) : [];
      if (!P.length) return null;
      var port = P[Math.floor(k('p') * P.length)];
      var quiet = myBiz().filter(function (b) { return has('BridgeFleet') && BridgeFleet.islandOf(b.world) === port; });
      return { kind: 'storm', title: 'A storm on its way', port: port, dflt: 'stay', dfltText: 'your ships lie up till it\'s past', quiet: quiet.map(function (b) { return b.id; }),
               fx: { kind: 'closed', port: port, from: dayStart(d + 1), until: dayStart(d + 2), choice: 'stay' },
               text: 'THE GLASS IS FALLING: A STORM WILL CLOSE ' + pname(port).toUpperCase() + ' TOMORROW. YOUR CAPTAINS CAN LIE UP TILL IT\'S PAST - WHAT THEY\'LL DO IF YOU SAY NOTHING - ' +
                     'OR RUN FOR IT: A PORT CUT OFF PAYS TWO FIFTHS MORE, IF SHE GETS IN WITHOUT A KNOCK.' + (quiet.length ? ' ' + quiet.map(function (b) { return b.name; }).join(' AND ').toUpperCase() + ' WILL BE QUIET.' : ''),
               choices: [{ key: 'stay', label: 'Lie up till it\'s past' }, { key: 'run', label: 'Run for it' }] };
    },
    bid: function (d, k) {
      var mine = myBiz();
      if (!mine.length) return null;
      var b = mine[Math.floor(k('b') * mine.length)], amount = Math.round(b.price * (1.25 + k('a') * 0.5) / 50) * 50, who = RIVALS[Math.floor(k('w') * RIVALS.length)];
      return { kind: 'bid', title: 'An offer for ' + b.name, biz: b.id, amount: amount, rival: who,
               text: (who.charAt(0).toUpperCase() + who.slice(1)).toUpperCase() + ' OFFERS ' + coins(amount) + ' FOR ' + b.name.toUpperCase() + ' (IT WAS ' + coins(b.price) + ' TO BUY). SELL, AND ITS STAFF ARE LET GO WITH WHAT\'S WAITING THERE PAID OUT TO YOU; ' +
                     'REFUSE, AND THEY HEAR OF IT - THEY\'LL WORK THE HARDER FOR THREE DAYS.',
               choices: [{ key: 'sell', label: 'Sell it (' + coins(amount) + ')' }, { key: 'refuse', label: 'Refuse' }] };
    },
    fair: function (d, k) {
      var mine = myBiz();
      if (!mine.length) return null;
      var b = mine[Math.floor(k('b') * mine.length)];
      return { kind: 'fair', title: 'Market day by ' + b.name, biz: b.id, dflt: 'leave', dfltText: 'still a tenth more trade today',
               fx: { kind: 'lift', biz: b.id, from: dayStart(d), until: dayStart(d + 1), k: 1.1 },
               text: 'IT\'S MARKET DAY BY ' + b.name.toUpperCase() + ': THE STREET WILL BE BUSY ALL DAY. PUT ON EXTRA HANDS (60) AND IT TAKES A THIRD MORE; LEAVE IT, AND IT STILL TAKES A TENTH MORE.',
               choices: [{ key: 'hands', label: 'Extra hands (60)' }, { key: 'leave', label: 'Leave it' }] };
    },
    lot: function (d, k) {
      if (!has('BridgeHolm') || !BridgeHolm.owned()) return null;
      var L = LOTS[Math.floor(k('l') * LOTS.length)], it = has('BridgeItems') && BridgeItems.get(L[0]);
      if (!it) return null;
      var port = BridgeTrade.PORTS[Math.floor(k('p') * BridgeTrade.PORTS.length)], price = Math.max(20, Math.round((it.value || 6) * L[1] * 0.5 / 5) * 5);
      return { kind: 'lot', title: 'Stores going cheap', item: L[0], n: L[1], price: price, port: port,
               text: 'A WRECKED TRADER\'S STORES ARE GOING CHEAP ON THE QUAY AT ' + pname(port).toUpperCase() + ': ' + L[1] + ' ' + it.name.toUpperCase() + ' FOR ' + coins(price) + ', ABOUT HALF WHAT THEY\'RE WORTH. ' +
                     'BOUGHT, THEY\'RE CARRIED STRAIGHT TO THE STORE ON ' + BridgeHolm.name().toUpperCase() + ' FOR THE WORKSHOP.',
               choices: [{ key: 'buy', label: 'Buy them (' + coins(price) + ')' }, { key: 'pass', label: 'Pass' }] };
    },
    bonus: function (d, k) {
      var cs = has('BridgeOrders') ? BridgeOrders.captains().filter(function (p) { var s = myShips().filter(function (x) { return BridgeOrders.captainOf(x.id) === p; })[0]; return !!s; }) : [];
      if (!cs.length) return null;
      var p = cs[Math.floor(k('c') * cs.length)], ship = myShips().filter(function (x) { return BridgeOrders.captainOf(x.id) === p; })[0], amount = Math.max(50, Math.round(p.wage * 0.6 / 5) * 5);
      return { kind: 'bonus', title: p.name + ' asks a favour', captain: p.id, amount: amount,
               text: (p.name + ', ' + (p.title || 'captain').toLowerCase() + ' of the ' + ship.name + ', asks for a bonus of ' + coins(amount) + ': "give me a reason, and I\'ll squeeze every coin out of every port." ' +
                      'Paid, their next three runs bring you 15% more.').toUpperCase(),
               choices: [{ key: 'pay', label: 'Pay it (' + coins(amount) + ')' }, { key: 'no', label: 'Not now' }] };
    }
  };
  var WEIGHT = { buyer: 1, tip: 0.8, blockade: 1.1, storm: 1, bid: 0.6, fair: 0.9, lot: 0.9, bonus: 0.9 };
  function cap(t) { return String(t).charAt(0).toUpperCase() + String(t).slice(1); }
  function make(d) {
    var made = Object.keys(MAKE).map(function (kind) {
      var it = null;
      try { it = MAKE[kind](d, function (x) { return hash(d + ':' + kind + ':' + x); }); } catch (e) { it = null; }
      return it ? { it: it, w: hash(d + ':order:' + kind) / (WEIGHT[kind] || 1) } : null;
    }).filter(Boolean).sort(function (a, b) { return a.w - b.w; });
    var n = Math.min(made.length, 2 + (made.length >= 4 && hash(d + ':more') < 0.6 ? 1 : 0) + (made.length >= 6 && hash(d + ':most') < 0.35 ? 1 : 0));
    return made.slice(0, n).map(function (x, i) { x.it.id = 'd' + d + ':' + i; return x.it; });
  }
  function today() {
    var d = etDay();
    if (st.day !== d) {
      if (has('BridgeBusiness') && !BridgeBusiness.all().length) return [];   // (not till the businesses have loaded: it's made to fit them)
      st.day = d; st.picks = {}; st.read = false;
      st.items = make(d);
      var now = Date.now();
      st.fx = st.fx.filter(function (f) { return f.until > now; });
      st.items.forEach(function (it) { if (it.fx) { var f = Object.assign({ id: it.id }, it.fx); st.fx.push(f); } });
      st.items.forEach(function (it) { if (it.kind === 'storm' && it.quiet) it.quiet.forEach(function (b) { st.fx.push({ id: it.id + ':q', kind: 'lift', biz: b, from: it.fx.from, until: it.fx.until, k: 0.8 }); }); });
      save();
    }
    return st.items;
  }
  function item(id) { return today().filter(function (x) { return x.id === id; })[0] || null; }
  function fxOf(id) { return st.fx.filter(function (f) { return f.id === id; })[0] || null; }
  function decided(it) { return st.picks[it.id] || null; }
  function unread() { var list = today(); return st.read ? 0 : list.length; }
  function undecided() { return today().filter(function (it) { return !st.picks[it.id]; }).length; }

  /** Choose for an item. Resolves { ok, text }. */
  function pick(id, key) {
    var it = item(id);
    if (!it) return Promise.resolve({ ok: false, text: 'THAT\'S YESTERDAY\'S NEWS.' });
    if (st.picks[id]) return Promise.resolve({ ok: false, text: 'ALREADY DECIDED.' });
    function done(text) { st.picks[id] = key; save(); return { ok: true, text: text }; }
    var f = fxOf(id);
    switch (it.kind + ':' + key.split(':')[0]) {
      case 'buyer:take':
        BridgeTrade.take({ id: 'dispatch:' + it.id, from: it.from, to: it.to, good: it.good, n: it.n, fee: it.fee, due: it.due, dispatch: true });
        return Promise.resolve(done('TAKEN ON: ' + it.n + ' ' + BridgeTrade.name(it.good).toUpperCase() + ' TO ' + pname(it.to).toUpperCase() + ' BY ' + weekday(it.due).toUpperCase() + '. IT\'S IN THE LEDGER\'S CONTRACTS.'));
      case 'tip:send':
        var sid = key.split(':')[1], r = has('BridgeOrders') ? BridgeOrders.set(sid, { kind: 'trade', ports: [it.a, it.b] }) : { ok: false, reason: 'no captain' };
        if (!r.ok) return Promise.resolve({ ok: false, text: ('NOT NOW: ' + r.reason + '.').toUpperCase() });
        return Promise.resolve(done('ORDERS GIVEN: ' + pname(it.a).toUpperCase() + ' → ' + pname(it.b).toUpperCase() + ' AND BACK, TILL YOU SAY OTHERWISE.'));
      case 'tip:note':
        if (has('BridgeQuests') && BridgeQuests.note) BridgeQuests.note('A tip', BridgeTrade.name(it.good) + ': cheap at ' + pname(it.a) + ', dear at ' + pname(it.b), 'From a broker at the Exchange');
        return Promise.resolve(done('NOTED IN YOUR JOURNAL.'));
      case 'blockade:escort':
        return wager(it.fee, 'dispatch:escort').then(function (r) {
          if (!r.ok) return { ok: false, text: broke(r) };
          if (f) f.choice = 'escort';
          return done('AN ESCORT SAILS WITH YOUR SHIPS IN THE ' + it.sea.toUpperCase() + ' SEA TILL THE BLOCKADE LIFTS.');
        });
      case 'blockade:reroute': if (f) f.choice = 'reroute'; return Promise.resolve(done('YOUR CAPTAINS GO THE LONG WAY ROUND.'));
      case 'blockade:run': if (f) f.choice = 'run'; return Promise.resolve(done('YOUR CAPTAINS WILL RUN THE BLOCKADE. FAIR WINDS.'));
      case 'storm:stay': if (f) f.choice = 'stay'; return Promise.resolve(done('YOUR SHIPS LIE UP TILL THE STORM\'S PAST ' + pname(it.port).toUpperCase() + '.'));
      case 'storm:run': if (f) f.choice = 'run'; return Promise.resolve(done('YOUR CAPTAINS WILL RUN FOR ' + pname(it.port).toUpperCase() + ' THROUGH THE STORM.'));
      case 'bid:sell':
        return BridgeBusiness.sellTo(it.biz, it.amount).then(function (r) {
          if (!r.ok) return { ok: false, text: r.reason === 'not_yours' ? 'IT\'S NOT YOURS ANY MORE.' : 'NO WAY TO MOVE COINS RIGHT NOW.' };
          sfx('coin');
          return done('SOLD, FOR ' + coins(r.amount) + ' WITH WHAT WAS WAITING THERE.');
        });
      case 'bid:refuse':
        st.fx.push({ id: it.id, kind: 'lift', biz: it.biz, from: Date.now(), until: Date.now() + 3 * DAY, k: 1.1 });
        return Promise.resolve(done('REFUSED. THE STAFF HEARD - THEY\'RE WORKING THE HARDER FOR IT.'));
      case 'fair:hands':
        return wager(60, 'wages:dispatch').then(function (r) {
          if (!r.ok) return { ok: false, text: broke(r) };
          if (f) f.k = 1.33;
          return done('EXTRA HANDS ON FOR MARKET DAY.');
        });
      case 'fair:leave': return Promise.resolve(done('LEFT AS IT IS: STILL A BUSY DAY.'));
      case 'lot:buy':
        return wager(it.price, 'material:dispatch').then(function (r) {
          if (!r.ok) return { ok: false, text: broke(r) };
          if (has('BridgeHolm')) BridgeHolm.storeAdd(it.item, it.n);
          sfx('coin');
          return done(it.n + ' ' + (BridgeItems.get(it.item) || { name: it.item }).name.toUpperCase() + ' ON THEIR WAY TO THE STORE ON ' + BridgeHolm.name().toUpperCase() + '.');
        });
      case 'bonus:pay':
        return wager(it.amount, 'wages:bonus').then(function (r) {
          if (!r.ok) return { ok: false, text: broke(r) };
          if (has('BridgeOrders')) BridgeOrders.bonus(it.captain, 3);
          return done('PAID. THEIR NEXT THREE RUNS BRING YOU 15% MORE.');
        });
      default:
        return Promise.resolve(done('SO BE IT.'));
    }
  }

  // ---- what the orders and businesses ask ------------------------------------------------------------------------------
  function at(kind, ms, match) {
    ms = ms == null ? Date.now() : ms;
    today();
    for (var i = 0; i < st.fx.length; i++) { var f = st.fx[i]; if (f.kind === kind && f.from <= ms && ms < f.until && match(f)) return f; }
    return null;
  }
  function blockade(sea, ms) { var f = at('blockade', ms, function (x) { return x.sea === sea; }); return f ? { choice: f.choice || 'reroute', until: f.until } : null; }
  function closed(port, ms) { var f = at('closed', ms, function (x) { return x.port === port; }); return f ? { choice: f.choice || 'stay', until: f.until } : null; }
  function lift(biz, ms) {
    ms = ms == null ? Date.now() : ms;
    if (!st.fx.length) return 1;
    var k = 1;
    st.fx.forEach(function (f) { if (f.kind === 'lift' && f.biz === biz && f.from <= ms && ms < f.until) k *= f.k || 1; });
    return k;
  }

  // ---- the desk: reading it, choosing --------------------------------------------------------------------------------------
  function px(g, u, c, r) { g.fillStyle = c; for (var i = 0; i < r.length; i++) g.fillRect(r[i][0] * u, r[i][1] * u, r[i][2] * u, r[i][3] * u); }
  var ICON = {
    buyer: function (g, u) { px(g, u, '#3a2410', [[3, 7, 18, 13]]); px(g, u, '#9a6a3a', [[4, 8, 16, 11]]); px(g, u, '#c8965a', [[4, 8, 16, 2], [11, 8, 2, 11]]); px(g, u, '#5a3a1a', [[4, 13, 16, 1]]); },
    tip: function (g, u) { px(g, u, '#e8dcc0', [[4, 4, 14, 17]]); px(g, u, '#6a5a40', [[6, 7, 9, 1], [6, 10, 10, 1], [6, 13, 8, 1]]); px(g, u, '#f0ece0', [[15, 2, 2, 12]]); px(g, u, '#3a2a1a', [[16, 14, 1, 4]]); },
    blockade: function (g, u) { px(g, u, '#3a2a1a', [[5, 3, 2, 19]]); px(g, u, '#141418', [[7, 4, 13, 9]]); px(g, u, '#e8e8e0', [[11, 6, 4, 3], [12, 10, 2, 1]]); px(g, u, '#141418', [[12, 7, 1, 1], [14, 7, 1, 1]]); },
    storm: function (g, u) { px(g, u, '#5a6478', [[4, 6, 16, 7], [7, 4, 9, 3]]); px(g, u, '#8a94a8', [[5, 6, 12, 2]]); px(g, u, '#f0d040', [[12, 13, 3, 2], [10, 15, 3, 2], [11, 17, 2, 3]]); },
    bid: function (g, u) { px(g, u, '#e8dcc0', [[4, 5, 16, 14]]); px(g, u, '#c8b890', [[4, 5, 16, 2]]); px(g, u, '#a02a20', [[10, 11, 5, 5]]); px(g, u, '#d84a3a', [[11, 12, 3, 3]]); },
    fair: function (g, u) { px(g, u, '#3a2a1a', [[2, 5, 20, 1]]); [['#e05a4a', 3], ['#f0c040', 8], ['#58b0e8', 13], ['#88e070', 18]].forEach(function (f) { px(g, u, f[0], [[f[1], 6, 4, 3], [f[1] + 1, 9, 2, 2]]); }); px(g, u, '#9a6a3a', [[5, 14, 14, 6]]); px(g, u, '#f0e0c0', [[5, 12, 14, 2]]); },
    lot: function (g, u) { px(g, u, '#3a3a44', [[3, 11, 9, 9], [12, 13, 9, 7]]); px(g, u, '#7a7a8a', [[4, 12, 7, 7], [13, 14, 7, 5]]); px(g, u, '#a8a8b8', [[4, 12, 7, 1], [13, 14, 7, 1]]); px(g, u, '#9a6a3a', [[6, 5, 10, 6]]); },
    bonus: function (g, u) { px(g, u, '#7a5a18', [[6, 5, 12, 14]]); px(g, u, '#e8b840', [[7, 6, 10, 12]]); px(g, u, '#fff0a0', [[8, 7, 3, 3]]); px(g, u, '#7a5a18', [[11, 9, 2, 6]]); }
  };
  function icon(kind) { return function (g, n) { (ICON[kind] || ICON.tip)(g, n / 24); }; }
  function dateline() {
    var d = new Date(etDay() * DAY + 12 * 3600000);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
  }
  function choiceLabel(it, key) { var c = (it.choices || []).filter(function (x) { return x.key === key; })[0]; return c ? c.label : key; }
  function open(note) {
    var list = today();
    st.read = true; save();
    var rows = list.map(function (it) {
      var k = decided(it);
      return { label: it.title, draw: icon(it.kind), sub: k ? 'Decided: ' + choiceLabel(it, k).replace(/ \(.*\)$/, '') : it.dfltText ? 'Left alone, ' + it.dfltText : 'Yours to decide',
               note: k ? '✓' : 'read', pick: function () { view(it.id); } };
    });
    choose({ title: 'The morning dispatch', text: note || (dateline().toUpperCase() + '. ' + (list.length ? list.length + ' THINGS ACROSS YOUR HOLDINGS THIS MORNING. NOTHING HERE HAS TO BE DECIDED: WHAT YOU LEAVE GOES THE SAFE WAY, AND TOMORROW BRINGS MORE.' : 'QUIET THIS MORNING.')),
             rows: rows, closeLabel: 'Done' });
  }
  function view(id, note) {
    var it = item(id);
    if (!it) { open(); return; }
    var k = decided(it);
    choose({ title: it.title, text: note || (it.text + (k ? '\n\nDECIDED: ' + choiceLabel(it, k).toUpperCase() + '.' : '')),
             buttons: (it.choices || []).map(function (c) {
               return { label: c.label, disabled: !!k, act: function () {
                 pick(id, c.key).then(function (r) {
                   if (r.ok) { sfx('open'); toast('Dispatch', it.title, choiceLabel(it, c.key).replace(/ \(.*\)$/, '')); open(r.text); }
                   else view(id, r.text);
                 });
               } };
             }).concat([{ label: 'Back', act: function () { open(); } }]), closeLabel: 'Done' });
  }

  return { today: today, item: item, pick: pick, unread: unread, undecided: undecided, decided: function (id) { return st.picks[id] || null; }, open: open, view: view, icon: icon,
           blockade: blockade, closed: closed, lift: lift, choiceLabel: choiceLabel, dateline: dateline,
           _day: function (d) { force = d; st.day = null; }, _state: function () { return st; } };
})();
