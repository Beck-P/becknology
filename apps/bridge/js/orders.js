/**
 * BridgeOrders — captains and their standing orders (the empire plan's chunk 3, _claude_docs/spec-empire.md).
 *
 * Beck: "an economic engine across worlds… hire people, move toward automation… manage it all from the office". Any
 * ship of yours but the sloop can have a CAPTAIN — a person with a face, a grade and a wage, on the business payroll
 * like the Workshop's smiths (BridgeBusiness.engage, `at: 'captain'`) — and a captain sails a STANDING ORDER that
 * repeats by itself:
 *
 *   trade loop   round two to four ports you choose (or one of the day's best loops): at each port she buys what the
 *                next one wants and sells it there — js/trade.js prices, and a glut of her own on a market she keeps
 *                selling into, which wears off as any glut does. From wherever she lies: if that isn't on the loop, she
 *                sails to its first port, trading on the way if it pays (the holm's voyages and BridgeTrade.circuits,
 *                generalised)
 *   supply run   between your own holdings: out of the holm's store (the warehouse: BridgeHolm.stored) — and the catch in
 *                her own fish hold — into one of your businesses' stock (fish and farm goods to the stalls and taverns:
 *                BridgeBusiness.supply; never more than two days' worth), and home again with materials bought at that
 *                port for the Workshop (into the store, where js/workshop.js breaks the crates open); or a run for the
 *                Workshop alone
 *
 * It's worked out from the clock, leg by leg (`advance`: every 30 s, and whenever anything reads it, up to a fortnight
 * back), so it runs while you're away like the farm hands and the holm's voyages. A leg is her passage there and back
 * again's worth of sailing plus a day's loading (`legMins`, an hour and a half or two); it rolls its own trouble by sea
 * (`risk`: js/holm.js DANGER, the captain's grade, the weather, the daily dispatch's blockades) and her guns and fighters
 * decide it — beaten off, a bounty and a knock; not, a third of the cargo gone and a worse one. A hull under 40% is
 * mended at the next yard (the yard's price, charged to you) while she lies there an hour. The profit of every leg is
 * banked to you (`orders:trade`, js/treasury.js counts it as a trade run); materials and repairs are charged
 * (`orders:supply`, `repair:orders`) — with no coins to pay, the captain stops buying until there are. A run (once
 * round the loop) is reported in the ledger and on the office's chart table, where every order is a live line.
 *
 * A ship on orders is away (`ship.away.order`), so nothing else takes her; stopping lets her finish the leg she's on
 * and lie at that port. Nothing needs you for it to work: a captain unpaid, or without a ship, or a supply run with
 * nothing to carry just waits, and the dispatch's choices all have a safe default.
 *
 * Grades (GRADES): a mate (loops of two ports, 60% of a run's profit to you — the rest is wages and wear, as on the
 * holm's voyages), a captain (three ports, 68%, a fifth less trouble; once you have two ships, or a mate has run five
 * loops), a master (four ports, 76%, two fifths less trouble, and better in a fight; three ships, or twenty loops run).
 * Three look for a ship each Eastern-time day (`candidates`), hired in the office or from the ledger.
 *
 *   BridgeOrders.candidates()  .hire(cand, shipId)  .captains()  .captainOf(shipId)  .assign(staffId, shipId)  .dismiss(id)
 *   .get(shipId)  .set(shipId, spec)  .stop(shipId)  .resume(shipId)  .list()  .routes()  .estimate(shipId, spec)
 *   .loops(shipId)  .line(ship)  .summary()  .open(note) — the screens (the office's chart table, the ledger)
 *   .captainRow(staff) (the ledger and the staff board)  .advance()   test hooks: _age(ms), _state()
 */
var BridgeOrders = (function () {
  var KEY = 'bridge_orders', PLACE = 'captain', HOLM = 'lumar-holm';
  var BACK = 14 * 86400000, MIN = 60000, HOUR = 3600000;
  var GRADES = {
    mate:    { name: 'Mate', wage: [120, 170], share: 0.6, risk: 1.0, teeth: 0, ports: 2, colour: 'white',
               short: 'loops of two ports · 60% of every run to you' },
    captain: { name: 'Captain', wage: [280, 380], share: 0.68, risk: 0.8, teeth: 0.05, ports: 3, colour: 'gold',
               short: 'loops of up to three ports · 68% of every run to you · a fifth less trouble' },
    master:  { name: 'Master', wage: [650, 850], share: 0.76, risk: 0.6, teeth: 0.12, ports: 4, colour: 'purple',
               short: 'loops of up to four ports · 76% of every run to you · two fifths less trouble, and a hard fight' }
  };
  var NAMES = ['Hester Vane', 'Jory Penhallow', 'Morwenna Keast', 'Silas Treloar', 'Elowen Pascoe', 'Kit Rowse', 'Demelza Hocking',
               'Ned Polglase', 'Wenna Carne', 'Jago Trewin', 'Loveday Kitto', 'Perran Hext', 'Senara Nance', 'Tobias Rule', 'Mabyn Couch', 'Ruan Tonkin'];
  var SAYINGS = ['I know every rock between here and the Teeth.', 'Give me a fair wind and a full hold and I\'ll ask for nothing else. Except my wages.',
                 'My mother sailed the Crimson. I sail it better.', 'A dry hold is a sad hold.', 'Salt fish south, rum north - the sea does the sums.',
                 'I sleep through the day. The night watch is mine.', 'Every port has a price, and I know most of them.', 'I\'ve never lost a cargo I couldn\'t talk my way out of losing.'];
  var COLOURS = ['#f0c848', '#68d0f0', '#f088b0', '#88e070', '#c8a0ff', '#f8a050'];   // each order's line on the chart table
  var DANGER0 = { 'lumar-crimson': 0.35, 'lumar-cinder': 0.38, 'lumar-midnight': 0.4, 'lumar-rose': 0.12, 'lumar-sapphire': 0.12 };
  var STOCK_DAYS = 48;                                    // a supply run keeps a business in two days' stock, no more
  var CRATES = { timber: 1, glassware: 1, spore_silk: 1, blackpowder: 1, roseite: 1 };   // what a run can bring the Workshop

  var st = load();
  function load() {
    var d = {};
    try { d = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { d = {}; }
    return { cap: d.cap || {}, ord: d.ord || {}, bank: d.bank || 0, costs: d.costs || [], debt: !!d.debt, jobs: d.jobs || {},
             log: d.log || [], runs: d.runs || 0, made: d.made || 0, n: d.n || 0 };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode */ } }

  function F() { return typeof BridgeFleet !== 'undefined' ? BridgeFleet : null; }
  function T() { return typeof BridgeTrade !== 'undefined' ? BridgeTrade : null; }
  function H() { return typeof BridgeHolm !== 'undefined' ? BridgeHolm : null; }
  function B() { return typeof BridgeBusiness !== 'undefined' ? BridgeBusiness : null; }
  function D() { return typeof BridgeDispatch !== 'undefined' ? BridgeDispatch : null; }
  function choose(spec) { if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.choose) BridgeInteractions.choose(spec); }
  function toast(a, b, c) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(a, b, c); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; }
  function etDay() { return Math.floor((typeof BridgeClock !== 'undefined' && BridgeClock.etNow ? BridgeClock.etNow() : Date.now()) / 86400000); }
  function isles() { return typeof BridgeVoyage !== 'undefined' && BridgeVoyage._isles || {}; }
  function pname(id) { var I = isles(); return I[id] ? I[id].name : id === 'workshop' ? 'the Workshop' : id; }
  function seaOf(id) { var I = isles(); return I[id] ? I[id].pal : 'emerald'; }
  function danger() { return (H() && H().DANGER) || DANGER0; }
  function gname(id) { return T() ? T().name(id) : id; }
  function coins(n) { return Math.round(n).toLocaleString(); }
  function hm(mins) { mins = Math.max(1, Math.round(mins)); return mins < 60 ? mins + ' min' : mins % 60 && mins < 600 ? Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm' : Math.round(mins / 60) + 'h'; }
  function ago(ms) { var m = Math.max(1, Math.round((Date.now() - ms) / MIN)); return m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago'; }
  function note(t) { st.log.unshift({ at: Date.now(), t: t }); st.log = st.log.slice(0, 30); }

  // ---- captains ---------------------------------------------------------------------------------------------------
  function ships() { return F() ? F().all().filter(function (s) { return s.type !== 'sloop'; }) : []; }
  function ship(id) { return F() ? F().get(id) : null; }
  function staff() { return B() && B().staff ? B().staff(PLACE) : []; }
  function person(id) { return staff().filter(function (p) { return p.id === id; })[0] || null; }
  function capOf(id) { return st.cap[id] || (st.cap[id] = { ship: null, runs: 0, made: 0, bonus: 0 }); }
  function captainOf(shipId) {
    var list = staff();
    for (var i = 0; i < list.length; i++) if (st.cap[list[i].id] && st.cap[list[i].id].ship === shipId) return list[i];
    return null;
  }
  function gradeOf(p) { return GRADES[p && p.grade] || GRADES.mate; }
  function unpaid(p) { return !!p && p.missed > 0; }
  function ashore(p) { var c = st.cap[p.id]; return !c || !c.ship || !ship(c.ship); }
  function faceOf(p) { return { seed: p.name + ':' + p.key, style: 'coat', colour: gradeOf(p).colour }; }
  function perk(p) { return gradeOf(p).short; }
  function lockOf(g) {
    var n = ships().length;
    if (g === 'captain' && n < 2 && st.runs < 5) return 'won\'t sign on till you have two ships, or a mate of yours has run five loops';
    if (g === 'master' && n < 3 && st.runs < 20) return 'won\'t sign on till you have three ships, or your captains have run twenty loops';
    return null;
  }
  /** Who's looking for a ship today: a mate, a captain and a master, by the Eastern-time day. */
  function candidates() {
    var day = etDay(), taken = B() && B().staff ? B().staff().map(function (p) { return p.key; }) : [], used = [];
    return ['mate', 'captain', 'master'].map(function (g, i) {
      var k = 'cap:' + day + ':' + i, G = GRADES[g], j = Math.floor(hash(k + 'n') * NAMES.length);
      while (used.indexOf(NAMES[j]) >= 0) j = (j + 1) % NAMES.length;
      used.push(NAMES[j]);
      var c = { key: k, grade: g, tier: g, title: G.name, name: NAMES[j], wage: Math.round((G.wage[0] + (G.wage[1] - G.wage[0]) * hash(k + 'w')) / 5) * 5,
                skill: 0.95 + hash(k + 's') * 0.15, taken: taken.indexOf(k) >= 0, locked: lockOf(g) };
      c.face = faceOf(c);
      return c;
    });
  }
  /** Hire one (their first day's wage now, js/business.js engage), aboard `shipId` if she has no captain. */
  function hire(c, shipId) {
    if (!B() || !B().engage) return Promise.resolve({ ok: false, reason: 'offline' });
    if (c.locked) return Promise.resolve({ ok: false, reason: 'locked' });
    if (!ships().length) return Promise.resolve({ ok: false, reason: 'no_ship' });
    return B().engage(PLACE, c).then(function (r) {
      if (!r || !r.ok) return r || { ok: false, reason: 'error' };
      var cp = capOf(r.staff.id), s = shipId && ship(shipId);
      cp.ship = s && s.type !== 'sloop' && !captainOf(shipId) ? shipId : null;
      note(c.name + ' signed on as ' + c.title.toLowerCase() + (cp.ship ? ' of the ' + s.name : ''));
      save();
      advance();
      return r;
    });
  }
  /** Put a captain aboard a ship (null: ashore). Whoever captained her goes ashore. */
  function assign(staffId, shipId) {
    var p = person(staffId);
    if (!p) return false;
    if (shipId) { var was = captainOf(shipId); if (was && was.id !== staffId) capOf(was.id).ship = null; }
    capOf(staffId).ship = shipId || null;
    save();
    advance();
    return true;
  }
  function dismiss(staffId) {
    var p = person(staffId);
    if (p && B()) B().dismiss(staffId);
    delete st.cap[staffId];
    if (p) note(p.name + ' let go');
    save();
  }

  // ---- the orders ---------------------------------------------------------------------------------------------------
  function loopOf(o) { return o.kind === 'supply' ? [HOLM, o.port] : o.ports; }
  function nextTo(o, at) { var L = loopOf(o), i = L.indexOf(at); return i < 0 ? L[0] : L[(i + 1) % L.length]; }
  function markets() { return T() ? T().PORTS.slice() : []; }
  function harbour(id) { return (markets().indexOf(id) >= 0 && id !== 'lumar-midnight') || (id === HOLM && !!H() && H().built('dock')); }
  function weather(t) { var w = typeof BridgeWeather !== 'undefined' && BridgeWeather.at ? BridgeWeather.at('lumar', t) : null; return w && w.k > 0.4 ? w.kind : 'fair'; }
  function blockOf(a, b, t) { var d = D(); return d && d.blockade ? d.blockade(seaOf(a), t) || d.blockade(seaOf(b), t) : null; }
  function closedAt(id, t) { var d = D(); return d && d.closed ? d.closed(id, t) : null; }
  function bizOk(id) {
    var b = B(), d = b && b.get(id);
    return !!d && b.owned(id) && !!d.stock && !!F() && markets().indexOf(F().islandOf(d.world)) >= 0 && F().islandOf(d.world) !== 'lumar-midnight';
  }
  /** Why an order can't be given (null if it can). */
  function check(s, spec) {
    if (!s || s.type === 'sloop') return 'the sloop goes where you go';
    if (!captainOf(s.id)) return 'she needs a captain first';
    if (!spec) return 'no orders';
    if (spec.kind === 'trade') {
      var P = spec.ports || [], M = markets(), max = gradeOf(captainOf(s.id)).ports;
      if (P.length < 2) return 'a loop needs two ports at least';
      if (P.length > max) return gradeOf(captainOf(s.id)).name.toLowerCase() + 's sail loops of ' + max + ' ports at most';
      for (var i = 0; i < P.length; i++) { if (M.indexOf(P[i]) < 0) return pname(P[i]) + ' has no market'; if (P.indexOf(P[i]) !== i) return 'each port once'; }
      return null;
    }
    if (spec.kind === 'supply') {
      if (!H() || !H().owned() || !H().built('dock')) return 'supply runs sail from your holm: rebuild its dock first';
      if (spec.to === 'workshop') {
        if (typeof BridgeWorkshop === 'undefined' || !BridgeWorkshop.built()) return 'there\'s no workshop on your holm yet';
        if (!spec.bring) return 'a run for the Workshop has to bring something';
      } else if (!bizOk(spec.to)) return 'not a business of yours a ship can reach';
      if (spec.bring && (!T() || T().stock(spec.port).indexOf(spec.bring) < 0)) return pname(spec.port) + ' doesn\'t sell ' + gname(spec.bring).toLowerCase();
      if (!spec.port || markets().indexOf(spec.port) < 0) return 'no port to sail to';
      return null;
    }
    return 'no such orders';
  }
  function nextColour() {
    var used = Object.keys(st.ord).map(function (k) { return st.ord[k].colour; });
    return COLOURS.filter(function (c) { return used.indexOf(c) < 0; })[0] || COLOURS[st.n % COLOURS.length];
  }
  /** Give a ship a standing order: { kind: 'trade', ports: [...] } or { kind: 'supply', to: business id | 'workshop',
   *  port, bring: good | null, bringN }. She starts from where she lies (or once the leg she's on is done). */
  function set(shipId, spec) {
    advance();
    if (spec && spec.kind === 'supply' && spec.to !== 'workshop' && B() && B().get(spec.to) && F()) spec = Object.assign({}, spec, { port: F().islandOf(B().get(spec.to).world) });
    var s = ship(shipId), why = check(s, spec);
    if (!why && s.away && !s.away.order) why = 'she\'s at sea — give her orders once she\'s in';
    if (why) return { ok: false, reason: why };
    var old = st.ord[shipId];
    if (s.away && s.away.order && !(old && old.leg)) lie(s, s.away.to);
    st.n++;
    var o = { kind: spec.kind, ports: spec.kind === 'trade' ? spec.ports.slice() : null, to: spec.to || null, port: spec.port || null,
              bring: spec.bring || null, bringN: spec.bringN || 10, since: Date.now(), runs: 0, made: 0, legs: 0, run: 0, runStory: '', last: [],
              glut: old ? old.glut : {}, colour: old ? old.colour : nextColour(), leg: old && old.leg ? old.leg : null, wait: null, stop: false, story: '', units: 0 };
    if (old) o.last = old.last.slice();                        // (her runs so far stay in her book)
    st.ord[shipId] = o;
    var a = F().active && F().active().ship;                    // the ship you were sailing goes back to the sloop
    if (a && a.id === shipId) { var sl = F().all().filter(function (x) { return x.type === 'sloop'; })[0]; if (sl) F().sail(sl.id); }
    note('The ' + s.name + ': ' + orderName(o));
    save();
    if (!o.leg) begin(s, o, Date.now());
    save(); F().save();
    return { ok: true };
  }
  /** She finishes the leg she's on and lies at that port (at once if she's lying somewhere already). */
  function stop(shipId) {
    var o = st.ord[shipId], s = ship(shipId);
    if (!o) return false;
    if (o.leg && s && s.away && s.away.order) o.stop = true;
    else { delete st.ord[shipId]; if (s) note('The ' + s.name + ' is off her orders'); }
    save();
    return true;
  }
  function resume(shipId) {
    var o = st.ord[shipId], a = F() && F().active && F().active().ship;
    if (!o) return;
    if (a && a.id === shipId) { var sl = F().all().filter(function (x) { return x.type === 'sloop'; })[0]; if (sl) F().sail(sl.id); }   // (handed back to her captain)
    o.wait = null; o.stop = false; save(); advance();
  }

  // ---- a leg: where, what, how long, how risky -------------------------------------------------------------------------
  function legMins(s, from, to, crates, t) {
    var I = isles(), a = I[from], b = I[to], d = a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0.5;
    var sp = F().effective(s), short = F().crewOn(s.id).length < F().spec(s.type).crew;
    var m = (12 + 50 * d) / (sp.vmax / 4.6) * (short ? 1.5 : 1) * 1.5 + 35 + (crates || 0) / 6;   // under sail, and a morning's loading
    var w = weather(t);
    if (w === 'storm') m *= 1.25; else if (w === 'fog' && !compass()) m *= 1.1;   // (the Storm Compass: fog doesn't hold them)
    var bl = blockOf(from, to, t);
    if (bl && bl.choice === 'reroute') m *= 1.4;             // the long way round
    return Math.round(m);
  }
  function compass() { return typeof BridgeWonders !== 'undefined' && BridgeWonders.fog() < 1; }
  function risk(s, from, to, t, G) {
    var Dg = danger(), r = Math.max(Dg[from] || 0.05, Dg[to] || 0.05) * G.risk, w = weather(t);
    if (w === 'storm') r *= 0.25; else if (w === 'gale') r *= 0.6; else if (w === 'fog' && !compass()) r *= 0.8;   // pirates keep to port in a blow
    var bl = blockOf(from, to, t);
    if (bl) r = bl.choice === 'escort' ? Math.min(r, 0.02) : bl.choice === 'run' ? r + 0.35 : r;
    return Math.min(0.85, r);
  }
  function boostOf(from, to, t) {                            // a market short of things pays more
    var k = 1, bl = blockOf(from, to, t), cl = closedAt(to, t);
    if (bl && bl.choice === 'run') k *= 1.25;
    if (cl && cl.choice === 'run') k *= 1.4;
    return k;
  }
  function glutAt(o, P, g, t) { var x = o.glut[P + ':' + g]; return x ? x.n * Math.pow(0.5, Math.max(0, t - x.at) / 7200000) : 0; }
  function noteGlut(o, P, g, n, t) {
    o.glut[P + ':' + g] = { n: glutAt(o, P, g, t) + n, at: t };
    Object.keys(o.glut).forEach(function (k) { if (glutAt(o, k.split(':')[0], k.split(':').slice(1).join(':'), t) < 0.5) delete o.glut[k]; });
  }
  /** One leg's trade, a to b, in `room` crates: up to three goods made at a that b wants, each in the amount that pays
   *  best with the market's depth (js/trade.js bestRun) and her own glut at b; { goods, crates, profit } or null. */
  function legRun(a, b, room, o, t, boost) {
    var Tr = T();
    if (!Tr || a === b || !Tr.port(a) || !Tr.port(b)) return null;
    var runs = Tr.stock(a).filter(function (g) { return Tr.GOODS[g] && !Tr.GOODS[g].rare; }).map(function (g) {
      var b1 = Tr.price(g, a, 'buy', 1), s1 = Tr.price(g, b, 'sell', 1) * (boost || 1), K = Tr.depth(g), gl = glutAt(o, b, g, t), best = { good: g, n: 0, profit: 0 };
      for (var n = 2; n <= room; n += Math.max(1, Math.round(room / 40))) {
        var pb = b1 * (1 + n / 2 / K) / (1 + 0.5 / K), ps = s1 * (1 + 0.5 / K) / (1 + (gl + n / 2) / K), pr = n * (ps - pb);
        if (pr > best.profit) best = { good: g, n: n, profit: pr };
      }
      return best;
    }).filter(function (r) { return r.profit > 0; }).sort(function (p, q) { return q.profit - p.profit; }).slice(0, 3);
    var left = room, goods = [], profit = 0;
    runs.forEach(function (r) { var n = Math.min(r.n, left); if (n < 2) return; goods.push({ good: r.good, n: n }); profit += r.profit * n / r.n; left -= n; });
    return goods.length ? { goods: goods, crates: room - left, profit: Math.round(profit) } : null;
  }
  function room(s) { return Math.max(2, Math.round(F().effective(s).hold * 0.9)); }
  // the stock a supply run takes out to a business: her own catch first, then the store; two days' worth at most
  function loadFor(s, o, space) {
    var b = B(), d = b && b.get(o.to), so = b && b.stockOf ? b.stockOf(o.to) : null;
    if (!d || !d.stock || !so || !H()) return null;
    var need = Math.max(0, STOCK_DAYS * so.per - so.units), items = [], crates = 0, units = 0, catchOf = F().catchOf(s) || {};
    d.stock.forEach(function (id) {
      if (need <= 0 || crates >= space) return;
      var per = Math.max(1, T().per(id) || 6), u = b.unitsOf ? b.unitsOf(id) : 1, have = H().stored(id) + (catchOf[id] || 0);
      var n = Math.min(have, (space - crates) * per, Math.ceil(need / u));
      if (n <= 0) return;
      var a = Math.min(catchOf[id] || 0, n);
      if (a) F().takeFish(s, id, a);
      if (n - a) H().storeTake(id, n - a);
      items.push({ id: id, n: n });
      crates += Math.ceil(n / per); units += n * u; need -= n * u;
    });
    return items.length ? { biz: o.to, items: items, crates: crates, units: units } : null;
  }
  function plan(s, o, from, to, t, pos) {
    var space = room(s), out = { goods: [], profit: 0, crates: 0, jobs: [], deliver: null, bring: null };
    // a buyer from the dispatch, waiting at `to` for a good `from` sells: she carries it first (js/dispatch.js)
    T().mine().filter(function (c) { return c.dispatch && c.to === to && !st.jobs[c.id] && T().stock(from).indexOf(c.good) >= 0; }).forEach(function (c) {
      if (c.n > space) return;
      out.jobs.push({ id: c.id, good: c.good, n: c.n, fee: c.fee, cost: T().price(c.good, from, 'buy', c.n) * c.n });
      st.jobs[c.id] = s.id; space -= c.n; out.crates += c.n;
    });
    if (o.kind === 'trade' || pos) {
      var r = legRun(from, to, space, o, t, boostOf(from, to, t));
      if (r) { out.goods = r.goods; out.profit = r.profit; out.crates += r.crates; }
    } else if (from === HOLM && o.to !== 'workshop') {
      out.deliver = loadFor(s, o, space);
      if (out.deliver) out.crates += out.deliver.crates;
    } else if (to === HOLM && o.bring && !st.debt) {
      var n = Math.min(o.bringN || 10, space, Math.max(0, T().supply(o.bring, from)));
      if (n > 0) {
        var cost = T().price(o.bring, from, 'buy', n) * n;
        out.bring = { good: o.bring, n: n, cost: cost };
        out.crates += n;
        st.costs.push({ n: cost, why: 'orders:supply' });       // paid as she loads
      }
    }
    return out;
  }
  function cargoText(p) {
    var bits = [];
    (p.jobs || []).forEach(function (j) { bits.push(j.n + ' ' + gname(j.good).toLowerCase() + ' for a buyer'); });
    (p.goods || []).forEach(function (g) { bits.push(g.n + ' ' + gname(g.good).toLowerCase()); });
    if (p.deliver) bits.push(p.deliver.items.reduce(function (a, x) { return a + x.n; }, 0) + ' ' + stockWord(p.deliver) + ' for ' + bizName(p.deliver.biz));
    if (p.bring) bits.push(p.bring.n + ' crates of ' + gname(p.bring.good).toLowerCase() + ' for the Workshop');
    return bits.length ? 'with ' + bits.join(', ') : 'in ballast';
  }
  function stockWord(dl) {
    var fish = dl.items.every(function (x) { return T().HAUL[x.id] && T().HAUL[x.id].kind === 'fish'; });
    return fish ? 'fish' : 'stores';
  }
  function bizName(id) { var d = B() && B().get(id); return d ? 'the ' + d.name.replace(/^The /, '') : id; }

  // ---- starting a leg, ending one --------------------------------------------------------------------------------------
  var dirty = false;
  function lie(s, at) { if ((at && s.at !== at) || s.away) dirty = true; if (at) s.at = at; delete s.away; }
  function wait(o, w) { if (!o.wait || o.wait.code !== w.code || o.wait.until !== w.until || o.wait.why !== w.why) dirty = true; o.wait = w; }
  /** Why she can't sail now (a wait), or null. */
  function blocked(s, o, at, to, t) {
    var p = captainOf(s.id);
    if (!p) return { why: 'no captain aboard', code: 'nocap' };
    if (unpaid(p)) return { why: p.name + ' won\'t sail unpaid', code: 'unpaid' };
    var a = F().active && F().active().ship;
    if (a && a.id === s.id) return { why: 'you\'re sailing her yourself', code: 'yours' };
    if (o.kind === 'supply') {
      if (!H() || !H().owned() || !H().built('dock')) return { why: 'your holm has no dock', code: 'nodock' };
      if (o.to !== 'workshop' && !bizOk(o.to)) return { why: 'that business isn\'t yours any more', code: 'gone' };
    }
    var c1 = closedAt(at, t), c2 = closedAt(to, t), c = c1 && c1.choice !== 'run' ? c1 : c2 && c2.choice !== 'run' ? c2 : null;
    if (c) return { why: 'storm-bound: ' + pname(c === c1 ? at : to) + ' is closed', until: c.until, code: 'storm' };
    return null;
  }
  function begin(s, o, t, now) {
    now = now || Date.now();
    t = Math.max(t, now - BACK);
    var at = s.at, to = nextTo(o, at), pos = loopOf(o).indexOf(at) < 0;
    var why = blocked(s, o, at, to, t);
    if (why) { wait(o, why); lie(s, at); return false; }
    var p = plan(s, o, at, to, t, pos);
    if (o.kind === 'supply' && !pos && at === HOLM && !p.deliver && !p.jobs.length && !(o.bring)) {   // nothing to take out, nothing to bring home
      wait(o, { why: 'nothing in your store for ' + bizName(o.to) + ' (or it has two days\' stock)', code: 'empty' });
      lie(s, at); return false;
    }
    var G = gradeOf(captainOf(s.id)), mins = legMins(s, at, to, p.crates, t);
    o.leg = { from: at, to: to, out: t, back: t + mins * MIN, plan: p, pos: pos, risk: risk(s, at, to, t, G), weather: weather(t),
              storm: !!(closedAt(to, t) && closedAt(to, t).choice === 'run') };
    o.wait = null;
    dirty = true;
    s.at = 'away';
    s.away = { order: true, from: at, to: to, out: t, back: o.leg.back };
    return true;
  }
  function trouble(s, o, L, G) {
    var k = s.id + ':' + o.since + ':' + o.legs, out = { hit: null, words: '' };
    if (hash(k + ':t') < L.risk) {
      var sp = F().effective(s), teeth = (sp.guns.length * 2 + sp.fighters) / (4 + sp.guns.length * 2 + sp.fighters) + G.teeth;
      if (hash(k + ':b') < teeth) { out.hit = 'beat'; s.hull = Math.max(0.3, s.hull - 0.15); out.words = 'pirates came at her off ' + pname(L.to) + ' and she beat them off'; }
      else { out.hit = 'lost'; s.hull = Math.max(0.2, s.hull - 0.3); out.words = 'pirates took a third of her cargo off ' + pname(L.to); }
    }
    if (L.storm && hash(k + ':s') < 0.3) { s.hull = Math.max(0.2, s.hull - 0.25); out.words = (out.words ? out.words + '; ' : '') + 'she ran into ' + pname(L.to) + ' through the storm and it cost her'; }
    else if (L.weather === 'storm' && hash(k + ':w') < 0.15) { s.hull = Math.max(0.2, s.hull - 0.1); out.words = out.words || 'a hard blow on the way'; }
    return out;
  }
  function complete(s, o, now) {
    var L = o.leg, t = L.back, p = captainOf(s.id), G = gradeOf(p), cp = p ? capOf(p.id) : null, P = L.plan;
    dirty = true;
    var tr = trouble(s, o, L, G), keep = tr.hit === 'lost' ? 2 / 3 : 1, share = G.share * (cp && cp.bonus > 0 ? 1.15 : 1);
    var gained = (P.profit || 0) * (tr.hit === 'lost' ? 0.6 : 1) * share + (tr.hit === 'beat' ? 80 : 0), bits = [];
    var open = T().mine().map(function (c) { return c.id; });
    (P.jobs || []).forEach(function (j) {                    // the dispatch's buyers, paid on delivery (if it's still wanted)
      delete st.jobs[j.id];
      if (open.indexOf(j.id) < 0) return;
      gained += Math.max(0, j.fee - j.cost);
      if (T().complete) T().complete(j.id);
      bits.push(j.n + ' ' + gname(j.good).toLowerCase() + ' to a buyer');
    });
    if (P.deliver) {                                          // the stock into the business (back into the store if it's gone)
      var items = P.deliver.items.map(function (x) { return { id: x.id, n: Math.max(1, Math.round(x.n * keep)) }; });
      if (bizOk(P.deliver.biz) && B().supply) { var u = B().supply(P.deliver.biz, items); o.units = (o.units || 0) + u; bits.push(u + ' units of stock to ' + bizName(P.deliver.biz)); }
      else items.forEach(function (x) { H().storeAdd(x.id, x.n); });
    }
    if (P.bring) { var bn = Math.max(1, Math.round(P.bring.n * keep)); H().storeAdd(P.bring.good, bn); o.crates = (o.crates || 0) + bn; bits.push(bn + ' crates of ' + gname(P.bring.good).toLowerCase() + ' to the store'); }
    (P.goods || []).forEach(function (g) {                    // her cargo sold: the market there feels it
      noteGlut(o, L.to, g.good, g.n, t);
      if (now - t < 4 * HOUR && T().noteSold) T().noteSold(g.good, L.to, Math.round(g.n * keep * Math.pow(0.5, (now - t) / 7200000)));
    });
    gained = Math.max(0, Math.round(gained));
    st.bank += gained; st.made += gained; o.made += gained; o.run += gained; o.legs++;
    if (cp) cp.made += gained;
    var told = tr.words || (P.goods && P.goods.length ? 'sold ' + P.goods.map(function (g) { return g.n + ' ' + gname(g.good).toLowerCase(); }).join(', ') + ' at ' + pname(L.to) : '');
    o.story = told + (bits.length ? (told ? '; ' : '') + bits.join(', ') : '');
    if (tr.words) o.runStory = tr.words;
    lie(s, L.to);
    o.leg = null;
    if (s.hull < 0.4 && harbour(L.to)) {                     // mended at the yard there while she lies an hour
      var cost = F().repairCost ? F().repairCost(s) : 0;
      if (cost > 0) st.costs.push({ n: cost, why: 'repair:orders' });
      s.hull = 1;
      o.wait = { why: 'in for repairs at ' + pname(L.to), until: t + HOUR, code: 'repair' };
      o.story += (o.story ? '; ' : '') + 'mended at ' + pname(L.to) + (cost ? ' (' + cost + ')' : '');
    }
    if (!L.pos && L.to === loopOf(o)[0]) {                    // once round: a run
      o.runs++; st.runs++;
      if (cp) { cp.runs++; if (cp.bonus > 0) cp.bonus--; }
      var brought = o.kind === 'supply' ? [o.units ? o.units + ' units of stock to ' + bizName(o.to) : '', o.crates ? o.crates + ' crates for the Workshop' : ''].filter(Boolean).join(', ') : '';
      o.last.unshift({ at: t, made: o.run, kind: o.kind, units: o.units || 0, crates: o.crates || 0,
                       story: (o.runStory ? o.runStory + (brought ? '; ' : '') : '') + (brought || (o.runStory ? '' : o.kind === 'supply' ? 'a quiet run, nothing to carry' : 'a fair run')) });
      o.last = o.last.slice(0, 6);
      o.run = 0; o.runStory = ''; o.units = 0; o.crates = 0;
    }
  }

  // ---- the clock ----------------------------------------------------------------------------------------------------
  var busy = false;
  function advance(now) {
    if (busy || !F() || !T()) return;
    busy = true;
    try {
      now = now || Date.now();
      Object.keys(st.ord).forEach(function (id) {
        var s = ship(id), o = st.ord[id];
        if (!s) { delete st.ord[id]; dirty = true; return; }
        for (var guard = 0; guard < 500; guard++) {
          if (o.leg) {
            if (!s.away || !s.away.order) { o.leg = null; wait(o, { why: 'taken off her orders', code: 'off' }); break; }
            if (o.leg.back > now) break;
            var t = o.leg.back;
            complete(s, o, now);
            if (o.stop) { delete st.ord[id]; dirty = true; note('The ' + s.name + ' came off her orders at ' + pname(s.at)); break; }
            if (o.wait && o.wait.until > now) break;          // in for repairs
            if (!begin(s, o, o.wait && o.wait.until ? o.wait.until : t, now) && !(o.wait && o.wait.until && o.wait.until <= now)) break;
            continue;
          }
          if (o.stop) { delete st.ord[id]; dirty = true; break; }
          if (s.away) { wait(o, { why: 'away on other business', code: 'away' }); break; }
          if (o.wait && o.wait.until && o.wait.until > now) break;
          var from = o.wait && o.wait.until ? o.wait.until : now;
          if (!begin(s, o, from, now) && !(o.wait && o.wait.until && o.wait.until <= now && o.wait.until > from)) break;
        }
      });
    } finally { busy = false; }
    if (dirty) { dirty = false; save(); F().save(); }
    flush();
  }
  // what every leg made, to your purse; what materials and repairs cost, from it
  var paying = false;
  function flush() {
    if (paying || typeof BridgeProgression === 'undefined') return;
    var P = BridgeProgression;
    if (st.bank >= 1 && P.awardCoins) {
      var n = Math.floor(st.bank);
      paying = true;
      Promise.resolve(P.awardCoins(n, 'orders:trade')).then(function (bal) {
        paying = false;
        if (bal != null) { st.bank -= n; save(); flush(); }
      }, function () { paying = false; });
      return;
    }
    if (st.costs.length && P.wagerCoins) {
      var c = st.costs[0];
      paying = true;
      Promise.resolve(P.wagerCoins(c.n, c.why)).then(function (r) {
        paying = false;
        if (r && r.ok) { st.costs.shift(); st.debt = false; save(); flush(); }
        else if (r && ['offline', 'no_client', 'no_pilot', 'error'].indexOf(r.reason) < 0) { if (!st.debt) note('Your captains are owed for materials and repairs: they\'ll buy no more till it\'s paid'); st.debt = true; save(); }
      }, function () { paying = false; });
    }
  }
  if (typeof window !== 'undefined') setInterval(function () { if (Object.keys(st.ord).length || st.bank >= 1 || st.costs.length) advance(); }, 30000);

  // ---- what the ledger, the office and the chart read -------------------------------------------------------------------
  function orderName(o) {
    if (o.kind === 'trade') return o.ports.map(pname).join(' → ') + ' → back';
    return (o.to === 'workshop' ? 'Supply: materials from ' + pname(o.port) : 'Supply: ' + bizName(o.to).replace(/^the /, 'the ')) + (o.bring && o.to !== 'workshop' ? ', ' + gname(o.bring).toLowerCase() + ' home' : '');
  }
  /** "on standing orders: sailing for Crimson Reach with 36 salt fish, in 42 min" (js/fleet.js where) */
  function line(s) {
    advance();
    var o = st.ord[s.id];
    if (!o) return null;
    if (o.leg) {
      var m = Math.max(1, Math.ceil((o.leg.back - Date.now()) / MIN));
      return (o.leg.pos ? 'joining her loop: ' : 'on standing orders: ') + 'sailing for ' + pname(o.leg.to) + ' ' + cargoText(o.leg.plan) + ', in ' + hm(m) + (o.stop ? ' — then she lies there' : '');
    }
    if (o.wait) return 'on standing orders, lying at ' + pname(s.at) + ': ' + o.wait.why;
    return 'on standing orders';
  }
  function estimate(shipId, spec) {
    var s = ship(shipId), o = spec || st.ord[shipId];
    if (!s || !o || !T()) return null;
    var G = gradeOf(captainOf(shipId)), L = loopOf(o), sp = room(s), now = Date.now(), profit = 0, mins = 0, safe = 1, g0 = { glut: {} };
    for (var i = 0; i < L.length; i++) {
      var a = L[i], b = L[(i + 1) % L.length], r = o.kind === 'trade' ? legRun(a, b, sp, g0, now, boostOf(a, b, now)) : null;
      profit += r ? r.profit : 0;
      mins += legMins(s, a, b, r ? r.crates : o.kind === 'supply' ? sp / 2 : 0, now);
      safe *= 1 - risk(s, a, b, now, G);
    }
    return { profit: Math.round(profit * G.share), mins: mins, risk: 1 - safe };
  }
  /** Today's best loops for her captain's grade: [{ ports, est }] by what they make an hour. */
  function loops(shipId) {
    var s = ship(shipId);
    if (!s || !T()) return [];
    var max = gradeOf(captainOf(shipId)).ports, P = markets(), out = [];
    function add(L) { var e = estimate(shipId, { kind: 'trade', ports: L }); if (e && e.profit > 0) out.push({ ports: L, est: e, rate: e.profit / e.mins }); }
    for (var i = 0; i < P.length; i++) for (var j = i + 1; j < P.length; j++) {
      add([P[i], P[j]]);
      if (max >= 3) for (var k = j + 1; k < P.length; k++) { add([P[i], P[j], P[k]]); add([P[i], P[k], P[j]]); }
    }
    out.sort(function (a, b) { return b.rate - a.rate; });
    if (max >= 4) {                                            // a fourth port added to the best threes, where it pays
      out.filter(function (x) { return x.ports.length === 3; }).slice(0, 3).forEach(function (x) {
        P.forEach(function (q) { if (x.ports.indexOf(q) >= 0) return; for (var at = 1; at <= 3; at++) { var L = x.ports.slice(); L.splice(at, 0, q); add(L); } });
      });
      out.sort(function (a, b) { return b.rate - a.rate; });
    }
    var seen = {};                                             // the same ports round the other way: the better one, once
    return out.filter(function (x) { var key = x.ports.slice().sort().join('|'); if (seen[key]) return false; seen[key] = 1; return true; }).slice(0, 5);
  }
  function list() {
    advance();
    return ships().map(function (s) {
      var o = st.ord[s.id], p = captainOf(s.id);
      return { ship: s, captain: p, order: o || null, line: o ? line(s) : null, name: o ? orderName(o) : null };
    });
  }
  /** The chart table's lines: every order, its loop and where she is on it. */
  function routes() {
    advance();
    return Object.keys(st.ord).map(function (id) {
      var s = ship(id), o = st.ord[id];
      return s ? { ship: id, type: s.type, colour: o.colour, loop: loopOf(o), kind: o.kind, leg: o.leg ? { from: o.leg.from, to: o.leg.to, out: o.leg.out, back: o.leg.back } : null, waiting: !!o.wait } : null;
    }).filter(Boolean);
  }
  function summary() {
    advance();
    var ids = Object.keys(st.ord), waiting = ids.filter(function (id) { return st.ord[id].wait && ['storm', 'repair'].indexOf(st.ord[id].wait.code) < 0; });
    var today = 0, d0 = Date.now() - 86400000;
    ids.forEach(function (id) { st.ord[id].last.forEach(function (r) { if (r.at > d0) today += r.made; }); });
    return { orders: ids.length, waiting: waiting.length, captains: staff().length, ashore: staff().filter(ashore).length, runs: st.runs, made: st.made, day: today, debt: st.debt };
  }
  /** A captain, for the ledger's Staff page and the staff board: { face, sub, state }. */
  function captainRow(p) {
    advance();
    var c = st.cap[p.id], s = c && c.ship && ship(c.ship), o = s && st.ord[s.id];
    var sub = perk(p) + ' · ' + (!s ? 'ashore, waiting for a ship' : 'of the ' + s.name + ' · ' + (o ? (o.leg ? 'at sea' : 'lying at ' + pname(s.at) + (o.wait ? ': ' + o.wait.why : '')) : 'no orders yet')) +
              (c && c.runs ? ' · ' + c.runs + ' run' + (c.runs === 1 ? '' : 's') + ', ' + coins(c.made) + ' made' : '');
    return { face: faceOf(p), sub: sub, state: unpaid(p) ? 'owed' : o && o.leg ? 'sea' : s ? 'on' : 'off' };
  }
  function needs() {
    advance();
    var out = [];
    Object.keys(st.ord).forEach(function (id) {
      var o = st.ord[id], s = ship(id);
      if (s && o.wait && ['nocap', 'unpaid', 'gone', 'nodock', 'off', 'away', 'yours'].indexOf(o.wait.code) >= 0)
        out.push({ name: 'The ' + s.name + ' is waiting', sub: o.wait.why + ' — her standing orders are on hold', world: 'office', alert: o.wait.code === 'unpaid' });
      else if (s && o.wait && o.wait.code === 'empty')
        out.push({ name: 'The ' + s.name + ' has nothing to carry', sub: 'Put stock away in the warehouse on ' + (H() ? H().name() : 'your holm') + ' and her supply run to ' + bizName(o.to) + ' sails again', world: 'lumar-holm' });
    });
    var idle = staff().filter(ashore);
    if (idle.length) out.push({ name: idle.length === 1 ? idle[0].name + ' has no ship' : idle.length + ' captains have no ship', sub: 'Put them aboard one at the chart table in your office, or let them go', world: 'office' });
    if (st.debt) out.push({ name: 'Your captains are owed', sub: 'Materials and repairs they paid for: they\'ll buy no more till you have the coins', alert: true });
    return out;
  }

  // ---- the screens: the chart table in the office, and the ledger ---------------------------------------------------------
  var PIN = { cutter: '#4a90e8', brigantine: '#50c070', galleon: '#f0c040', raider: '#e04040', sovereign: '#f0e0a0' };
  function pinIcon(s) {                                        // her pin on the chart, and her order's pennant
    var o = st.ord[s.id];
    return function (g, n) {
      var u = n / 24;
      g.fillStyle = '#2a1c10'; g.fillRect(11 * u, 9 * u, 2 * u, 12 * u);
      g.fillStyle = '#1a1008'; g.fillRect(7 * u, 3 * u, 9 * u, 9 * u);
      g.fillStyle = PIN[s.type] || '#e0e0e0'; g.fillRect(7 * u, 3 * u, 8 * u, 8 * u);
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(8 * u, 4 * u, 2 * u, 2 * u);
      if (o) { g.fillStyle = o.colour; g.fillRect(13 * u, 13 * u, 8 * u, 4 * u); g.fillRect(13 * u, 17 * u, 4 * u, 2 * u); }
    };
  }
  function intro() {
    return 'GIVE A SHIP WITH A CAPTAIN ABOARD A STANDING ORDER - A TRADE LOOP ROUND PORTS OF YOUR CHOOSING, OR A SUPPLY RUN BETWEEN YOUR HOLDINGS - ' +
           'AND SHE KEEPS AT IT WHILE YOU\'RE ELSEWHERE. WHAT EVERY RUN MAKES COMES TO YOU.' +
           (st.runs ? ' YOUR CAPTAINS HAVE RUN ' + st.runs + ' LOOP' + (st.runs === 1 ? '' : 'S') + ' AND MADE ' + coins(st.made) + '.' : '');
  }
  function open(note) {
    advance();
    var all = ships();
    if (!all.length) {
      choose({ title: 'Standing orders', text: note || "NOT A SHIP OF YOURS TO GIVE ORDERS TO: THE SLOOP GOES WHERE YOU GO. A CUTTER FROM BESS TOLLIVER'S YARD ON DIGGEN'S POINT, " +
               'A CAPTAIN FOR HER, AND SHE\'LL TRADE WHILE YOU\'RE ELSEWHERE.', closeLabel: 'Done' });
      return;
    }
    var rows = all.map(function (s) {
      var p = captainOf(s.id), o = st.ord[s.id];
      return { label: s.name, draw: pinIcon(s), sub: F().spec(s.type).name + ' · ' + (p ? gradeOf(p).name + ' ' + p.name : 'no captain') + ' · ' + (o ? orderName(o) + ' · ' + line(s).replace(/^on standing orders(: |, )/, '') : F().where(s)),
               note: o ? (o.wait ? 'waiting' : 'on orders') : p ? 'give orders' : 'no captain', pick: function () { shipView(s.id); } };
    });
    staff().filter(ashore).forEach(function (p) {
      rows.push({ label: p.name, face: faceOf(p), sub: gradeOf(p).name + ' · ashore, waiting for a ship · ' + p.wage + ' a day', note: 'ashore', pick: function () { captainCard(p.id); } });
    });
    choose({ title: 'Standing orders', text: note || intro(), rows: rows,
             buttons: [{ label: 'Captains for hire', act: function () { hireView(null); } }], closeLabel: 'Done' });
  }
  function shipView(id, note) {
    advance();
    var s = ship(id);
    if (!s) { open(); return; }
    var p = captainOf(id), o = st.ord[id], rows = [];
    if (p) rows.push({ label: gradeOf(p).name + ' ' + p.name, face: faceOf(p), sub: perk(p) + ' · ' + p.wage + ' a day' + (unpaid(p) ? ' · UNPAID: won\'t sail' : ''),
                       note: 'her captain', pick: function () { captainCard(p.id, id); } });
    else {
      staff().filter(ashore).forEach(function (q) {
        rows.push({ label: 'Put ' + q.name + ' aboard', face: faceOf(q), sub: gradeOf(q).name + ' · ' + perk(q), note: 'ashore',
                    pick: function () { assign(q.id, id); shipView(id, q.name.toUpperCase() + ' GOES ABOARD THE ' + s.name.toUpperCase() + '.'); } });
      });
      rows.push({ label: 'Hire a captain for her', sub: 'three look for a ship each day', note: 'hire', pick: function () { hireView(id); } });
    }
    if (o) {
      var e = estimate(id);
      rows.push({ label: 'Her standing order', draw: pinIcon(s), sub: orderName(o) + ' · ' + (o.kind === 'trade' ? '~' + coins(e.profit) + ' a run' : 'keeps ' + (o.to === 'workshop' ? 'the Workshop in materials' : bizName(o.to) + ' stocked')) +
                  ' · a run every ' + hm(e.mins) + ' · ' + Math.round(e.risk * 100) + '% chance of trouble' + (o.runs ? ' · ' + o.runs + (o.runs === 1 ? ' run, ' : ' runs, ') + coins(o.made) + ' made' : ''),
                  note: 'change', disabled: !p, pick: function () { setView(id); } });
      o.last.slice(0, 3).forEach(function (r) { rows.push({ label: '· A run, ' + ago(r.at), sub: r.story, note: r.kind === 'supply' && !r.made ? (r.units ? r.units + ' units' : r.crates + ' crates') : '+' + coins(r.made), info: true }); });
      if (o.wait && ['off', 'away', 'empty', 'unpaid', 'nocap', 'yours'].indexOf(o.wait.code) >= 0)
        rows.push({ label: o.wait.code === 'yours' ? 'Hand her back to her captain' : 'Try again now', sub: o.wait.why, pick: function () { resume(id); shipView(id); } });
      rows.push(o.stop ? { label: 'Keep her on her orders', sub: 'she was to stop at ' + pname(o.leg ? o.leg.to : s.at), pick: function () { o.stop = false; save(); shipView(id, 'SHE STAYS ON HER ORDERS.'); } }
                       : { label: 'Stop her orders', sub: o.leg ? 'she finishes this leg and lies at ' + pname(o.leg.to) : 'she lies where she is', pick: function () { stop(id); shipView(id, o.leg ? 'SHE\'LL LIE AT ' + pname(o.leg.to).toUpperCase() + ' ONCE THIS LEG\'S DONE.' : 'SHE\'S OFF HER ORDERS.'); } });
    } else {
      rows.push({ label: 'Give her a standing order', sub: p ? 'a trade loop, or a supply run between your holdings' : 'she needs a captain first', disabled: !p || !!s.away, pick: function () { setView(id); } });
      if (F().canOrder && !F().canOrder(s) && typeof BridgeHarbour !== 'undefined' && BridgeHarbour.send)
        rows.push({ label: 'Send her somewhere, once', sub: 'her hands sail her there, and she lies there after', pick: function () { BridgeHarbour.send(s, function (msg) { shipView(id, msg); }); } });
    }
    var text = note || (s.name + ', ' + F().spec(s.type).name + ' - ' + (o ? line(s) : F().where(s)) + '. ' + F().line(s).replace(/^[^·]*· /, '')).toUpperCase();
    choose({ title: s.name, text: text, rows: rows, buttons: [{ label: 'All your ships', act: function () { open(); } }], closeLabel: 'Done' });
  }
  function setView(id, note) {
    var s = ship(id), p = captainOf(id), ws = typeof BridgeWorkshop !== 'undefined' && BridgeWorkshop.built();
    var dock = H() && H().owned() && H().built('dock');
    choose({ title: 'Orders for the ' + s.name, text: note || ('WHAT SHOULD ' + (p ? p.name.toUpperCase() : 'HER CAPTAIN') + ' DO WITH HER?'),
      rows: [
        { label: 'A trade loop', sub: 'round ' + (gradeOf(p).ports > 2 ? 'two to ' + gradeOf(p).ports : 'two') + ' ports: she buys at each what the next one wants', note: 'trade', pick: function () { loopView(id); } },
        { label: 'A supply run', sub: dock ? 'from the store on ' + H().name() + ' to your businesses' + (ws ? ', and materials home for the Workshop' : '') : 'sails from your holm: rebuild its dock first',
          note: 'supply', disabled: !dock, pick: function () { supplyView(id); } }
      ], buttons: [{ label: 'Back', act: function () { shipView(id); } }], closeLabel: 'Done' });
  }
  function give(id, spec) {
    var r = set(id, spec), s = ship(id);
    if (!r.ok) { shipView(id, ('NO: ' + r.reason + '.').toUpperCase()); return; }
    sfx('bell');
    var e = estimate(id), o = st.ord[id];
    shipView(id, ('ORDERS GIVEN: ' + orderName(o) + '. ' + (o.leg ? 'SHE SAILS FOR ' + pname(o.leg.to) + ' ' + cargoText(o.leg.plan) + '.' : o.wait ? 'FOR NOW SHE WAITS: ' + o.wait.why + '.' : '') +
                  (o.kind === 'trade' ? ' ABOUT ' + coins(e.profit) + ' A RUN, A RUN EVERY ' + hm(e.mins) + '.' : '')).toUpperCase());
  }
  function loopView(id) {
    var best = loops(id), max = gradeOf(captainOf(id)).ports;
    var rows = best.map(function (x) {
      return { label: x.ports.map(pname).join(' → ') + ' → back', sub: '~' + coins(x.est.profit) + ' a run · a run every ' + hm(x.est.mins) + ' · ' + Math.round(x.est.risk * 100) + '% chance of trouble',
               note: 'sail it', pick: function () { give(id, { kind: 'trade', ports: x.ports }); } };
    });
    rows.push({ label: 'Choose the ports yourself', sub: 'two' + (max > 2 ? ' to ' + max : '') + ' ports, in the order she sails them', note: 'choose', pick: function () { pickView(id, []); } });
    choose({ title: 'A trade loop', text: best.length ? 'TODAY\'S BEST LOOPS FOR HER HOLD, BY WHAT THEY MAKE AN HOUR. PRICES DRIFT DAY TO DAY, AND A MARKET SHE KEEPS SELLING INTO PAYS A LITTLE LESS EACH TIME.' :
             'NO LOOP PAYS TODAY. CHOOSE THE PORTS YOURSELF, OR TRY TOMORROW.', rows: rows, buttons: [{ label: 'Back', act: function () { setView(id); } }], closeLabel: 'Done' });
  }
  function pickView(id, picked) {
    var max = gradeOf(captainOf(id)).ports, I = isles();
    var rows = markets().filter(function (p) { return picked.indexOf(p) < 0; }).map(function (p) {
      return { label: pname(p), sub: (T().stock(p).length ? 'sells ' + T().stock(p).slice(0, 3).map(function (g) { return gname(g).toLowerCase(); }).join(', ') : '') + (I[p] ? ' · the ' + cap(I[p].pal) + ' Sea' : ''),
               note: picked.length + 1 + '', disabled: picked.length >= max, pick: function () { pickView(id, picked.concat([p])); } };
    });
    var e = picked.length >= 2 ? estimate(id, { kind: 'trade', ports: picked }) : null;
    choose({ title: 'Choose the ports', text: picked.length ? 'HER LOOP SO FAR: ' + picked.map(pname).join(' → ').toUpperCase() + (e ? ' → BACK. ~' + coins(e.profit) + ' A RUN, A RUN EVERY ' + hm(e.mins).toUpperCase() + '.' : '.') :
             'PICK THE PORTS IN THE ORDER SHE\'LL SAIL THEM. SHE SAILS FROM THE LAST BACK TO THE FIRST.', rows: rows,
             buttons: [{ label: 'That\'s her loop', disabled: picked.length < 2, act: function () { give(id, { kind: 'trade', ports: picked }); } },
                       { label: 'Start again', act: function () { pickView(id, []); } }], closeLabel: 'Done' });
  }
  function cap(t) { return String(t).charAt(0).toUpperCase() + String(t).slice(1); }
  function supplyTargets() { return B() ? B().all().filter(function (d) { return bizOk(d.id); }) : []; }
  function supplyView(id) {
    var rows = supplyTargets().map(function (d) {
      var so = B().stockOf(d.id), have = d.stock.reduce(function (a, it) { return a + (H() ? H().stored(it) : 0); }, 0);
      return { label: d.name, sub: placeOf(d.world) + ' · ' + (so.units ? 'stock for ' + so.hours + ' open hours' : 'out of stock: buying in at cost') + ' · ' + (have ? have + ' of what it sells in your store' : 'none of what it sells in your store yet'),
               note: 'supply it', pick: function () { bringView(id, d.id, F().islandOf(d.world)); } };
    });
    if (typeof BridgeWorkshop !== 'undefined' && BridgeWorkshop.built())
      rows.push({ label: 'Materials for the Workshop', sub: 'timber, glass, spore silk, powder or roseite, bought at a port and brought home to the store', note: 'materials', pick: function () { portView(id); } });
    choose({ title: 'A supply run', text: rows.length ? 'SHE SAILS OUT OF ' + (H() ? H().name().toUpperCase() : 'YOUR HOLM') + ' WITH WHAT A BUSINESS OF YOURS SELLS, FROM YOUR WAREHOUSE (AND HER OWN FISH HOLD), ' +
             'SO IT EARNS FULL PRICE INSTEAD OF BUYING IN AT COST - AND CAN BRING MATERIALS HOME FOR THE WORKSHOP.' : 'NONE OF YOUR BUSINESSES ON LUMAR SELLS THINGS YOU COULD SHIP IT. THE TERN\'S REST, THE CROWN & ANCHOR AND THE FISH STALL ON SAPPHIRE DO.',
             rows: rows, buttons: [{ label: 'Back', act: function () { setView(id); } }], closeLabel: 'Done' });
  }
  function placeOf(w) { return typeof BridgeMap !== 'undefined' && BridgeMap.placeName ? BridgeMap.placeName(w) : w; }
  function portView(id) {
    var rows = markets().filter(function (p) { return T().stock(p).some(function (g) { return CRATES[g]; }); }).map(function (p) {
      return { label: pname(p), sub: 'sells ' + T().stock(p).filter(function (g) { return CRATES[g]; }).map(function (g) { return gname(g).toLowerCase(); }).join(', '), note: 'buy here', pick: function () { bringView(id, 'workshop', p); } };
    });
    choose({ title: 'Materials for the Workshop', text: 'WHERE SHOULD SHE BUY THEM? A CRATE OF PINE TIMBER IS EIGHT LOGS, SAPPHIRE GLASS SIX PANES, SPORE SILK FOUR BOLTS OF SAILCLOTH, A KEG OF POWDER SIX HORNS.',
             rows: rows, buttons: [{ label: 'Back', act: function () { supplyView(id); } }], closeLabel: 'Done' });
  }
  function bringView(id, to, port) {
    var goods = T().stock(port).filter(function (g) { return CRATES[g]; });
    var rows = goods.map(function (g) {
      return { label: gname(g), icon: g, sub: 'about ' + T().price(g, port, 'buy', 10) + ' a crate at ' + pname(port) + ' today', note: 'bring it', pick: function () { amountView(id, to, port, g); } };
    });
    if (to !== 'workshop') rows.unshift({ label: 'Nothing, thank you', sub: 'she sails home empty', note: 'just supply', pick: function () { give(id, { kind: 'supply', to: to, port: port, bring: null }); } });
    choose({ title: to === 'workshop' ? 'From ' + pname(port) : 'And on the way home?', text: to === 'workshop' ? 'WHAT SHOULD SHE BRING HOME FOR THE WORKSHOP?' :
             'SHE CAN BRING MATERIALS HOME FROM ' + pname(port).toUpperCase() + ' FOR THE WORKSHOP, BOUGHT FROM YOUR PURSE AS SHE LOADS THEM.', rows: rows,
             buttons: [{ label: 'Back', act: function () { to === 'workshop' ? portView(id) : supplyView(id); } }], closeLabel: 'Done' });
  }
  function amountView(id, to, port, good) {
    var s = ship(id), max = room(s), each = T().price(good, port, 'buy', 10);
    var rows = [5, 10, 20, 40].filter(function (n, i) { return n <= max || i === 0; }).map(function (n) {
      n = Math.min(n, max);
      return { label: n + ' crates a run', icon: good, sub: 'about ' + coins(n * each) + ' a run', note: 'that many', pick: function () { give(id, { kind: 'supply', to: to, port: port, bring: good, bringN: n }); } };
    });
    choose({ title: gname(good), text: 'HOW MUCH, EACH TIME SHE CALLS AT ' + pname(port).toUpperCase() + '?', rows: rows, buttons: [{ label: 'Back', act: function () { bringView(id, to, port); } }], closeLabel: 'Done' });
  }
  function why(r) {
    var x = r && r.reason;
    return x === 'locked' ? 'THEY WON\'T SIGN ON YET.' : x === 'taken' ? 'SOMEONE ELSE TOOK THEM ON.' : x === 'no_ship' ? 'YOU HAVE NO SHIP FOR THEM.' :
           x === 'offline' || x === 'no_client' || x === 'no_pilot' || x === 'error' ? 'NO WAY TO MOVE COINS RIGHT NOW.' : 'NOT ENOUGH COINS FOR THEIR FIRST DAY\'S WAGE.';
  }
  function hireView(shipId, note) {
    var s = shipId && ship(shipId);
    var rows = candidates().map(function (c) {
      return { label: c.name + ' · ' + c.title, face: c.face, sub: GRADES[c.grade].short + (c.locked ? ' · ' + c.locked : ''), note: c.taken ? 'hired' : c.wage + '/day',
               disabled: c.taken || !!c.locked, pick: function () { pickShipFor(c, shipId); } };
    });
    choose({ title: 'Captains for hire', text: note || ('THREE LOOKING FOR A SHIP TODAY' + (s ? ' - FOR THE ' + s.name.toUpperCase() : '') + '. A CAPTAIN IS PAID A DAY AHEAD LIKE EVERYONE ELSE ON YOUR PAYROLL: ' +
             'THEIR FIRST DAY NOW, THEN EACH MIDNIGHT. TWO PAYDAYS UNPAID AND THEY GO ASHORE FOR GOOD.'), rows: rows,
             buttons: [{ label: 'Back', act: function () { if (shipId) shipView(shipId); else open(); } }], closeLabel: 'Done' });
  }
  function pickShipFor(c, shipId) {
    var free = ships().filter(function (s) { return !captainOf(s.id); });
    if (!shipId && free.length > 1) {
      choose({ title: 'Which ship?', text: ('WHICH SHIP SHOULD ' + c.name + ' TAKE?').toUpperCase(), rows: free.map(function (s) {
        return { label: s.name, draw: pinIcon(s), sub: F().spec(s.type).name + ' · ' + F().where(s), pick: function () { pickShipFor(c, s.id); } };
      }), buttons: [{ label: 'Back', act: function () { hireView(null); } }], closeLabel: 'Done' });
      return;
    }
    var to = shipId || (free[0] && free[0].id) || null;
    hire(c, to).then(function (r) {
      if (!r || !r.ok) { hireView(shipId, why(r)); return; }
      sfx('coin');
      if (to) shipView(to, (c.name + ' SIGNS ON AS ' + c.title + ' OF THE ' + ship(to).name + '. GIVE HER A STANDING ORDER AND SHE\'LL KEEP AT IT.').toUpperCase());
      else open((c.name + ' SIGNS ON, AND WAITS ASHORE FOR A SHIP.').toUpperCase());
    });
  }
  function captainCard(pid, back) {
    var p = person(pid);
    if (!p) { open(); return; }
    var c = capOf(pid), s = c.ship && ship(c.ship);
    var rows = ships().filter(function (x) { return !s || x.id !== s.id; }).map(function (x) {
      var other = captainOf(x.id);
      return { label: 'Take the ' + x.name, draw: pinIcon(x), sub: F().spec(x.type).name + (other ? ' · ' + other.name + ' goes ashore' : ' · no captain'), pick: function () { assign(pid, x.id); shipView(x.id, (p.name + ' TAKES THE ' + x.name + '.').toUpperCase()); } };
    });
    if (s) rows.push({ label: 'Come ashore', sub: 'the ' + s.name + ' lies where her leg ends', pick: function () { assign(pid, null); open((p.name + ' COMES ASHORE.').toUpperCase()); } });
    choose({ title: p.name, text: ('"' + SAYINGS[Math.floor(hash(p.key || p.name) * SAYINGS.length)] + '" ' + gradeOf(p).name + ', on ' + p.wage + ' a day. ' + perk(p) + '. ' + (s ? 'Captain of the ' + s.name + '.' : 'Ashore, waiting for a ship.') +
             (c.runs ? ' ' + c.runs + ' runs, ' + coins(c.made) + ' made for you.' : '') + (unpaid(p) ? ' Unpaid: won\'t sail till paid.' : '')).toUpperCase(),
             face: faceOf(p), rows: rows,
             buttons: [{ label: 'Let them go', act: function () {
               choose({ title: 'Let ' + p.name + ' go?', text: 'THEY GO ASHORE FOR GOOD.' + (s ? ' THE ' + s.name.toUpperCase() + '\'S ORDERS WAIT FOR ANOTHER CAPTAIN.' : ''),
                        buttons: [{ label: 'Let them go', act: function () { dismiss(pid); open((p.name + ' HAS GONE ASHORE.').toUpperCase()); } }], closeLabel: 'Keep them' });
             } }, { label: 'Back', act: function () { if (back) shipView(back); else open(); } }], closeLabel: 'Done' });
  }

  return { GRADES: GRADES, candidates: candidates, hire: hire, captains: staff, captainOf: captainOf, assign: assign, dismiss: dismiss,
           get: function (id) { advance(); return st.ord[id] || null; }, set: set, stop: stop, resume: resume, list: list, routes: routes, estimate: estimate,
           loops: loops, line: line, summary: summary, needs: needs, captainRow: captainRow, bonus: function (pid, runs) { capOf(pid).bonus = (capOf(pid).bonus || 0) + runs; save(); },
           open: open, ship: shipView, captain: captainCard, hireView: hireView, orderName: orderName, advance: advance, faceOf: faceOf, log: function () { return st.log.slice(); },
           _age: function (ms) {                               // test hook: everything happened `ms` earlier
             Object.keys(st.ord).forEach(function (id) {
               var o = st.ord[id], s = ship(id);
               if (o.leg) { o.leg.out -= ms; o.leg.back -= ms; if (s && s.away && s.away.order) { s.away.out -= ms; s.away.back -= ms; } }
               if (o.wait && o.wait.until) o.wait.until -= ms;
               Object.keys(o.glut).forEach(function (k) { o.glut[k].at -= ms; });
             });
             if (F()) F().save();
             save();
           },
           _state: function () { return st; }, reload: function () { st = load(); } };
})();
