/**
 * BridgeBusiness — businesses you can own (assets/businesses.json).
 *
 * Each is tied to an interaction in a world ({world, label}); using it
 * opens its ledger: buy it, and it earns while you're away (`rate` coins
 * an hour, holding at most `cap` hours of takings until you collect),
 * upgrade it, or put one of your crew in charge (half as much again).
 * Coins move through BridgeProgression (wagerCoins to pay, awardCoins to
 * collect); what you own is kept in localStorage.
 */
var BridgeBusiness = (function () {
  var KEY = 'bridge_business';
  var defs = {}, state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { state = {}; }
  fetch('/bridge/assets/businesses.json?v=' + Date.now()).then(function (r) { return r.json(); })
    .then(function (d) { defs = d; Object.keys(defs).forEach(function (id) { defs[id].id = id; }); }).catch(function () { defs = {}; });

  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ } }

  function find(worldId, label) {
    for (var id in defs) if (defs[id].world === worldId && defs[id].label === label) return defs[id];
    return null;
  }

  function owned(id) { return !!(state[id] && state[id].owned); }
  function mult(id) {
    var d = defs[id], s = state[id] || {}, m = 1;
    for (var i = 0; i < (s.level || 0) && i < d.upgrades.length; i++) m *= d.upgrades[i].mult;
    return m * (s.manager ? 1.5 : 1);
  }
  function perHour(id) { return Math.round(defs[id].rate * mult(id)); }
  // an engineer on the crew keeps everything running: twice the hours before takings stop piling up
  function cap(id) { return defs[id].cap * (typeof BridgeCrew !== 'undefined' && BridgeCrew.has('engineer') ? 2 : 1); }
  function pending(id) {
    if (!owned(id)) return 0;
    var hours = Math.min(cap(id), (Date.now() - state[id].last) / 3600000);
    return Math.floor(defs[id].rate * mult(id) * hours);
  }
  function nextUpgrade(id) { var s = state[id] || {}; return defs[id].upgrades[s.level || 0] || null; }

  function pay(amount, why) {
    return typeof BridgeProgression !== 'undefined' && BridgeProgression.wagerCoins
      ? BridgeProgression.wagerCoins(amount, why).then(function (r) { return r || { ok: false }; }, function () { return { ok: false }; })
      : Promise.resolve({ ok: false, reason: 'offline' });
  }

  function buy(id) {
    return pay(defs[id].price, 'business:' + id).then(function (r) {
      if (r.ok) { state[id] = { owned: Date.now(), last: Date.now(), level: 0, manager: null }; save(); }
      return r;
    });
  }

  function upgrade(id) {
    var u = nextUpgrade(id);
    if (!u) return Promise.resolve({ ok: false, reason: 'maxed' });
    var earned = pending(id);                     // bank what's accrued at the old rate first
    return pay(u.cost, 'business-upgrade:' + id).then(function (r) {
      if (r.ok) {
        state[id].level = (state[id].level || 0) + 1;
        if (earned > 0) state[id].last = Date.now() - earned / (defs[id].rate * mult(id)) * 3600000;
        save();
      }
      return r;
    });
  }

  function collect(id) {
    var amount = pending(id);
    if (amount <= 0) return Promise.resolve({ ok: false, reason: 'nothing' });
    var paid = typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins
      ? BridgeProgression.awardCoins(amount, 'business:' + id) : Promise.resolve(null);
    return paid.then(function (bal) {
      if (bal === null || bal === undefined) return { ok: false, reason: 'offline' };
      state[id].last = Date.now();
      save();
      return { ok: true, amount: amount };
    }, function () { return { ok: false, reason: 'offline' }; });
  }

  /** Crew members free to run a business (not already running one). */
  function freeCrew() {
    if (typeof BridgeCrew === 'undefined') return [];
    var busy = {};
    for (var id in state) if (state[id].manager) busy[state[id].manager] = true;
    return BridgeCrew.list().filter(function (c) { return !busy[c.id]; });
  }

  function assign(id, personId) {
    var earned = pending(id);
    state[id].manager = personId;
    if (earned > 0) state[id].last = Date.now() - earned / (defs[id].rate * mult(id)) * 3600000;
    save();
  }

  function summary() {
    return Object.keys(defs).filter(owned).map(function (id) {
      var d = defs[id], s = state[id];
      var mgr = s.manager && typeof BridgePeople !== 'undefined' && BridgePeople.all()[s.manager];
      return { id: id, name: d.name, loc: d.loc, world: d.world, pending: pending(id), perHour: perHour(id),
               manager: mgr ? mgr.name : null };
    });
  }

  return { find: find, owned: owned, pending: pending, cap: cap, perHour: perHour, nextUpgrade: nextUpgrade, buy: buy,
           upgrade: upgrade, collect: collect, freeCrew: freeCrew, assign: assign, summary: summary,
           state: function (id) { return state[id] || null; },
           all: function () { return Object.keys(defs).map(function (id) { return defs[id]; }); } };     // every business there is (js/ledger.js)
})();
