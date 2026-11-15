/**
 * BridgeUses — what a thing is for (spec-deeper-worlds X1). Beck: "it's not super clear on what to actually do with
 * everything." Every item's *Uses*, in the places a player already looks: the Backpack's item card (js/inventory.js,
 * under what it's worth), a shop's row (the vendor dialog, js/interactions.js) and the Collection's entry (js/codex.js).
 *
 * Nothing here is written by hand: each line comes from data the game already holds, so it stays right when that data
 * changes —
 *   the Workshop     recipes it goes into (js/workshop.js RECIPES), and a favour someone asks before teaching a plan (SHOPS)
 *   brewing          Mirelle's brews (js/brewing.js RECIPES)
 *   the makers       what someone makes of yours: apples into cider, honey into candles, grapes, wheat, flour, milk
 *                    (js/makers.js, js/village.js MAKES)
 *   the farm         a seed's crop and how long it takes (js/farm.js CROPS)
 *   gifts            who loves it (js/gifts.js TASTES) — by name once you've met them, "someone in Brambleford" before
 *   the Collection   its set and how far along you are (js/codex.js setOf)
 *   businesses       which of yours stock it, or one for sale that would (assets/businesses.json `stock`)
 *   orders           the farm's board and Arcadia's kitchens (js/homestead.js, js/makers.js ORDERS)
 *   the fair         the Harvest Fair's show (assets/festivals.json `entries`)
 *   trade            crated for a port's market, and where it's dearest (js/trade.js GOODS / HAUL / MARKET)
 *   the hall         a find that goes on show in your hall (js/trophies.js T); implants made of a trophy (js/implants.js)
 *   what it does     eaten or drunk (its `effects`, a potion's `works`), a weapon, a tool, a plan, a part, a map; carried
 *                    (an item's `carried.text`: a lantern after dark), decor you made (`decor.text`), a fish tank's
 *                    (js/aquarium.js `ok`), loved by anyone (js/gifts.js ALL_LOVE), Wren's fire arrows (js/worlds/sylvara.js)
 * and, when none of that is true and it has a value, plainly: only worth selling (who pays best is the line above it,
 * BridgeStorage.worthLine). `orphans()` lists those — the to-do for whoever builds next.
 *
 * The index is built once (and again only if the data it reads arrives later: people, businesses, festivals load as
 * fetches); what changes as you play — who you've met, what you own, how far a set is — is read as the lines are drawn.
 *
 *   BridgeUses.lines(id, { skip }) → [{ k, t (HTML), p }]   most useful first
 *   BridgeUses.html(id, { max, skip }) → the card's Uses block ('' if nothing)
 *   BridgeUses.short(id) → one line for a shop's row ('' if nothing)
 *   BridgeUses.onlySale(id) / orphans()
 */
var BridgeUses = (function () {
  var idx = null, idxKey = '';
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function item(id) { return typeof BridgeItems !== 'undefined' ? BridgeItems.get(id) : null; }
  function nameOf(id) { var it = item(id); return it ? it.name : String(id).replace(/_/g, ' '); }
  function has(g) { return typeof window[g] !== 'undefined'; }
  function people() { return has('BridgePeople') && BridgePeople.all ? BridgePeople.all() || {} : {}; }
  function count(o) { return o ? (Array.isArray(o) ? o.length : Object.keys(o).length) : 0; }

  // ---- the index: id → the facts about what it's for -------------------------------------------------------------
  function keyNow() {
    return [count(people()), has('BridgeBusiness') && BridgeBusiness.all ? BridgeBusiness.all().length : 0,
            has('BridgeFestivals') && BridgeFestivals.all ? count(BridgeFestivals.all()) : 0, has('BridgeItems') ? count(BridgeItems.all()) : 0,
            has('BridgeQuests') && BridgeQuests.defs ? count(BridgeQuests.defs()) : 0].join(':');
  }
  function index() {
    var k = keyNow();
    if (idx && k === idxKey) return idx;
    idxKey = k;
    var I = {};
    function add(id, f) { if (id) (I[id] = I[id] || []).push(f); }
    try {
      var P = people(), wkey = {};
      Object.keys(P).forEach(function (pid) { (P[pid].topics || []).forEach(function (t) { if (t.workshop) wkey[t.workshop] = pid; }); });
      if (has('BridgeWorkshop')) {
        var R = BridgeWorkshop.RECIPES || {};
        Object.keys(R).forEach(function (r) { Object.keys(R[r].in || {}).forEach(function (id) { add(id, { k: 'make', r: r }); }); });
        var S = BridgeWorkshop.SHOPS || {};
        Object.keys(S).forEach(function (key) {
          (S[key].favours || []).forEach(function (fv) { Object.keys(fv.want || {}).forEach(function (id) { add(id, { k: 'favour', pid: wkey[key] || key, r: fv.r, n: fv.want[id] }); }); });
        });
      }
      if (has('BridgeBrewing')) (BridgeBrewing.RECIPES || []).forEach(function (r) { r.takes.forEach(function (t) { add(t[0], { k: 'brew', out: r.id, n: t[1] }); }); });
      [has('BridgeMakers') && BridgeMakers.MAKES, has('BridgeVillage') && BridgeVillage.MAKES, has('BridgeRose') && BridgeRose.MAKES, has('BridgeSylvara') && BridgeSylvara.MAKES].forEach(function (list) {
        (list || []).forEach(function (m) { add(m.in, { k: 'makes', n: m.n, out: m.out, where: m.where }); });
      });
      if (has('BridgeFarm') && BridgeFarm.CROPS) {
        Object.keys(BridgeFarm.CROPS).forEach(function (c) { if (item('seed_' + c)) add('seed_' + c, { k: 'plant', crop: c, days: BridgeFarm.CROPS[c].days, out: (BridgeFarm.CROPS[c].out[0] || [])[0] }); });
      }
      if (has('BridgeGifts') && BridgeGifts.TASTES) {
        var T = BridgeGifts.TASTES;
        Object.keys(T).forEach(function (pid) { (T[pid].love || []).forEach(function (id) { add(id, { k: 'gift', pid: pid }); }); });
        (BridgeGifts.ALL_LOVE || []).forEach(function (id) { add(id, { k: 'giftall' }); });      // loved by anyone (the silk scarf)
      }
      // what lives in a fish tank at home (js/aquarium.js): the fish, crabs and shrimp — and a goldfish won at the scoop
      if (has('BridgeAquarium') && BridgeAquarium.ok && has('BridgeItems')) Object.keys(BridgeItems.all()).forEach(function (id) { if (BridgeAquarium.ok(id)) add(id, { k: 'tank' }); });
      if (has('BridgeBusiness') && BridgeBusiness.all) BridgeBusiness.all().forEach(function (d) { (d.stock || []).forEach(function (id) { add(id, { k: 'biz', biz: d.id, name: d.name }); }); });
      if (has('BridgeHomestead') && BridgeHomestead.ORDERS) BridgeHomestead.ORDERS.forEach(function (o) { add(o.item, { k: 'order', board: 'farm', who: o.who }); });
      if (has('BridgeMakers') && BridgeMakers.ORDERS) BridgeMakers.ORDERS.forEach(function (o) { add(o.item, { k: 'order', board: 'export', who: o.who }); });
      if (has('BridgeFestivals') && BridgeFestivals.all) {
        var F = BridgeFestivals.all() || {};
        Object.keys(F).forEach(function (fid) {
          ((F[fid] && (F[fid].contests || (F[fid].contest ? [F[fid].contest] : []))) || []).forEach(function (c) {
            if (c && c.kind === 'show') Object.keys(c.entries || {}).forEach(function (id) { add(id, { k: 'show', fest: F[fid].name, season: F[fid].season || (F[fid].when === 'fullmoon' ? 'full moon' : '') }); });
          });
        });
      }
      // what a module says its own things are for (`USES`: { id, t, p } — the rosettes' roll of honour, js/festivals.js)
      [has('BridgeFestivals') && BridgeFestivals.USES, has('BridgeArcadiaDeep') && BridgeArcadiaDeep.USES, has('BridgeVillage') && BridgeVillage.USES, has('BridgeDeeper') && BridgeDeeper.USES, has('BridgeFarDeep') && BridgeFarDeep.USES].forEach(function (list) { (list || []).forEach(function (u) { add(u.id, { k: 'own', t: u.t, p: u.p }); }); });
      if (has('BridgeTrade')) {
        var M = BridgeTrade.MARKET || {}, G = BridgeTrade.GOODS || {}, H = BridgeTrade.HAUL || {};
        Object.keys(G).concat(Object.keys(H)).forEach(function (id) {
          var key = G[id] ? id : H[id].kind, best = null;
          Object.keys(M).forEach(function (port) { var a = M[port][key]; if (a && (!best || a > best.a)) best = { port: port, a: a }; });
          add(id, { k: 'trade', port: best && best.a > 1.05 ? best.port : null });
        });
      }
      if (has('BridgeTrophies') && BridgeTrophies.T) Object.keys(BridgeTrophies.T).forEach(function (id) { add(id, { k: 'hall' }); });
      // someone in particular who buys it (a `sell` topic in people.json), beyond the best price on the worth line
      Object.keys(P).forEach(function (pid) { (P[pid].topics || []).forEach(function (t) { (t.sell || []).forEach(function (b) { add(b.id, { k: 'buyer', pid: pid, price: b.price }); }); }); });
      // what a module wants it for (`WANTS`: { id, n, who, world, what } — Maison Vautrin and the pelts, js/alpine.js)
      [has('BridgeAlpine') && BridgeAlpine.WANTS].forEach(function (list) { (list || []).forEach(function (w) { add(w.id, { k: 'want', who: w.who, world: w.world, what: w.what }); }); });
      // the yetis of Hoarfell's hidden valley, fed once a day (js/valley.js FOODS; TREATS win their trust faster)
      if (has('BridgeValley') && BridgeValley.FOODS) BridgeValley.FOODS.forEach(function (id) { add(id, { k: 'yeti', treat: (BridgeValley.TREATS || {})[id] || 0 }); });
      // a quest step that takes it from your pack (quests.json, a clue's `takes`)
      if (has('BridgeQuests') && BridgeQuests.defs) {
        var QD = BridgeQuests.defs();
        Object.keys(QD).forEach(function (qid) { (QD[qid].clues || []).forEach(function (c) { Object.keys(c.takes || {}).forEach(function (id) { add(id, { k: 'quest', q: qid, title: QD[qid].title, n: c.takes[id], clue: c.id }); }); }); });
      }
      if (has('BridgeImplants') && BridgeImplants.CATALOG) {
        var C = BridgeImplants.CATALOG;
        Object.keys(C).forEach(function (k2) { if (C[k2].item) add(C[k2].item, { k: 'implant', name: C[k2].name }); });
      }
    } catch (e) { /* a module that's changed shape: the rest still count */ }
    return (idx = I);
  }

  // ---- in words ----------------------------------------------------------------------------------------------------
  function first(p) {                                              // a first name; "Old Ludd", "Mr Pike", "Captain Desh" stay whole
    var n = p.name || '', w = n.split(/[ ,]/)[0];
    return w === 'The' ? n : /^(Old|Salt|Mother|Captain|Commodore|Inspector|Doc|Dr|Mr|Ms|Mrs|Lord|Lady|Sergeant|Master|Bosun|Cutter|Gull|Mama)$/.test(w) ? n.split(' ').slice(0, 2).join(' ') : w;
  }
  function the(n) { return String(n || '').replace(/^The /, 'the '); }    // "the Glasshouse", mid-sentence
  function place(world) {
    if (!world) return '';
    return the(has('BridgeMap') && BridgeMap.placeName ? BridgeMap.placeName(world) : String(world).replace(/-/g, ' '));
  }
  function who(pid) {                                              // a name once you've met them; before, where they are
    var p = people()[pid];
    if (!p) return null;
    var met = has('BridgePeople') && BridgePeople.met && BridgePeople.met(pid);
    if (met) return { met: true, t: first(p) };
    var w = (p.at && p.at[0] || {}).world;
    return { met: false, t: w ? 'someone in ' + place(w) : 'someone you haven\'t met' };
  }
  function list(names, max) {                                      // "a, b and c" / "a, b and 3 more"
    max = max || 3;
    if (names.length > max) return names.slice(0, max - 1).join(', ') + ' and ' + (names.length - max + 1) + ' more';
    return names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0] || '';
  }
  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function rname(r) { return has('BridgeWorkshop') && BridgeWorkshop.name ? BridgeWorkshop.name(r) : r; }
  function owned(biz) { return has('BridgeBusiness') && BridgeBusiness.owned && BridgeBusiness.owned(biz); }
  function seasonWord(s) { return s ? ' (' + s + ')' : ''; }

  // the facts, grouped and worded: [{ k, t, p }] — p is how useful, highest first
  function lines(id, opts) {
    opts = opts || {};
    var skip = opts.skip || {}, it = item(id), facts = index()[id] || [], out = [];
    if (!it) return out;
    var by = {};
    facts.forEach(function (f) { (by[f.k] = by[f.k] || []).push(f); });
    function push(k, p, t) { if (!skip[k]) out.push({ k: k, p: p, t: t }); }

    (by.favour || []).forEach(function (f) {
      var w = who(f.pid), wt = w ? (w.met ? '<b>' + esc(w.t) + '</b>' : esc(cap(w.t))) : 'Someone';
      push('favour', 10, '<b>A favour:</b> ' + wt + ' teaches you ' + esc(the(rname(f.r)).replace(/^(?!the )/, 'the ')) + ' for ' + f.n);
    });
    if (by.make) {
      var R = has('BridgeWorkshop') ? BridgeWorkshop.RECIPES : {};
      var rs = by.make.map(function (f) { var x = R[f.r]; return x && x.kind === 'make' && x.out ? nameOf(x.out[0]) : the(rname(f.r)); }).filter(function (n, i, a) { return a.indexOf(n) === i; });
      push('make', 9, '<b>Workshop:</b> goes into ' + esc(list(rs, 3)));
    }
    if (by.brew) push('brew', 9, '<b>Brew it</b> with Mirelle: ' + esc(list(by.brew.map(function (f) { return nameOf(f.out); }), 3)));
    (by.makes || []).forEach(function (f) { push('makes', 9, '<b>Made into</b> ' + esc(nameOf(f.out)) + ' at ' + esc(f.where) + (f.n > 1 ? ' (' + f.n + ' at a time)' : '')); });
    (by.plant || []).forEach(function (f) { push('plant', 9, '<b>Plant it</b> on the farm: ' + esc(nameOf(f.out || f.crop)) + ' in ' + f.days + (f.days === 1 ? ' day' : ' days')); });
    (by.implant || []).forEach(function (f) { push('implant', 9, '<b>An implant:</b> a chop shop builds it into ' + esc(f.name)); });
    if (it.type === 'plan' && /^plan_/.test(id)) push('plan', 9, '<b>A plan:</b> carry it to your Workshop and it teaches you ' + esc(the(rname(id.slice(5))).replace(/^(?!the )/, 'the ')));
    if (it.type === 'part') push('part', 9, '<b>A ship\'s part:</b> a harbourmaster fits it to one of yours');
    if (it.type === 'wonder') push('wonder', 9, '<b>A wonder:</b> it goes in the Cabinet of Wonders in your hall');
    if (/^tmap_/.test(id)) push('map', 9, '<b>A treasure map:</b> follow it to where something\'s buried');
    (by.quest || []).forEach(function (f) {
      if (has('BridgeQuests') && BridgeQuests.has && (BridgeQuests.has(f.q) || BridgeQuests.has(f.q + '/' + f.clue))) return;   // (done, or that step's given: not wanted any more)
      push('quest', 9, '<b>A quest:</b> ' + esc(f.title) + ' wants ' + f.n);
    });
    (by.want || []).forEach(function (f) { push('want', 8, '<b>Wanted</b> at ' + esc(f.who) + (f.world ? ' (' + esc(place(f.world)) + ')' : '') + ': ' + esc(f.what)); });
    if (by.buyer) {
      var bs = by.buyer.map(function (f) { var w = who(f.pid); return w ? (w.met ? w.t : cap(w.t)) : null; }).filter(function (n, i, a) { return n && a.indexOf(n) === i; });
      if (bs.length) push('buyer', 4, '<b>Bought by</b> ' + esc(list(bs, 3)) + ', for more than a trader pays');
    }
    (by.yeti || []).slice(0, 1).forEach(function (f) {
      push('yeti', f.treat ? 7 : 3, '<b>A yeti</b> in Hoarfell\'s hidden valley takes it, once a day' + (f.treat ? ', and trusts you ' + (f.treat === 2 ? 'twice' : f.treat + ' times') + ' as fast for it' : ''));
    });
    if (by.order) {
      var boards = [];
      if (by.order.some(function (f) { return f.board === 'farm'; })) boards.push('the farm\'s board');
      if (by.order.some(function (f) { return f.board === 'export'; })) boards.push('Arcadia\'s kitchens');
      push('order', 8, '<b>Orders:</b> ' + boards.join(' and ') + ' want it some days, for well over a sale');
    }
    var mine = (by.biz || []).filter(function (f) { return owned(f.biz); });
    if (mine.length) push('biz', 8, '<b>Stock</b> for your ' + esc(list(mine.map(function (f) { return f.name.replace(/^The /, ''); }), 2)) + ': restock it there');
    var eat = it.effects && (it.effects.hp || it.effects.energy);
    if (it.works) push('eat', 7, '<b>Drink it:</b> ' + esc(it.works));
    else if (eat && typeof it.onUse === 'function') {
      var fx = []; if (it.effects.hp) fx.push('+' + it.effects.hp + ' health'); if (it.effects.energy) fx.push('+' + it.effects.energy + ' energy');
      push('eat', 7, '<b>' + (it.type === 'drink' ? 'Drink' : 'Eat') + ' it:</b> ' + fx.join(', '));
    }
    var set = has('BridgeCodex') && BridgeCodex.setOf ? BridgeCodex.setOf(id) : null;
    if (set) push('set', set.done ? 4 : 6, '<b>Collection:</b> ' + esc(set.name) + ' · ' + set.have + ' of ' + set.of + (set.done ? ', complete' : ''));
    if (by.giftall) push('gift', 6, '<b>Loved as a gift</b> by anyone you give it to');
    else if (by.gift) {
      var ws = by.gift.map(function (f) { return who(f.pid); }).filter(Boolean);
      var met = ws.filter(function (w) { return w.met; }).map(function (w) { return w.t; });
      var unmet = {};
      ws.filter(function (w) { return !w.met; }).forEach(function (w) { unmet[w.t] = (unmet[w.t] || 0) + 1; });
      var names = met.concat(Object.keys(unmet).map(function (t) { return unmet[t] > 1 ? t.replace(/^someone/, unmet[t] + ' people') : t; }));
      if (names.length) push('gift', 5, '<b>Loved as a gift</b> by ' + esc(list(names, 3)));
    }
    (by.own || []).forEach(function (f) { push('own', f.p || 5, f.t); });
    (by.show || []).slice(0, 1).forEach(function (f) { push('show', 5, '<b>Show it</b> at ' + esc(the(f.fest)) + seasonWord(f.season)); });
    if (by.hall) push('hall', 5, '<b>A find:</b> it goes on show in your hall');
    if (it.carried && it.carried.text) push('carry', 7, '<b>Carry it:</b> ' + esc(it.carried.text));      // in your pack, it does something (a lantern after dark)
    if (it.decor && it.decor.text) push('decor', 7, '<b>Decor:</b> ' + esc(it.decor.text));              // what you made is a piece to put up (js/items.js decorUse)
    if (by.tank) push('tank', it.effects ? 3 : 7, '<b>A fish tank:</b> put it in one of yours at home, aboard or in any place you own');
    if (!it.decor && !it.works && !eat && !by.plant && typeof it.onUse === 'function' && it.type !== 'plan' && !/^tmap_/.test(id)) {
      push('use', 4, it.type === 'weapon' ? '<b>A weapon:</b> hold it and strike' : '<b>Use it</b> from the hotbar');
    }
    if (by.trade && by.trade[0]) {
      var tp = by.trade[0].port;
      push('trade', 3, '<b>Trade:</b> crate it into a ship\'s hold' + (tp ? '; dearest at ' + esc(place(tp)) : ''));
    }
    var other = (by.biz || []).filter(function (f) { return !owned(f.biz); });
    if (other.length && !mine.length) push('biz', 2, '<b>Stock</b> for ' + (other.length > 1 ? other.length + ' businesses you could buy, like ' : '') + esc(the(other[0].name)) + (other.length > 1 ? '' : ', a business you could buy'));
    out.sort(function (a, b) { return b.p - a.p; });
    return out;
  }
  /** Worth something, and good for nothing else. */
  function onlySale(id) { var it = item(id); return !!(it && it.value > 0 && !lines(id).length); }
  function html(id, opts) {
    opts = opts || {};
    var L = lines(id, opts), max = opts.max || 3;
    if (!L.length) return onlySale(id) ? '<div class="uses uses-sale"><b>Only worth selling.</b> Nothing\'s made of it yet.</div>' : '';
    var li = function (x) { return '<li>' + x.t + '</li>'; };
    return '<div class="uses"><div class="uses-h">Uses</div><ul>' + L.slice(0, max).map(li).join('') + '</ul>' +
      (L.length > max ? '<details class="uses-more"><summary>and ' + (L.length - max) + ' more</summary><ul>' + L.slice(max).map(li).join('') + '</ul></details>' : '') + '</div>';
  }
  /** A shop row's line: the two most useful, as plain text (escape it to show it). */
  function short(id) {
    var L = lines(id, { skip: { eat: 1, use: 1, set: 1 } }).slice(0, 2);
    return L.map(function (x) {
      return x.t.replace(/<[^>]+>/g, '').replace(/&(amp|lt|gt|quot);/g, function (m, e) { return { amp: '&', lt: '<', gt: '>', quot: '"' }[e]; });
    }).join(' · ');
  }
  /** Everything worth something that's only worth selling: [{ id, name, value }]. */
  function orphans() {
    var all = has('BridgeItems') ? BridgeItems.all() : {};
    return Object.keys(all).filter(onlySale).map(function (id) { return { id: id, name: all[id].name, value: all[id].value }; })
      .sort(function (a, b) { return b.value - a.value; });
  }
  return { lines: lines, html: html, short: short, onlySale: onlySale, orphans: orphans, _index: index };
})();
