/**
 * BridgeBusiness — businesses you own and the people who run them (assets/businesses.json).
 *
 * Beck: "hire employees to collect things and basically run the entire business for you… at first you can only have
 * them do some things… then hire better salaried employees to do more and make you more money, but it costs a fair
 * amount… move them to different areas… tied into the hours on their planet and only work certain hours… when they're
 * not working there's no income." The plan is _claude_docs/spec-living-worlds.md §6 and §8.
 *
 * A business (defs[id]): { name, world, label (the stall's own interaction) | owner (bought from them in conversation:
 * a people.json topic `business: <id>`), loc, kind: stall | shop | venue | enterprise | legacy, trade (what specialist
 * lifts it), hours: [from, to] (js/hours.js anchors, on its planet's clock) | 'always' | 'crowd' (Arcadia: always open,
 * busiest 8pm–1am ET), price, rate (coins an open hour with a hand on), cap (hours of takings a hand holds for you),
 * upgrades }.
 *
 * It earns only while it's open and someone's working it — its staff, or you, standing in it. Staff (`TIERS`):
 *   hand        a daily wage of 80–150: keeps it open; you come and collect (the takings stop at `cap` hours)
 *   manager     600–1,200: runs it — half as much again, the takings banked to you as they come, no cap
 *   specialist  1,500–3,000: their own trade (a chef in a kitchen, a fisher at the fish stall…) lifts it by 60%
 *               (20% in someone else's)
 * Venues and bigger won't open without a manager. Each kind has room for so many (`SLOTS`). Staff get better the longer
 * they stay (+2% a week, to +30%). Move anyone to another business of yours: the same planet by the next hour, another
 * planet by tomorrow. Your crew (js/crew.js) can run one too, as a manager whose upkeep you already pay.
 *
 * Payroll: every Eastern-time day each hand, manager and specialist is owed their wage, and each crew member a third of
 * their old signing fee (they stay aboard; unpaid, they won't work their perk — js/crew.js asks `unpaid`). Wages come out
 * of the takings first, then your coins. Miss a day and they say so; miss two and staff walk out.
 *
 * Stock (`stock`: the goods it sells — fish at the fish stall, eggs and milk and honey at the bakery…): an open hour
 * uses `PER[kind]` units of it. Stock it from your pack (a fish, an egg: a unit; dearer things more) and it keeps its
 * whole margin; out of stock, its staff buy in at cost and the takings fall by a third (`BOUGHT`). Your catch and your
 * farm feed your businesses.
 *
 * Earnings are worked out from the clock in ten-minute steps from where they were left (up to a fortnight back), so
 * a business earns while you're away exactly as if you'd watched. State in localStorage `bridge_business`.
 */
var BridgeBusiness = (function () {
  var KEY = 'bridge_business';
  var STEP = 10 * 60000, BACK = 14 * 24 * 3600000, WEEK = 7 * 24 * 3600000;
  var TIERS = {
    hand:       { name: 'Hand', wage: [80, 150], run: 1.0, banks: false },
    manager:    { name: 'Manager', wage: [600, 1200], run: 1.6, banks: true },
    specialist: { name: 'Specialist', wage: [1500, 3000], run: 1.0, banks: false }
  };
  var SLOTS = { stall: 1, shop: 2, venue: 3, enterprise: 4, legacy: 4 };
  var NEEDS_MANAGER = { venue: 1, enterprise: 1, legacy: 1 };
  var PER = { stall: 2, shop: 4, venue: 6, enterprise: 8, legacy: 10 }, BOUGHT = 0.65;     // stock an open hour; bought in
  var TRADE = { food: 'Chef', fish: 'Fisher', drink: 'Cellarman', goods: 'Trader', gear: 'Outfitter', fun: 'Host', craft: 'Master wright', trade: 'Broker', odd: 'Oddity' };
  var NAMES = {
    lumar: ['Wenna Price', 'Tobin Marsh', 'Ada Fenwick', 'Hal Teague', 'Rosa Dunne', 'Ned Carrow', 'Ilse Penhale', 'Corin Vale', 'Molly Gage', 'Arlo Brisk'],
    arcadia: ['Juno Kade', 'Ryo Tanaka', 'Mika Voss', 'Dax Ferro', 'Lin Okada', 'Zee Marlowe', 'Kai Rezner', 'Nova Pike', 'Ash Imura', 'Vik Soren'],
    verdance: ['Bess Hollow', 'Will Thatcher', 'Peg Ainsley', 'Ben Furrow', 'Nell Cobb', 'Jem Barley', 'Tilly Rowan', 'Sam Hedge'],
    hoarfell: ['Ingrid Falk', 'Sten Hallo', 'Liv Varg', 'Oskar Frost', 'Britta Lund', 'Nils Rime', 'Siv Holm', 'Arne Kvist'],
    sylvara: ['Elowen', 'Thalion', 'Ilyra', 'Faerin', 'Sorrel', 'Aeris', 'Lindor', 'Nimue'],
    singularity: ['Someone', 'A shape', 'The echo of a clerk']
  };

  var defs = {}, state = {}, ready = false;
  function load() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { d = {}; }
    // an older save kept businesses at the top level: { <id>: {owned, last, level, manager} }
    if (!d.biz) {
      var biz = {}, any = false;
      Object.keys(d).forEach(function (k) { if (d[k] && d[k].owned) { biz[k] = d[k]; biz[k].old = true; any = true; } });
      d = { biz: biz, notice: any };
    }
    d.staff = d.staff || []; d.n = d.n || 0; d.paid = d.paid || 0; d.owed = d.owed || {}; d.log = d.log || [];
    return d;
  }
  state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ } }
  fetch('/bridge/assets/businesses.json?v=' + Date.now()).then(function (r) { return r.json(); })
    .then(function (d) { defs = d; Object.keys(defs).forEach(function (id) { defs[id].id = id; }); ready = true; tick(); })
    .catch(function () { defs = {}; });

  function C() { return typeof BridgeClock !== 'undefined' ? BridgeClock : null; }
  function P() { return typeof BridgeProgression !== 'undefined' ? BridgeProgression : null; }
  function toast(k, t, sub) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(k, t, sub); }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; }
  function today() { return C() ? Math.floor(C().etNow() / 86400000) : Math.floor(Date.now() / 86400000); }
  function dayOf(ms) { return C() ? Math.floor(C().etAt(ms) / 86400000) : Math.floor(ms / 86400000); }

  function find(worldId, label) {
    for (var id in defs) if (defs[id].world === worldId && defs[id].label === label) return defs[id];
    return null;
  }
  /** The business someone sells you in conversation (`owner`: their people.json id). */
  function ofOwner(personId) { for (var id in defs) if (defs[id].owner === personId) return defs[id]; return null; }
  function owned(id) { return !!(state.biz[id] && state.biz[id].owned); }
  function B(id) { return state.biz[id]; }
  function planetOf(id) { var d = defs[id]; return d && C() ? C().planet(d.world) : null; }

  // ---- when it's open --------------------------------------------------------------------------------------------
  /** How busy it is at a real moment: 0 shut … 1 open (Arcadia's crowd weighs its trade, up to 1.2 at the peak). */
  function openAt(id, ms) {
    var d = defs[id], h = d.hours || 'always';
    if (h === 'always') return 1;
    if (h === 'crowd') return C() ? 0.25 + C().bustleAt(ms) * 0.95 : 1;
    var planet = planetOf(id);
    if (!planet || !C() || !C().dayLen(planet) || typeof BridgeHours === 'undefined') return 1;
    var A = BridgeHours.anchors(planet), now = C().hoursAt(planet, ms);
    var from = typeof h[0] === 'number' ? h[0] * A.len : A[h[0]], to = typeof h[1] === 'number' ? h[1] * A.len : A[h[1]];
    return (from <= to ? (now >= from && now < to) : (now >= from || now < to)) ? 1 : 0;
  }
  function hoursText(id) {
    var d = defs[id], h = d.hours || 'always';
    if (h === 'always') return 'always open';
    if (h === 'crowd') return 'always open · busiest 8pm–1am ET';
    var planet = planetOf(id);
    if (!planet || typeof BridgeHours === 'undefined' || !C()) return '';
    var A = BridgeHours.anchors(planet), f = function (x) { return C().fmtHours(typeof x === 'number' ? x * A.len : A[x]); };
    return f(h[0]) + '–' + f(h[1]) + ' ' + C().PLANETS[planet].name + ' time';
  }

  // ---- who's working it -----------------------------------------------------------------------------------------
  function staffAt(id, ms) {
    ms = ms || Date.now();
    return state.staff.filter(function (p) { return p.at === id && (!p.arrives || p.arrives <= ms); });
  }
  function skillOf(p, ms) { return (p.skill || 1) * (1 + Math.min(0.3, ((ms || Date.now()) - (p.hired || Date.now())) / WEEK * 0.02)); }
  function crewManager(id) { var b = B(id); return b && b.manager && typeof BridgeCrew !== 'undefined' && BridgeCrew.isHired(b.manager) && !unpaid(b.manager) ? b.manager : null; }
  function upgradeMult(id) { var d = defs[id], b = B(id) || {}, m = 1; for (var i = 0; i < (b.level || 0) && i < d.upgrades.length; i++) m *= d.upgrades[i].mult; return m; }
  /** What working it is worth now: { run (× the rate, 0 = shut for want of staff), banks (to you as it comes) }. */
  function crewOf(id, ms, here) {
    var d = defs[id], list = staffAt(id, ms), mgr = list.filter(function (p) { return p.tier === 'manager'; })[0] || null;
    var crewMgr = crewManager(id);
    var base = mgr || crewMgr ? 1.6 : list.length ? 1 : here ? 1 : 0;
    if (NEEDS_MANAGER[d.kind] && !mgr && !crewMgr) base = here ? 0.5 : 0;                     // a venue runs on its manager
    if (!base) return { run: 0, banks: false };
    var sk = list.length ? list.reduce(function (a, p) { return a + skillOf(p, ms); }, 0) / list.length : 1;
    var lift = list.filter(function (p) { return p.tier === 'specialist'; }).reduce(function (a, p) { return a + (p.trade === d.trade ? 0.6 : 0.2); }, 0);
    return { run: (base + lift) * sk * upgradeMult(id), banks: !!(mgr || crewMgr) };
  }
  function perHour(id) { var c = crewOf(id, Date.now(), here(id)); return Math.round(defs[id].rate * (c.run || upgradeMult(id))); }
  function here(id) { return typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId && BridgeWorld.getWorldId() === defs[id].world; }
  // an engineer on the crew keeps everything running: twice the hours before takings stop piling up
  function cap(id) { return defs[id].cap * (typeof BridgeCrew !== 'undefined' && BridgeCrew.has('engineer') ? 2 : 1); }

  // ---- the takings: worked out from the clock, ten minutes at a time ----------------------------------------------
  function accrue(id, now) {
    var b = B(id), d = defs[id];
    if (!b || !d) return;
    var from = Math.max(b.last || now, now - BACK), t = from, inHere = here(id);
    var held = b.held || 0, bank = b.bank || 0, limit = d.rate * upgradeMult(id) * 1.6 * cap(id), made = 0;
    while (t < now) {
      var dt = Math.min(STEP, now - t), mid = t + dt / 2;
      var c = crewOf(id, mid, inHere && mid > now - 2 * STEP), o = c.run ? openAt(id, mid) : 0;
      if (o && typeof BridgeWeather !== 'undefined' && BridgeWeather.trade) o *= BridgeWeather.trade(d.world, mid);   // a storm empties the street
      if (o) {
        var f = 1;
        if (d.stock) {                                                          // its own stock first, then bought in at cost
          var need = (PER[d.kind] || 2) * Math.min(1, o) * dt / 3600000, used = Math.min(b.stock || 0, need);
          b.stock = (b.stock || 0) - used;
          f = need > 0 ? (used + (need - used) * BOUGHT) / need : 1;
        }
        var earn = d.rate * c.run * o * f * dt / 3600000 * lift(id, mid);
        if (c.banks) bank += earn; else held = Math.min(limit, held + earn);
        made += earn;
        b.today = (b.dayKey === dayOf(mid) ? b.today || 0 : 0) + earn; b.dayKey = dayOf(mid);
      }
      t += dt;
    }
    b.held = held; b.bank = bank; b.last = now; b.made = (b.made || 0) + made;
  }
  function pending(id) { if (!owned(id)) return 0; accrue(id, Date.now()); return Math.floor(B(id).held || 0); }
  // a day's trade lifted by the morning dispatch (js/dispatch.js): a market day, staff who heard a rival wanted the place
  function lift(id, ms) { return typeof BridgeDispatch !== 'undefined' && BridgeDispatch.lift ? BridgeDispatch.lift(id, ms) : 1; }

  // ---- payroll ---------------------------------------------------------------------------------------------------
  // Wages are paid a day ahead: the first on hiring, then one at each Eastern-time midnight (`state.paid` is the last
  // day settled). What's owed sits on each person (`owe`) until it's paid — from their business's takings first, then
  // your coins — and a payday that passes with it still owed counts against them (`missed`): one and they warn you,
  // two and staff walk out (crew stay aboard, but won't work their perk till they're paid: `unpaid`).
  function crewWage(id) { var all = typeof BridgePeople !== 'undefined' ? BridgePeople.all() : {}; var p = all[id]; return p && p.crew ? Math.round((p.crew.wage || 60) / 3) : 0; }
  function crewOwed(id) { var o = state.owed[id]; return o && typeof o === 'object' ? o : (state.owed[id] = { owe: 0, missed: 0 }); }
  function payroll() {
    var day = today();
    if (!state.paid) {                                                    // nothing owed for the days before this
      state.paid = day; save();
      var crew = typeof BridgeCrew !== 'undefined' ? BridgeCrew.list() : [];
      if (crew.length) toast('Crew', 'Your crew draw a daily wage now', 'A third of their signing fee each day, from tomorrow');
      return;
    }
    if (day > state.paid) {
      var days = Math.min(14, day - state.paid);
      state.paid = day;
      state.staff.slice().forEach(function (p) {
        if ((p.owe || 0) > 0) {
          p.missed = (p.missed || 0) + 1;
          if (p.missed >= 2) {
            state.staff = state.staff.filter(function (x) { return x !== p; });
            note(p.name + ' walked out: two paydays without wages');
            toast('Staff', p.name + ' has quit', 'Two paydays without wages');
            return;
          }
          toast('Wages', p.name + ' wasn\'t paid', 'Pay them before the next payday or they walk');
        }
        p.owe = (p.owe || 0) + p.wage * days;
      });
      if (typeof BridgeCrew !== 'undefined') BridgeCrew.list().forEach(function (c) {
        var w = crewWage(c.id), o = crewOwed(c.id);
        if (!w) return;
        if (o.owe > 0) { o.missed++; toast('Crew', c.name + ' is owed wages', 'They won\'t do their job till they\'re paid'); }
        o.owe += w * days;
      });
      // the hands aboard your ships (js/fleet.js): a quarter of their signing fee a day; two paydays unpaid, they go ashore
      if (typeof BridgeFleet !== 'undefined' && BridgeFleet.crew && BridgeFleet.wage) BridgeFleet.crew().forEach(function (c) {
        var key = 'hand:' + c.id, o = crewOwed(key);
        if (o.owe > 0) {
          o.missed++;
          if (o.missed >= 2) {
            BridgeFleet.dismiss(c.id); delete state.owed[key];
            note(c.name + ' went ashore: two paydays without wages');
            toast('Crew', c.name + ' has left the ship', 'Two paydays without wages');
            return;
          }
          toast('Wages', c.name + ' wasn\'t paid', 'Pay them before the next payday or they go ashore');
        }
        o.owe += BridgeFleet.wage(c) * days;
      });
      save();
    }
    settle();
  }
  /** Pays what's owed: out of each business's own takings, then your coins, one person at a time. */
  var settling = false;
  function settle() {
    if (settling) return;
    var who = state.staff.filter(function (p) { return p.owe > 0; }).map(function (p) { return { p: p }; })
      .concat(Object.keys(state.owed).filter(function (id) { return crewOwed(id).owe > 0; }).map(function (id) { return { crew: id, p: crewOwed(id) }; }));
    if (!who.length) return;
    who.forEach(function (x) {                                                          // the takings first
      var b = x.p.at ? B(x.p.at) : null;
      if (!b) return;
      var t = Math.min(x.p.owe, b.bank || 0); b.bank = (b.bank || 0) - t; x.p.owe -= t;
      var t2 = Math.min(x.p.owe, b.held || 0); b.held = (b.held || 0) - t2; x.p.owe -= t2;
      if (t + t2 > 0 && typeof BridgeTreasury !== 'undefined' && BridgeTreasury.internal) BridgeTreasury.internal(t + t2);
      if (x.p.owe < 0.5) { x.p.owe = 0; x.p.missed = 0; }
    });
    save();
    var left = who.filter(function (x) { return x.p.owe > 0; });
    if (!left.length || !P() || !P().wagerCoins) return;
    settling = true;
    var total = 0;
    (function next(i) {
      if (i >= left.length) {
        settling = false;
        if (total) note('Wages paid: ' + total + ' coins');
        save();
        return;
      }
      var x = left[i], amt = Math.ceil(x.p.owe);
      pay(amt, 'wages').then(function (r) {
        if (r.ok) { x.p.owe = 0; x.p.missed = 0; total += amt; next(i + 1); }
        else if (r.reason === 'no_pilot' || r.reason === 'no_client' || r.reason === 'error' || r.reason === 'offline') { settling = false; save(); }   // try again later
        else next(i + 1);                                                                // not enough coins: they wait
      });
    })(0);
  }
  function note(t) { state.log.unshift({ at: Date.now(), t: t }); state.log = state.log.slice(0, 20); }
  /** Crew who've gone a payday without wages don't work their perk till paid (js/crew.js). */
  function unpaid(crewId) { var o = state.owed[crewId]; return !!(o && o.owe > 0 && o.missed > 0); }
  function nameOfOwed(id, all) {
    if (id.indexOf('hand:') === 0) { var h = typeof BridgeFleet !== 'undefined' ? BridgeFleet.crew().filter(function (c) { return 'hand:' + c.id === id; })[0] : null; return h ? h.name : 'A former hand'; }
    return all[id] ? all[id].name : id;
  }
  /** What a hand aboard is owed (js/ledger.js). */
  function handOwed(crewId) { var o = state.owed['hand:' + crewId]; return o && typeof o === 'object' ? o : { owe: 0, missed: 0 }; }
  /** What you owe in wages now: { total, people: [{ name, owe, missed }] }. */
  function owing() {
    var all = typeof BridgePeople !== 'undefined' ? BridgePeople.all() : {};
    var people = state.staff.filter(function (p) { return p.owe > 0; }).map(function (p) { return { name: p.name, owe: Math.ceil(p.owe), missed: p.missed || 0 }; })
      .concat(Object.keys(state.owed).filter(function (id) { return crewOwed(id).owe > 0; })
        .map(function (id) { return { name: nameOfOwed(id, all), owe: Math.ceil(state.owed[id].owe), missed: state.owed[id].missed, crew: id }; }));
    return { total: people.reduce(function (a, p) { return a + p.owe; }, 0), people: people };
  }
  /** Pay everything owed now (the ledger's button). */
  function payAll() { settle(); }

  // ---- banking what managers take in ------------------------------------------------------------------------------
  var banking = false;
  function bankAll() {
    if (banking || !P() || !P().awardCoins) return;
    var total = 0, ids = [];
    Object.keys(state.biz).forEach(function (id) { var b = B(id); if (b && b.bank >= 1) { total += Math.floor(b.bank); ids.push(id); } });
    if (total < 1) return;
    banking = true;
    P().awardCoins(total, 'business:banked').then(function (bal) {
      banking = false;
      if (bal === null || bal === undefined) return;
      ids.forEach(function (id) { var b = B(id); b.banked = (b.banked || 0) + Math.floor(b.bank); b.bank -= Math.floor(b.bank); });
      save();
    }, function () { banking = false; });
  }

  function tick() {
    if (!ready) return;
    var now = Date.now();
    // a business bought before staff: what it had piled up (the old way: hours since collected, to the cap) is held
    Object.keys(state.biz).forEach(function (id) {
      var b = B(id);
      if (!b.old || !defs[id]) return;
      b.held = Math.min(cap(id), Math.max(0, now - (b.last || now)) / 3600000) * defs[id].rate * upgradeMult(id);
      b.last = now; delete b.old;
    });
    if (state.notice) {
      state.notice = false;
      toast('Business', 'Your businesses need staff now', 'Hire a hand or a manager at each one: open hours only');
      note('Businesses now earn only while open and staffed. Hire at each one.');
    }
    Object.keys(state.biz).forEach(function (id) { if (defs[id]) accrue(id, now); });
    payroll();
    bankAll();
    save();
  }
  setInterval(tick, 60000);

  // ---- hiring ----------------------------------------------------------------------------------------------------
  function region(id) { var d = defs[id]; if (!d) return 'lumar'; var p = planetOf(id) || d.loc; return NAMES[p] ? p : d.loc === 'singularity' ? 'singularity' : 'lumar'; }
  /** Today's people looking for work at this business: a hand, a manager (where there's room for one) and a specialist. */
  function candidates(id) {
    var d = defs[id], day = today(), out = [], names = NAMES[region(id)];
    ['hand', 'manager', 'specialist'].forEach(function (tier, i) {
      var h = hash(day + ':' + id + ':' + tier), T = TIERS[tier];
      var skill = 0.88 + h * 0.3, wage = Math.round((T.wage[0] + (T.wage[1] - T.wage[0]) * h) / 10) * 10;
      var key = day + ':' + id + ':' + tier;
      if (state.staff.some(function (p) { return p.key === key; })) return;          // taken already today
      out.push({ key: key, tier: tier, name: names[(Math.floor(hash(day + ':' + id + 'n') * names.length) + i) % names.length], skill: skill, wage: wage,
                 trade: tier === 'specialist' ? d.trade : null,
                 title: tier === 'specialist' ? (TRADE[d.trade] || 'Specialist') : T.name });
    });
    return out;
  }
  function room(id) { return staffAll(id).length < (SLOTS[defs[id].kind] || 1); }
  /** What someone (a candidate or one of your staff) does at a business, in numbers. */
  function perkOf(p, id) {
    var d = defs[id] || {}, sk = Math.round((p.skill || 1) * 100) + '%';
    if (p.tier === 'manager') return 'runs it at ×1.6 and banks the takings to you · works at ' + sk;
    if (p.tier === 'specialist') return (p.trade === d.trade ? '+60% here, in their own trade' : '+20% (their trade is ' + (TRADE[p.trade] || p.trade) + ')') + ' · works at ' + sk;
    return 'keeps it open; holds ' + (d.cap || 8) + 'h of takings for you to collect · works at ' + sk;
  }
  /** How to draw their face (js/look.js): dressed for where they work, coloured by their place in it. */
  var DRESS = { lumar: 'coat', arcadia: 'runner', hoarfell: 'thermal', verdance: 'ranger', sylvara: 'mystic', singularity: 'plate' };
  function faceOf(p, id) {
    var r = region(id);
    return { seed: p.name + ':' + p.key, style: DRESS[r] || 'coat', colour: { hand: 'white', manager: 'gold', specialist: 'purple' }[p.tier] || 'white', wild: r === 'arcadia' };
  }
  function staffAll(id) { return state.staff.filter(function (p) { return p.at === id; }); }
  /** Takes someone on: their first day's wage now, then one each Eastern-time day. Resolves { ok, staff | reason }. */
  function hire(id, cand) {
    if (!room(id)) return Promise.resolve({ ok: false, reason: 'full' });
    payroll();                                             // settle any day that's turned first, so they start square
    return pay(cand.wage, 'wages:hire').then(function (r) {
      if (!r.ok) return r;
      if (!room(id)) return { ok: false, reason: 'full' };
      accrue(id, Date.now());
      var p = { id: 's' + (++state.n), key: cand.key, name: cand.name, tier: cand.tier, title: cand.title, trade: cand.trade, wage: cand.wage,
                skill: cand.skill, at: id, hired: Date.now(), missed: 0, owe: 0 };
      state.staff.push(p);
      if (!state.paid) state.paid = today();
      note(p.name + ' hired at ' + defs[id].name + ' (' + p.title.toLowerCase() + ', ' + p.wage + ' a day)');
      save();
      return { ok: true, staff: p };
    });
  }
  /** Someone working for you somewhere that isn't a business — the smiths at your Workshop (js/workshop.js, `at:
   *  'workshop'`): on the same payroll as everyone else, their first day's wage now and one each Eastern-time day; two
   *  paydays unpaid and they walk out. Resolves { ok, staff | reason }. */
  function engage(place, cand) {
    if (state.staff.some(function (p) { return p.key === cand.key; })) return Promise.resolve({ ok: false, reason: 'taken' });
    payroll();
    return pay(cand.wage, 'wages:hire').then(function (r) {
      if (!r.ok) return r;
      var p = { id: 's' + (++state.n), key: cand.key, name: cand.name, tier: cand.tier, title: cand.title, grade: cand.grade, wage: cand.wage,
                skill: cand.skill || 1, at: place, hired: Date.now(), missed: 0, owe: 0 };
      state.staff.push(p);
      if (!state.paid) state.paid = today();
      note(p.name + ' taken on (' + p.title.toLowerCase() + ', ' + p.wage + ' a day)');
      save();
      return { ok: true, staff: p };
    });
  }
  function dismiss(staffId) {
    var p = state.staff.filter(function (x) { return x.id === staffId; })[0];
    if (!p) return;
    if (p.at) accrue(p.at, Date.now());
    state.staff = state.staff.filter(function (x) { return x !== p; });
    note(p.name + ' let go');
    save();
  }
  /** Send someone to another business of yours: by the next hour on the same planet, by tomorrow anywhere else. */
  function move(staffId, toId) {
    var p = state.staff.filter(function (x) { return x.id === staffId; })[0];
    if (!p || !owned(toId) || !room(toId)) return { ok: false };
    if (p.at) accrue(p.at, Date.now());
    accrue(toId, Date.now());
    var same = planetOf(p.at) && planetOf(p.at) === planetOf(toId);
    p.at = toId; p.arrives = Date.now() + (same ? 3600000 : 24 * 3600000);
    note(p.name + ' sent to ' + defs[toId].name);
    save();
    return { ok: true, same: same };
  }

  // ---- buying, upgrading, collecting ------------------------------------------------------------------------------
  function pay(amount, why) {
    return P() && P().wagerCoins ? P().wagerCoins(amount, why).then(function (r) { return r || { ok: false, reason: 'error' }; }, function () { return { ok: false, reason: 'error' }; })
                                 : Promise.resolve({ ok: false, reason: 'offline' });
  }
  /** Yours without buying it here: the Starling, built from your holm's book (js/holm.js). */
  function grant(id) {
    if (!defs[id] || owned(id)) return;
    state.biz[id] = { owned: Date.now(), last: Date.now(), level: 0, manager: null, held: 0, bank: 0 };
    if (!state.paid) state.paid = today();
    note('Opened ' + defs[id].name);
    save();
  }
  function buy(id) {
    return pay(defs[id].price, 'business:' + id).then(function (r) {
      if (r.ok) { state.biz[id] = { owned: Date.now(), last: Date.now(), level: 0, manager: null, held: 0, bank: 0 }; if (!state.paid) state.paid = today(); note('Bought ' + defs[id].name); save(); }
      return r;
    });
  }
  function nextUpgrade(id) { var b = B(id) || {}; return defs[id].upgrades[b.level || 0] || null; }
  function upgrade(id) {
    var u = nextUpgrade(id);
    if (!u) return Promise.resolve({ ok: false, reason: 'maxed' });
    accrue(id, Date.now());
    return pay(u.cost, 'business-upgrade:' + id).then(function (r) { if (r.ok) { B(id).level = (B(id).level || 0) + 1; save(); } return r; });
  }
  function collect(id) {
    var amount = pending(id);
    if (amount <= 0) return Promise.resolve({ ok: false, reason: 'nothing' });
    var paid = P() && P().awardCoins ? P().awardCoins(amount, 'business:' + id) : Promise.resolve(null);
    return paid.then(function (bal) {
      if (bal === null || bal === undefined) return { ok: false, reason: 'offline' };
      B(id).held = Math.max(0, (B(id).held || 0) - amount);
      save();
      return { ok: true, amount: amount };
    }, function () { return { ok: false, reason: 'offline' }; });
  }
  // ---- stock -------------------------------------------------------------------------------------------------------
  function unitsOf(item) { var I = typeof BridgeItems !== 'undefined' && BridgeItems.get(item); return Math.max(1, Math.round(((I && I.value) || 8) / 10)); }
  /** What you carry that it sells: [{ id, n, units }]. */
  function stockable(id) {
    var d = defs[id];
    if (!d || !d.stock || typeof BridgeInventory === 'undefined') return [];
    return d.stock.map(function (it) { var n = BridgeInventory.getCount(it); return { id: it, n: n, units: n * unitsOf(it) }; }).filter(function (x) { return x.n > 0; });
  }
  /** Everything you carry that it sells, into its stock. Resolves to { units, items }. */
  function restock(id) {
    var b = B(id), list = stockable(id), units = 0;
    if (!b || !list.length) return { units: 0, items: [] };
    accrue(id, Date.now());
    list.forEach(function (x) { if (BridgeInventory.removeItem(x.id, x.n) !== false) units += x.units; });
    b.stock = (b.stock || 0) + units;
    note('Stocked ' + defs[id].name + ': ' + units + ' units');
    save();
    return { units: units, items: list };
  }
  /** Stock brought in by one of your ships (js/orders.js, a supply run): [{ id, n }] into its stock. Returns the units. */
  function supply(id, items) {
    var b = B(id), d = defs[id];
    if (!b || !d || !d.stock) return 0;
    accrue(id, Date.now());
    var units = 0;
    (items || []).forEach(function (x) { units += (x.n || 0) * unitsOf(x.id); });
    b.stock = (b.stock || 0) + units;
    b.supplied = (b.supplied || 0) + units;
    note(d.name + ' stocked by a supply run: ' + units + ' units');
    save();
    return units;
  }
  /** Sold to someone who asked (the morning dispatch, js/dispatch.js): the staff there let go, what's waiting paid out
   *  with the price. Resolves { ok, amount }. */
  function sellTo(id, price) {
    if (!owned(id)) return Promise.resolve({ ok: false, reason: 'not_yours' });
    accrue(id, Date.now());
    var b = B(id), amount = Math.floor(price + (b.held || 0) + (b.bank || 0));
    var paid = P() && P().awardCoins ? P().awardCoins(amount, 'business-sold:' + id) : Promise.resolve(null);
    return paid.then(function (bal) {
      if (bal === null || bal === undefined) return { ok: false, reason: 'offline' };
      state.staff.filter(function (p) { return p.at === id; }).forEach(function (p) { state.staff = state.staff.filter(function (x) { return x !== p; }); });
      delete state.biz[id];
      note('Sold ' + defs[id].name + ' for ' + amount);
      save();
      return { ok: true, amount: amount };
    }, function () { return { ok: false, reason: 'offline' }; });
  }
  /** Its stock now: { units, hours (open hours it lasts) } — null if it sells nothing you could stock. */
  function stockOf(id) { var d = defs[id], b = B(id); if (!d || !d.stock) return null; var u = Math.floor((b && b.stock) || 0); return { units: u, hours: Math.floor(u / (PER[d.kind] || 2)), per: PER[d.kind] || 2 }; }

  /** Crew members free to run a business (not already running one, and paid up). */
  function freeCrew() {
    if (typeof BridgeCrew === 'undefined') return [];
    var busy = {};
    for (var id in state.biz) if (state.biz[id].manager) busy[state.biz[id].manager] = true;
    return BridgeCrew.list().filter(function (c) { return !busy[c.id] && !unpaid(c.id); });
  }
  function assign(id, personId) { accrue(id, Date.now()); B(id).manager = personId; save(); }

  // ---- what the ledger, journal and chart read ------------------------------------------------------------------------
  function status(id) {
    var now = Date.now(), c = crewOf(id, now, here(id)), o = openAt(id, now);
    var d = defs[id], st = staffAll(id);
    return { open: o > 0, running: c.run > 0, banks: c.banks, staff: st, room: SLOTS[d.kind] || 1, hours: hoursText(id),
             today: B(id) && B(id).dayKey === today() ? Math.round(B(id).today || 0) : 0, banked: Math.round(B(id) && B(id).banked || 0),
             wages: st.reduce(function (a, p) { return a + p.wage; }, 0), needsManager: !!NEEDS_MANAGER[d.kind] };
  }
  function summary() {
    return Object.keys(defs).filter(owned).map(function (id) {
      var d = defs[id], b = B(id), s = status(id);
      var mgr = b.manager && typeof BridgePeople !== 'undefined' && BridgePeople.all()[b.manager];
      var lead = s.staff.filter(function (p) { return p.tier === 'manager'; })[0];
      return { id: id, name: d.name, loc: d.loc, world: d.world, pending: pending(id), perHour: perHour(id),
               manager: lead ? lead.name : mgr ? mgr.name : s.staff.length ? s.staff[0].name : null, status: s };
    });
  }

  return { find: find, owned: owned, pending: pending, cap: cap, perHour: perHour, nextUpgrade: nextUpgrade, buy: buy, grant: grant,
           upgrade: upgrade, collect: collect, freeCrew: freeCrew, assign: assign, summary: summary, status: status,
           candidates: candidates, hire: hire, engage: engage, dismiss: dismiss, move: move, room: room, staff: function (id) { return id ? staffAll(id) : state.staff.slice(); },
           openNow: function (id) { return openAt(id, Date.now()) > 0; }, hoursText: hoursText, stockable: stockable, restock: restock, stockOf: stockOf, supply: supply, sellTo: sellTo, unitsOf: unitsOf, PER: PER, BOUGHT: BOUGHT, perkOf: perkOf, faceOf: faceOf, unpaid: unpaid, owing: owing, payAll: payAll, handOwed: handOwed, crewWage: crewWage,
           get: function (id) { return defs[id] || null; }, ofOwner: ofOwner, TIERS: TIERS, SLOTS: SLOTS, log: function () { return state.log; },
           state: function (id) { return state.biz[id] || null; }, _tick: tick, _state: function () { return state; },
           all: function () { return Object.keys(defs).map(function (id) { return defs[id]; }); } };     // every business there is (js/ledger.js)
})();
