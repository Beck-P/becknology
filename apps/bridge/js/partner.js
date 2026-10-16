/**
 * BridgePartner — partners, and visiting each other's places. "Separate but open to each other": each pilot keeps
 * their own homes, island and farm; partners can walk into any of them, any time, the owner there or not.
 *
 * - Partners: from someone's menu, *Be partners* — they say yes, and each keeps the other in `bridge_partners`.
 * - Visiting: a partner's places (their cottages, their Starling Holm, their farm on Verdance) are listed on their
 *   card (the players pill, online or not), and *Go to* takes you into theirs when they're in one. While you're
 *   there the modules that run those places (js/home.js, holm.js, farm.js, homestead.js, animals.js — `KEYS`) read
 *   and write the owner's state instead of yours: localStorage reads and writes of just those keys are routed to a
 *   copy of theirs (from them if they're online, else their cloud save, js/cloud.js), each module re-reads
 *   (`reload()`), and every change you make goes back to the owner — live to their client if they're online (it's
 *   their save; they apply it and push it), else straight into their cloud save. Their own changes while you're there
 *   come to you the same way. Leave their place and your own come back.
 * - What's theirs stays theirs: no reading their island's ledger or emptying its strongbox; what you harvest, catch
 *   or pick up is yours (it lands in your pack), what you plant, water and build is in their place.
 *
 *   BridgePartner.is(id) / .list() / .visit(ownerId, worldId[, then]) / .leave() / .visiting()
 */
var BridgePartner = (function () {
  var KEY = 'bridge_partners';
  var KEYS = { bridge_homes: 'BridgeHome', bridge_holm: 'BridgeHolm', bridge_farm: 'BridgeFarm', bridge_homestead: 'BridgeHomestead', bridge_animals: 'BridgeAnimals' };
  // which keys each place needs, and the set of worlds a visit covers (leave them and the visit ends)
  var PLACES = {
    'lumar-holm':      { keys: ['bridge_holm', 'bridge_homes'], worlds: ['lumar-holm', 'lumar-holm-home'], name: 'Starling Holm' },
    'lumar-holm-home': { keys: ['bridge_holm', 'bridge_homes'], worlds: ['lumar-holm', 'lumar-holm-home'], name: 'the cottage on the holm' },
    'lumar-home':      { keys: ['bridge_homes'], worlds: ['lumar-home'], name: 'the house in Lumar' },
    'arcadia-home':    { keys: ['bridge_homes'], worlds: ['arcadia-home'], name: 'the flat in Arcadia' },
    'verdance-home':   { keys: ['bridge_homes', 'bridge_farm', 'bridge_homestead', 'bridge_animals'], worlds: ['verdance', 'verdance-home'], name: 'the farmhouse' },
    'verdance':        { keys: ['bridge_farm', 'bridge_homestead', 'bridge_animals', 'bridge_homes'], worlds: ['verdance', 'verdance-home'], name: 'the farm on Verdance' }
  };

  function N() { return typeof BridgeNet !== 'undefined' ? BridgeNet : null; }
  function M() { return typeof BridgeMulti !== 'undefined' ? BridgeMulti : null; }
  function cap(t) { return M() ? M().cap(t) : t; }
  function me() { var n = N(); return n && n.me(); }
  function choose(spec) { if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.choose) BridgeInteractions.choose(spec); }
  function say(t, x) { if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.say) BridgeInteractions.say(t, x); }
  function toast(a, b, c) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(a, b, c); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(n); }

  // ---- the lens: those few keys, routed to the place's owner while you're in it ---------------------------------
  var get0 = Storage.prototype.getItem, set0 = Storage.prototype.setItem;
  var V = null;                                       // { owner, name, keys: {k: 1}, data: {k: string}, worlds: {w: 1}, place }
  function isLocal(s) { try { return s === window.localStorage; } catch (e) { return false; } }
  Storage.prototype.getItem = function (k) {
    if (V && V.keys[k] && isLocal(this)) return V.data[k] == null ? null : V.data[k];
    return get0.call(this, k);
  };
  Storage.prototype.setItem = function (k, v) {
    if (KEYS[k] && isLocal(this)) {
      if (V && V.keys[k]) { V.data[k] = String(v); outgoing(k, String(v)); return; }
      set0.call(this, k, v);
      mine(k, String(v));
      return;
    }
    return set0.call(this, k, v);
  };
  window.__lsGet = function (k) { return get0.call(localStorage, k); };
  window.__lsSet = function (k, v) { return set0.call(localStorage, k, v); };
  function reload(keys) {
    keys.forEach(function (k) { var mod = window[KEYS[k]]; if (mod && mod.reload) { try { mod.reload(); } catch (e) { console.warn('[partner] reload', k, e); } } });
  }

  // your change to their place: to them if they're on, else into their cloud save (a moment later, all at once)
  var later = {}, laterT = 0;
  function outgoing(k, v) {
    var n = N(), owner = V.owner;
    if (n && n.peer(owner)) { n.send('pset', { owner: owner, k: k, v: v }, owner); return; }
    later[k] = v;
    clearTimeout(laterT);
    laterT = setTimeout(function () { flushLater(owner); }, 1500);
  }
  function flushLater(owner) {
    var ks = Object.keys(later);
    if (!ks.length || typeof BridgeCloud === 'undefined') return Promise.resolve();
    var batch = later; later = {};
    return ks.reduce(function (p, k) { return p.then(function () { return BridgeCloud.write(owner, k, batch[k]); }); }, Promise.resolve());
  }
  // your own change, while a partner's in your place: they see it too
  function mine(k, v) {
    var n = N(), m = me();
    if (!n || !m) return;
    n.peers().forEach(function (p) { if (p.visiting === m.id) n.send('pset', { owner: m.id, k: k, v: v }, p.id); });
  }

  // ---- partners --------------------------------------------------------------------------------------------------
  function load() { try { return JSON.parse(get0.call(localStorage, KEY) || '{}') || {}; } catch (e) { return {}; } }
  function store(p) { try { set0.call(localStorage, KEY, JSON.stringify(p)); } catch (e) { /* */ } }
  function is(id) { return !!load()[id]; }
  function list() { var p = load(); return Object.keys(p).map(function (id) { return { id: id, name: p[id].name, since: p[id].since }; }); }
  function link(id, name) { var p = load(); p[id] = { name: name, since: Date.now() }; store(p); }
  function unlink(id) { var p = load(); delete p[id]; store(p); }
  function ask(id) {
    var n = N(), m = me();
    if (!n || !m) return;
    n.send('partner-ask', { name: m.name }, id);
    toast('Partners', 'Asking ' + nameOf(id), 'Your places open to each other if they say yes');
  }
  function nameOf(id) { var n = N(), p = n && n.peer(id), l = load()[id]; return cap(p ? p.name : l ? l.name : 'them'); }

  // ---- their places ------------------------------------------------------------------------------------------------
  // what they own, from their save: { world: label }
  function placesIn(data) {
    var out = [], parse = function (k) { try { return JSON.parse(data[k] || 'null') || {}; } catch (e) { return {}; } };
    var homes = parse('bridge_homes'), holm = parse('bridge_holm'), stead = parse('bridge_homestead');
    if (holm.owned) out.push({ world: 'lumar-holm', label: holm.name || 'Starling Holm', sub: 'their island' });
    if (holm.owned && holm.built && holm.built.house) out.push({ world: 'lumar-holm-home', label: 'The cottage on ' + (holm.name || 'the holm'), sub: 'their home' });
    if (stead.owned) out.push({ world: 'verdance', label: stead.name || 'The farm on Verdance', sub: 'their farm' });
    ['lumar-home', 'arcadia-home', 'verdance-home'].forEach(function (w) { if (homes.owned && homes.owned[w]) out.push({ world: w, label: cap(PLACES[w].name), sub: 'their home' }); });
    return out;
  }
  // their latest: from them if they're on, else their cloud save
  function fetchTheirs(owner, keys) {
    var n = N();
    if (n && n.peer(owner)) {
      return new Promise(function (res) {
        var rid = Math.random().toString(36).slice(2), done = false;
        waits[rid] = function (d) { if (done) return; done = true; res(d); };
        n.send('pget', { rid: rid, keys: keys }, owner);
        setTimeout(function () { if (!done) { done = true; delete waits[rid]; cloud(owner).then(res); } }, 2500);
      });
    }
    return cloud(owner);
  }
  var waits = {};
  function cloud(owner) { return typeof BridgeCloud !== 'undefined' ? BridgeCloud.peek(owner, true).then(function (d) { return d || {}; }) : Promise.resolve({}); }

  function places(owner) {
    var who = nameOf(owner);
    fetchTheirs(owner, ['bridge_homes', 'bridge_holm', 'bridge_homestead']).then(function (data) {
      var list = placesIn(data || {});
      choose({ title: who + '\'s places', text: list.length ? 'YOU CAN GO IN ANY TIME - THEY\'RE OPEN TO YOU.' : (who + ' DOESN\'T OWN ANYWHERE YET.').toUpperCase(),
               rows: list.map(function (pl) { return { label: pl.label, sub: pl.sub, pick: function () { go(owner, pl.world); } }; }),
               buttons: [], closeLabel: 'Done' });
    });
  }
  function go(owner, world) {
    if (typeof BridgeSloop !== 'undefined' && BridgeSloop.isRunning && BridgeSloop.isRunning()) { toast('Visiting', 'Not at sea', 'Tie up first'); return; }
    visit(owner, world, function () {
      BridgeWorld.load(world, function () { BridgeState.transition('world', { worldId: world, spawn: null }); sfx('door'); });
    });
  }

  /** Step into a partner's place: their state for its modules, then `then()` (load the world). */
  function visit(owner, world, then) {
    var P = PLACES[world];
    if (!P) { if (then) then(); return; }
    if (!is(owner)) { toast('Visiting', 'Not yet', 'Be partners first - then their places are open to you'); return; }
    var keys = P.keys;
    fetchTheirs(owner, keys).then(function (data) {
      if (V) leave(true);
      V = { owner: owner, name: nameOf(owner), keys: {}, data: {}, worlds: {}, place: P.name, arriving: Date.now() };
      keys.forEach(function (k) { V.keys[k] = 1; V.data[k] = data && data[k] != null ? data[k] : null; });
      P.worlds.forEach(function (w) { V.worlds[w] = 1; });
      if (M()) M().setVisiting(owner);
      if (N()) N().set({ visiting: owner });
      reload(keys);
      toast('Visiting', nameOf(owner) + '\'s ' + P.name.replace(/^the /, ''), 'It\'s theirs - you\'re welcome any time');
      if (then) then();
    });
  }
  /** Back to your own (leaving their place). */
  function leave(quiet) {
    if (!V) return;
    var keys = Object.keys(V.keys), owner = V.owner, name = V.name;
    flushLater(owner);
    V = null;
    if (M()) M().setVisiting(null);
    if (N()) N().set({ visiting: null });
    reload(keys);
    if (!quiet) toast('Home again', 'Your own places', 'You left ' + name + '\'s');
  }
  // leaving their place (by any door, any boat) ends the visit
  setInterval(function () {
    if (!V || typeof BridgeState === 'undefined' || BridgeState.getState() !== 'world') return;
    var w = BridgeWorld.getWorldId();
    if (V.arriving) {                                  // still on the way in (their world loading): don't count where you were
      if (w && V.worlds[w]) V.arriving = 0;
      else if (Date.now() - V.arriving > 15000) leave(true);
      return;
    }
    if (w && !V.worlds[w]) leave();
  }, 500);

  // ---- what's theirs stays theirs ----------------------------------------------------------------------------------
  if (typeof BridgeHolm !== 'undefined' && BridgeHolm.use) {
    var holmUse = BridgeHolm.use;
    BridgeHolm.use = function (it) {
      if (V && it && /^(deed|warehouse|quarters|ledger)$/.test(it.act)) return say(it.label || 'THE LEDGER', (V.name + '\'S BOOKS AND STRONGBOX, IN ' + V.name + '\'S HAND. NOT YOURS TO READ.').toUpperCase());
      return holmUse.apply(this, arguments);
    };
  }

  // ---- the wire ----------------------------------------------------------------------------------------------------
  function wire() {
    var n = N();
    if (!n) return;
    n.on('partner-ask', function (d, from) {
      var who = cap(d && d.name || nameOf(from));
      choose({ title: who + ' asks to be partners', text: 'YOUR HOMES, YOUR ISLAND AND YOUR FARM OPEN TO EACH OTHER - VISIT ANY TIME, HELP OUT, EVEN WHEN THE OTHER IS AWAY. EVERYTHING STAYS YOUR OWN.',
               buttons: [{ label: 'Yes', act: function () { link(from, d && d.name || who); n.send('partner-yes', { name: me() && me().name }, from); toast('Partners ♥', who, 'Your places are open to each other'); sfx('quest'); } },
                         { label: 'Not now', act: function () { n.send('partner-no', {}, from); } }], closeLabel: 'Not now' });
    });
    n.on('partner-yes', function (d, from) { link(from, d && d.name || nameOf(from)); toast('Partners ♥', nameOf(from), 'Your places are open to each other'); sfx('quest'); });
    n.on('partner-no', function (d, from) { toast('Partners', nameOf(from) + ' said not now', ''); });
    n.on('pget', function (d, from) {
      if (!d || !is(from)) return;
      var out = {};
      (d.keys || []).forEach(function (k) { if (KEYS[k]) out[k] = get0.call(localStorage, k); });
      n.send('pval', { rid: d.rid, data: out }, from);
    });
    n.on('pval', function (d) { var f = d && waits[d.rid]; if (f) { delete waits[d.rid]; f(d.data || {}); } });
    n.on('pset', function (d, from) {
      if (!d || !KEYS[d.k]) return;
      var m = me();
      if (m && d.owner === m.id && is(from)) {                        // a partner changed something in your place
        set0.call(localStorage, d.k, d.v);
        if (!V || !V.keys[d.k]) reload([d.k]);
      } else if (V && V.owner === from && d.owner === from && V.keys[d.k]) {   // the owner changed something where you are
        V.data[d.k] = d.v;
        reload([d.k]);
      }
    });
    n.on('leave', function (p, id) { if (V && V.owner === id) { /* they went offline: carry on, writes go to their cloud save */ } });
  }

  // ---- menus --------------------------------------------------------------------------------------------------------
  if (typeof BridgeMulti !== 'undefined') {
    BridgeMulti.addMenu(function (id, p, remote) {
      var out = [];
      if (is(id)) {
        out.push({ label: nameOf(id) + '\'s places', act: function () { places(id); return false; } });
        if (V && V.owner === id && !/^verdance/.test(BridgeWorld.getWorldId() || '')) { /* in their place already */ }
        if (typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId && BridgeWorld.getWorldId() === 'verdance') {
          if (V && V.owner === id) out.push({ label: 'Back to your own farm', act: function () { leave(); } });
          else out.push({ label: 'Tend ' + nameOf(id) + '\'s farm', act: function () { visit(id, 'verdance', function () { if (V) V.arriving = 0; }); } });
        }
      } else if (!remote && p) out.push({ label: 'Be partners', act: function () { ask(id); } });
      return out;
    });
    BridgeMulti.guard.personal = function (p) { return is(p.id) && PLACES[p.world] ? '' : PLACES[p.world] ? 'be partners first' : 'their ship'; };
    BridgeMulti.guard.visit = function (owner, world, go) { if (PLACES[world] && is(owner)) visit(owner, world, go); else toast('Visiting', 'Not yet', 'Be partners first'); };
    BridgeMulti.friends = function () { return list(); };
  }
  wire();

  return { is: is, list: list, visit: visit, leave: leave, places: places, go: go, visiting: function () { return V && { owner: V.owner, name: V.name, place: V.place }; },
           _V: function () { return V; } };
})();
