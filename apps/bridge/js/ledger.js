/**
 * BridgeLedger — the Ledger tab of the game menu (L): everything you run, own and employ, in one book.
 *
 *   Needs you     what wants your attention now: takings piled up (a business at its cap stops earning), ships home
 *                 with a profit in the strongbox, ripe crops, eggs and milk waiting, the shipping bin, contracts due,
 *                 a battered hull — each with where, and a Map button to find it
 *   Businesses    every business there is: yours with what it earns an hour, what's waiting and who runs it; ones
 *                 you've found but don't own with their price; the rest blocked out until you've been where they are
 *   Staff         everyone working for you — business staff, ship's hands, crew, farm hands — with their faces, what
 *                 each does and costs a day, what their workplace made today, what's owed (and a button to pay it);
 *                 tap someone to move them or let them go. The staff board in the captain's office opens the book
 *                 here (js/worlds/office.js, which pins the same people's faces to it: `roster`)
 *   People        who you can hire: your crew (where they stand, what they do for you), the farm's hands, the hands
 *                 aboard your ships; anyone you haven't met yet is a shadow with a hint where to look
 *   Fleet         every ship: where she lies (or how long till she's home), hull, hold, fish hold, hands
 *   Places        your homes, the farm, the holm and what's built on it, the Workshop and what's being made there
 *   Contracts     what you've promised to carry, where, by when
 *
 * It only reads: each module keeps its own state (js/business.js, crew.js, fleet.js, holm.js, homestead.js, farm.js,
 * animals.js, trade.js, home.js, workshop.js). Registered as a page with BridgeMenu.
 */
var BridgeLedger = (function () {
  var page = null;
  function has(n) { return typeof window[n] !== 'undefined'; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }
  function cap(t) { return String(t || '').toLowerCase().replace(/(^|\s|-)([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); }); }
  function placeOf(w) { return has('BridgeMap') && BridgeMap.placeName ? BridgeMap.placeName(w) : cap(String(w).replace(/-/g, ' ')); }
  function been(w) { return !!w && has('BridgeMap') && BridgeMap.visited ? BridgeMap.visited(w) : false; }
  function regionOf(w) { return has('BridgeMap') && BridgeMap.regionOf ? BridgeMap.regionOf(w) : ''; }
  function mapBtn(w) { return w && been(w) ? '<button type="button" class="gm-btn gm-btn-sm lg-go" data-w="' + esc(w) + '">Map</button>' : ''; }
  function section(title, count, body, cls) {
    return '<section class="jn-sec' + (cls ? ' ' + cls : '') + '"><div class="jn-sec-head"><span class="jn-sec-title">' + esc(title) + '</span>' +
      (count !== '' && count != null ? '<span class="jn-count">' + count + '</span>' : '') + '</div>' + body + '</section>';
  }
  // one line of the ledger: a name, what it's doing, a figure on the right, a Map button; `dim` for what you can't see yet
  // (o.face: their portrait, js/look.js; o.act: what clicking the row does — a person you can manage)
  var acts = [];
  function row(o) {
    var face = o.face ? '<canvas class="lg-face" width="24" height="24" data-seed="' + esc(o.face.seed) + '" data-style="' + esc(o.face.style) + '" data-colour="' + esc(o.face.colour) + '"' + (o.face.wild ? ' data-wild="1"' : '') + '></canvas>' : '';
    var act = o.act ? ' data-act="' + (acts.push(o.act) - 1) + '"' : '';
    return '<li class="lg-row' + (o.dim ? ' lg-dim' : '') + (o.alert ? ' lg-alert' : '') + (o.act ? ' lg-act' : '') + '"' + act + '>' + face + '<div class="lg-main"><b>' + esc(o.name) + '</b>' +
      (o.sub ? '<span>' + esc(o.sub) + '</span>' : '') + '</div>' + (o.fig ? '<div class="lg-fig">' + o.fig + '</div>' : '') + mapBtn(o.world) + '</li>';
  }
  function list(rows) { return '<ul class="lg-list">' + rows.map(row).join('') + '</ul>'; }
  function coins(n) { return Math.round(n).toLocaleString() + ' <i class="lg-c">c</i>'; }
  function ago(ms) { var m = Math.round(ms / 60000); return m < 60 ? m + ' min' : Math.round(m / 60) + ' h'; }

  // ---- what needs you -----------------------------------------------------------------------------------------------
  function needs() {
    var out = [];
    if (has('BridgeBusiness') && BridgeBusiness.all) BridgeBusiness.all().forEach(function (d) {
      if (!BridgeBusiness.owned(d.id)) return;
      var p = BridgeBusiness.pending(d.id), full = p >= BridgeBusiness.perHour(d.id) * BridgeBusiness.cap(d.id) * 0.98;
      var st = BridgeBusiness.status ? BridgeBusiness.status(d.id) : null;
      if (st && !st.running && !st.staff.length) out.push({ name: d.name, sub: st.needsManager ? 'Shut: it won\'t open without a manager' : 'Shut: nobody working it — hire a hand there', world: d.world, alert: true });
      else if (p >= Math.max(20, BridgeBusiness.perHour(d.id) * 2) || full)
        out.push({ name: d.name, sub: full ? 'Full — it\'s stopped earning until you collect' : 'Takings waiting to collect', fig: coins(p), world: d.world, alert: full });
    });
    if (has('BridgeBusiness') && BridgeBusiness.owing) {
      var ow = BridgeBusiness.owing();
      if (ow.total > 0) out.push({ name: 'Wages owed', sub: ow.people.map(function (x) { return x.name + (x.missed ? ' (missed a payday)' : ''); }).join(', ') + ' — paid from takings, then your coins, as soon as there\'s enough', fig: coins(ow.total), alert: ow.people.some(function (x) { return x.missed; }) });
    }
    if (has('BridgeHolm') && BridgeHolm.owned && BridgeHolm.owned()) {
      if (BridgeHolm.returns) BridgeHolm.returns();
      var chest = BridgeHolm._state().chest || 0;
      if (chest > 0) out.push({ name: 'The strongbox on ' + BridgeHolm.name(), sub: 'What your ships brought home', fig: coins(chest), world: 'lumar-holm-home' });
    }
    if (has('BridgeWorkshop') && BridgeWorkshop.built()) {
      var ws = BridgeWorkshop.summary();
      if (ws.since) out.push({ name: 'Made at the workshop', sub: ws.since + ' thing' + (ws.since === 1 ? '' : 's') + ' since you last looked — on the racks on ' + BridgeHolm.name(), world: 'lumar-holm' });
      if (ws.idle) out.push({ name: 'Idle at the forge', sub: ws.idle + ' smith' + (ws.idle === 1 ? '' : 's') + ' with nothing to make — queue something at the workshop', world: 'lumar-holm', alert: true });
    }
    if (has('BridgeFleet')) BridgeFleet.all().forEach(function (s) {
      if (s.away) return;
      if (s.hull < 0.5) out.push({ name: s.name, sub: 'Hull at ' + Math.round(s.hull * 100) + '% — any harbourmaster mends her', world: worldOfShip(s), alert: s.hull < 0.25 });
      var fish = BridgeFleet.catchCount ? BridgeFleet.catchCount(s) : 0;
      if (fish > 0) out.push({ name: s.name + '\'s fish hold', sub: fish + ' fish to land or sell', world: worldOfShip(s) });
    });
    var farm = has('BridgeFarm') ? BridgeFarm.journal() : { rows: [] }, ripe = 0, dry = 0;
    farm.rows.forEach(function (r) { ripe += r.ripe; dry += r.dry; });
    if (ripe) out.push({ name: 'Ripe on the farm', sub: ripe + ' ready to pick', world: 'verdance' });
    if (dry && !(has('BridgeHomestead') && BridgeHomestead.active && BridgeHomestead.active('tam'))) out.push({ name: 'Thirsty rows', sub: dry + ' planted tiles have dried out — water them, or hire Tam', world: 'verdance' });
    var herd = has('BridgeAnimals') ? BridgeAnimals.journal() : [], ready = herd.filter(function (a) { return a.ready; }).length;
    if (ready) out.push({ name: 'In the barnyard', sub: ready + (ready === 1 ? ' animal has' : ' animals have') + ' eggs or milk for you', world: 'verdance' });
    if (has('BridgeTrade')) {
      var d0 = BridgeTrade.today();
      BridgeTrade.mine().forEach(function (c) {
        if (c.due - d0 <= 1) out.push({ name: 'Contract: ' + c.n + ' ' + BridgeTrade.name(c.good), sub: 'To ' + portName(c.to) + (c.due === d0 ? ' — due today' : ' — due tomorrow'), fig: coins(c.fee), world: c.to, alert: c.due === d0 });
      });
    }
    return out;
  }
  function portName(id) { var I = has('BridgeVoyage') && BridgeVoyage._isles; return I && I[id] ? I[id].name : placeOf(id); }
  function worldOfShip(s) { return s.at || null; }

  // ---- businesses ---------------------------------------------------------------------------------------------------
  function businesses() {
    if (!has('BridgeBusiness') || !BridgeBusiness.all) return { html: '', n: '' };
    var all = BridgeBusiness.all(), mine = 0, today = 0, wages = 0;
    var rows = all.map(function (d) {
      if (BridgeBusiness.owned(d.id)) {
        var s = BridgeBusiness.state(d.id) || {}, p = BridgeBusiness.pending(d.id), ph = BridgeBusiness.perHour(d.id), full = p >= ph * BridgeBusiness.cap(d.id) * 0.98;
        var st = BridgeBusiness.status(d.id), mgr = s.manager && has('BridgePeople') ? (BridgePeople.all()[s.manager] || {}).name : null;
        var who = st.staff.map(function (x) { return x.name + ' (' + x.title.toLowerCase() + ')'; });
        if (mgr) who.unshift(mgr + ' (crew)');
        mine++; today += st.today; wages += st.wages;
        return { name: d.name, sub: placeOf(d.world) + ' · ' + (st.open ? 'open' : 'shut') + ', ' + st.hours +
                 ' · ' + (st.running ? ph + ' an open hour' : 'nobody working it') + (s.level ? ' · improved ×' + s.level : '') +
                 ' · ' + (who.length ? who.join(', ') : 'no staff') + ' · ' + st.today + ' today' +
                 (BridgeBusiness.stockOf && BridgeBusiness.stockOf(d.id) ? ' · ' + (BridgeBusiness.stockOf(d.id).units ? 'stock for ' + BridgeBusiness.stockOf(d.id).hours + ' open hours' : 'out of stock, buying in') : '') +
                 (st.banks ? ' · banked to you' : full ? ' · FULL' : p ? ' · ' + p + ' waiting' : ''),
                 fig: st.banks ? coins(st.banked) : coins(p), world: d.world, alert: full || !st.running };
      }
      if (d.built === 'holm' && been(d.world)) return { name: d.name, sub: 'Build it from your island\'s ledger · ~' + d.rate + ' an open hour', fig: coins(d.price), world: d.world };
      if (been(d.world)) return { name: d.name, sub: 'For sale · ' + placeOf(d.world) + ' · ' + BridgeBusiness.hoursText(d.id) + ' · ~' + d.rate + ' an open hour' +
                                  (d.owner && has('BridgePeople') && BridgePeople.all()[d.owner] ? ' · ask ' + BridgePeople.all()[d.owner].name : ''), fig: coins(d.price), world: d.world };
      var reg = regionOf(d.world);
      return { name: '? ? ?', sub: 'A business you haven\'t found' + (reg ? ' — somewhere in ' + reg : ''), dim: true };
    });
    rows.sort(function (a, b) { return (!!a.dim - !!b.dim); });
    return { html: list(rows) + (mine ? '<div class="lg-total">Yours: ' + mine + ' · ' + today.toLocaleString() + ' coins made today · wages ' + wages.toLocaleString() + ' a day</div>' : ''), n: mine + ' / ' + all.length };
  }

  // ---- legacy: the long goals (js/legacy.js) -------------------------------------------------------------------------
  function legacy() {
    if (!has('BridgeLegacy')) return { html: '', n: '' };
    var g = BridgeLegacy.list(), done = g.filter(function (x) { return x.done; }).length;
    return { html: list(g.map(function (x) {
      return { name: x.name, sub: x.done ? 'Done' : x.how + (x.progress ? ' · ' + x.progress : ''), world: x.world,
               fig: x.done ? '<span class="lg-ok">yours</span>' : x.price ? coins(x.price) : '' };
    })), n: done + ' / ' + g.length };
  }

  // ---- staff and payroll: everyone working for you, what they cost and what they bring in ---------------------------
  function closeMenu() { if (has('BridgeMenu') && BridgeMenu.close) BridgeMenu.close(); }
  var HAND_COLOUR = { deckhand: 'white', gunner: 'red', navigator: 'cyan', rigger: 'green', fighter: 'purple', purser: 'gold' };
  function handFace(c) { return { seed: c.name + ':' + c.id, style: 'coat', colour: HAND_COLOUR[c.role] || 'white' }; }
  /** What everyone working for you costs a day, what your businesses made today and what's owed (here, and the office's
   *  strongbox). */
  function payroll() {
    var B = has('BridgeBusiness') ? BridgeBusiness : null, F = has('BridgeFleet') ? BridgeFleet : null, wages = 0;
    if (B && B.staff) B.staff().forEach(function (x) { wages += x.wage; });
    if (F && F.crew && F.wage) F.crew().forEach(function (c) { wages += F.wage(c); });
    if (B && B.crewWage && has('BridgeCrew')) BridgeCrew.list().forEach(function (c) { wages += B.crewWage(c.id); });
    return { wages: wages, made: B ? B.summary().reduce(function (a, b) { return a + b.status.today; }, 0) : 0,
             owed: B && B.owing ? B.owing() : { total: 0, people: [] } };
  }
  /** Everyone working for you, for the staff board in the captain's office (js/worlds/office.js): their name, how to draw
   *  their face (`face` for js/look.js, or the `sheet` of a crew member), and how they are — 'on' at work, 'off' (shut,
   *  on their way there, or ashore between ships), 'sea' (aboard a ship that's out), 'owed' (a payday missed). */
  function roster() {
    var out = [], B = has('BridgeBusiness') ? BridgeBusiness : null, F = has('BridgeFleet') ? BridgeFleet : null;
    if (B && B.staff) B.staff().forEach(function (x) {
      if (!B.get(x.at)) {                                         // a smith at your workshop (js/workshop.js): no opening hours
        var w = has('BridgeWorkshop') ? BridgeWorkshop.smithRow(x) : {};
        out.push({ name: x.name, face: w.face || B.faceOf(x, x.at), state: x.missed > 0 ? 'owed' : 'on' });
        return;
      }
      out.push({ name: x.name, face: B.faceOf(x, x.at), state: x.missed > 0 ? 'owed' : (x.arrives && x.arrives > Date.now()) || !B.openNow(x.at) ? 'off' : 'on' });
    });
    if (F && F.crew) F.crew().forEach(function (c) {
      var s = F.get ? F.get(c.ship) : null, o = B && B.handOwed ? B.handOwed(c.id) : { missed: 0 };
      out.push({ name: c.name, face: handFace(c), state: o.missed > 0 ? 'owed' : !s ? 'off' : s.away ? 'sea' : 'on' });
    });
    var all = has('BridgePeople') ? BridgePeople.all() : {};
    if (has('BridgeCrew')) BridgeCrew.list().forEach(function (c) {
      out.push({ name: c.name, sheet: all[c.id] && all[c.id].sheet, state: B && B.unpaid(c.id) ? 'owed' : 'on' });
    });
    if (has('BridgeHomestead') && BridgeHomestead.HANDS) Object.keys(BridgeHomestead.HANDS).forEach(function (id) {
      var H = BridgeHomestead.HANDS[id];
      if (BridgeHomestead.active(id)) out.push({ name: H.name, face: { seed: H.name, style: 'ranger', colour: 'green' }, state: 'on' });
    });
    return out;
  }
  function staff() {
    var rows = [], pr = payroll();
    var B = has('BridgeBusiness') ? BridgeBusiness : null, F = has('BridgeFleet') ? BridgeFleet : null;
    // at your businesses
    if (B && B.staff) B.staff().forEach(function (x) {
      var d = B.get(x.at), on = d && B.openNow(x.at), coming = x.arrives && x.arrives > Date.now(), st = d ? B.status(x.at) : null;
      if (!d) {                                                     // a smith at your workshop (js/workshop.js), on the same payroll
        var w = has('BridgeWorkshop') ? BridgeWorkshop.smithRow(x) : { sub: '' };
        rows.push({ name: x.name + ' · ' + (x.title || 'smith').toLowerCase() + ' at the workshop', face: w.face, sub: w.sub + (x.owe > 0 ? ' · owed ' + Math.ceil(x.owe) : ''),
                    fig: coins(x.wage) + '<small>/day</small>', alert: x.missed > 0, act: has('BridgeWorkshop') ? function () { closeMenu(); BridgeWorkshop.smithCard(x.id); } : null });
        return;
      }
      rows.push({ name: x.name + ' · ' + x.title.toLowerCase() + (d ? ' at ' + d.name : ''), face: B.faceOf(x, x.at),
                  sub: B.perkOf(x, x.at) + ' · ' + (coming ? 'on the way there' : on ? 'on shift now' : 'off till it opens') +
                       (st ? ' · it made ' + st.today.toLocaleString() + ' today' : '') + (x.owe > 0 ? ' · owed ' + Math.ceil(x.owe) : ''),
                  fig: coins(x.wage) + '<small>/day</small>', alert: x.missed > 0,
                  act: function () { closeMenu(); BridgeInteractions.business(x.at, { v: 'person', who: x.id }); } });
    });
    // aboard your ships
    if (F && F.crew && F.wage) F.crew().forEach(function (c) {
      var s = F.get ? F.get(c.ship) : null, w = F.wage(c), o = B && B.handOwed ? B.handOwed(c.id) : { owe: 0, missed: 0 };
      rows.push({ name: c.name + ' · ' + F.ROLES[c.role].name.toLowerCase() + ', ' + F.GRADES[c.skill], face: handFace(c),
                  sub: F.perk(c.role, c.skill) + (s ? ' · aboard the ' + s.name : '') + (o.owe > 0 ? ' · owed ' + Math.ceil(o.owe) : ''),
                  fig: coins(w) + '<small>/day</small>', alert: o.missed > 0, act: function () { closeMenu(); handCard(c); } });
    });
    // your crew, aboard the Wayfarer
    var all = has('BridgePeople') ? BridgePeople.all() : {};
    if (has('BridgeCrew')) BridgeCrew.list().forEach(function (c) {
      var w = B && B.crewWage ? B.crewWage(c.id) : 0;
      rows.push({ name: c.name + ' · ' + c.role.toLowerCase() + ' (crew)', sub: (all[c.id] && all[c.id].crew ? all[c.id].crew.perkText : c.perkText) + (B && B.unpaid(c.id) ? ' · UNPAID: not working' : ''),
                  fig: coins(w) + '<small>/day</small>', alert: B && B.unpaid(c.id), world: 'bridge' });
    });
    // the farm's hands, by the day
    if (has('BridgeHomestead') && BridgeHomestead.HANDS) Object.keys(BridgeHomestead.HANDS).forEach(function (id) {
      var H = BridgeHomestead.HANDS[id];
      if (!BridgeHomestead.active(id)) return;
      rows.push({ name: H.name + ' · farm hand', face: { seed: H.name, style: 'ranger', colour: 'green' }, sub: H.does + ' · paid up for the days you hired', fig: '<span class="lg-ok">paid</span>', world: 'verdance' });
    });
    var head = '<div class="lg-total">Wages ' + pr.wages.toLocaleString() + ' a day · your businesses made ' + pr.made.toLocaleString() + ' today' +
      (pr.owed.total ? ' · <b>owed ' + pr.owed.total.toLocaleString() + '</b> <button type="button" class="gm-btn gm-btn-sm lg-pay">Pay it</button>' : '') + '</div>';
    return { html: rows.length ? head + list(rows) : '', n: rows.length ? rows.length + ' working' : '' };
  }
  // one of your ships' hands: move them to another of your ships, or pay them off
  function handCard(c) {
    var F = BridgeFleet, others = F.all().filter(function (o) { return o.id !== c.ship && F.crewOn(o.id).length < F.berths(o); });
    BridgeInteractions.choose({ title: c.name, text: (F.ROLES[c.role].name + ', ' + F.GRADES[c.skill] + ', from the ' + c.sea + ' Sea. ' + F.perk(c.role, c.skill) + '. ' + F.wage(c) + ' a day.').toUpperCase(),
      rows: others.map(function (o) { return { label: 'Move to the ' + o.name, sub: F.where(o), pick: function () { F.assign(c.id, o.id); } }; }),
      buttons: [{ label: 'Pay them off', act: function () { F.dismiss(c.id); } }], closeLabel: 'Done' });
  }

  // ---- people you can hire ------------------------------------------------------------------------------------------
  function people() {
    var rows = [];
    var all = has('BridgePeople') ? BridgePeople.all() : {};
    Object.keys(all).forEach(function (id) {
      var p = all[id];
      if (!p || !p.crew) return;
      var w = p.at && p.at[0] && p.at[0].world;
      if (has('BridgeCrew') && BridgeCrew.isHired(id)) rows.push({ name: p.name + ' · ' + p.crew.role, sub: 'Your crew — at their post on the bridge. ' + (p.crew.perkText || ''), fig: '<span class="lg-ok">hired</span>', world: 'bridge' });
      else if (has('BridgePeople') && BridgePeople.met(id)) rows.push({ name: p.name + ' · ' + p.crew.role, sub: (p.crew.after ? 'Not ready to leave yet. ' : 'Ask them to join your crew. ') + (p.crew.perkText || ''), fig: coins(p.crew.wage || 0), world: w });
      else rows.push({ name: '? ? ?', sub: 'Someone who might sail with you' + (regionOf(w) ? ' — somewhere in ' + regionOf(w) : ''), dim: true });
    });
    if (has('BridgeHomestead') && BridgeHomestead.HANDS && BridgeHomestead.owned && BridgeHomestead.owned()) Object.keys(BridgeHomestead.HANDS).forEach(function (id) {
      var H = BridgeHomestead.HANDS[id], on = BridgeHomestead.active(id);
      rows.push({ name: H.name + ' · farm hand', sub: (on ? 'Working the farm today — ' : 'By the day, at the notice board on the farm — ') + H.does, fig: on ? '<span class="lg-ok">today</span>' : coins(H.wage) + '<small>/day</small>', world: 'verdance' });
    });
    if (has('BridgeFleet')) {
      var hands = BridgeFleet._state().crew || [];
      if (hands.length) rows.push({ name: hands.length + ' hand' + (hands.length === 1 ? '' : 's') + ' aboard your ships', sub: hands.map(function (h) { return h.name + ' (' + h.role + ')'; }).join(', ') });
      rows.push({ name: 'Hands for your ships', sub: 'Three a day at every harbourmaster, and the bosun\'s table in the Crown & Anchor', dim: !hands.length });
    }
    rows.sort(function (a, b) { return (!!a.dim - !!b.dim); });
    var hired = rows.filter(function (r) { return /hired|today/.test(r.fig || ''); }).length;
    return { html: list(rows), n: hired ? hired + ' working for you' : '' };
  }

  // ---- your fleet ---------------------------------------------------------------------------------------------------
  function fleet() {
    if (!has('BridgeFleet')) return { html: '', n: 0 };
    var ships = BridgeFleet.all();
    var rows = ships.map(function (s) {
      var sp = BridgeFleet.spec(s.type), hold = 0;
      Object.keys(s.hold || {}).forEach(function (k) { hold += s.hold[k]; });
      var where = s.away && s.away.passage ? 'Sailing for ' + portName(s.away.to) + ' — arrives in ' + ago(Math.max(0, s.away.back - Date.now()))
                : s.away ? 'Away on a voyage — home in ' + ago(Math.max(0, s.away.back - Date.now())) : s.at ? 'Lying at ' + portName(s.at) : 'At whichever pier you\'re at';
      var crew = BridgeFleet.crewOn(s.id).length, fish = BridgeFleet.catchCount ? BridgeFleet.catchCount(s) : 0;
      // tap a ship lying somewhere to send her anywhere, from wherever you are (js/fleet.js order)
      var sendable = BridgeFleet.canOrder && !BridgeFleet.canOrder(s) && has('BridgeHarbour') && BridgeHarbour.send;
      return { name: s.name + ' · ' + sp.name, sub: where + ' · hull ' + Math.round((s.hull == null ? 1 : s.hull) * 100) + '%' + (sp.hold ? ' · hold ' + hold + '/' + sp.hold : '') +
               (fish ? ' · ' + fish + ' fish' : '') + (sp.crew ? ' · hands ' + crew + '/' + sp.crew : '') + (sendable ? ' · tap to send her anywhere' : ''),
               world: s.away ? null : s.at, alert: (s.hull || 1) < 0.25,
               act: sendable ? function () { closeMenu(); BridgeHarbour.send(s, function (msg) { if (msg) BridgeInteractions.choose({ title: 'Orders given', text: msg, closeLabel: 'Done' }); }); } : null };
    });
    return { html: list(rows), n: ships.length };
  }

  // ---- places of your own -------------------------------------------------------------------------------------------
  function places() {
    var rows = [];
    if (has('BridgeHome') && BridgeHome.HOMES) Object.keys(BridgeHome.HOMES).forEach(function (id) {
      var H = BridgeHome.HOMES[id];
      if (H.ship) return;
      if (BridgeHome.owns(id)) rows.push({ name: H.name || placeOf(id), sub: 'Yours — furnish it with H', fig: '<span class="lg-ok">yours</span>', world: id });
    });
    if (has('BridgeHomestead') && BridgeHomestead.owned && BridgeHomestead.owned()) {
      var j = BridgeHomestead.journal();
      rows.push({ name: j.name || 'The farm', sub: 'On Verdance · Marlo\'s rounds have paid ' + (j.coins || 0) + ' coins' + (j.bin ? ' · ' + j.bin + ' in the shipping bin' : ''), fig: '<span class="lg-ok">yours</span>', world: 'verdance' });
    }
    if (has('BridgeHolm') && BridgeHolm.owned && BridgeHolm.owned()) {
      var st = BridgeHolm._state(), b = Object.keys(st.built || {}).filter(function (k) { return st.built[k]; });
      rows.push({ name: BridgeHolm.name(), sub: 'Your island · built: ' + (b.length ? b.join(', ') : 'nothing yet') + (st.chest ? ' · ' + st.chest + ' in the strongbox' : ''), fig: '<span class="lg-ok">yours</span>', world: 'lumar-holm' });
      // the workshop: who's making what, and when it's done (js/workshop.js)
      if (has('BridgeWorkshop') && BridgeWorkshop.built()) {
        var ws = BridgeWorkshop.summary();
        rows.push({ name: 'The workshop on ' + BridgeHolm.name(), sub: ws.smiths.length + ' smith' + (ws.smiths.length === 1 ? '' : 's') + ' · ' + ws.made + ' made in all · ' + ws.line,
                    fig: ws.working ? '<span class="lg-ok">at work</span>' : 'idle', world: 'lumar-holm' });
        ws.jobs.forEach(function (j) {
          rows.push({ name: '· ' + j.name, sub: j.working ? (j.by === 'you' ? 'At your bench' : j.by) + ' · ' + Math.floor(j.done * 100) + '% done' : 'Waiting for a free smith',
                      fig: j.working ? 'in ' + ago(Math.max(60000, j.left)) : '' });
        });
      }
    }
    return { html: rows.length ? list(rows) : '', n: rows.length };
  }

  // ---- contracts ----------------------------------------------------------------------------------------------------
  function contracts() {
    if (!has('BridgeTrade')) return { html: '', n: 0 };
    var d0 = BridgeTrade.today(), cs = BridgeTrade.mine();
    var rows = cs.map(function (c) {
      var left = c.due - d0;
      return { name: c.n + ' ' + BridgeTrade.name(c.good) + ' to ' + portName(c.to), sub: 'From ' + portName(c.from) + ' · due ' + (left <= 0 ? 'today' : left === 1 ? 'tomorrow' : 'in ' + left + ' days'), fig: coins(c.fee), world: c.to, alert: left <= 0 };
    });
    return { html: rows.length ? list(rows) : '', n: cs.length };
  }

  function render(el) {
    page = el || page;
    if (!page) return;
    acts = [];
    var nd = needs(), bz = businesses(), sf = staff(), pp = people(), fl = fleet(), pl = places(), ct = contracts(), lg = legacy();
    var left = section('Needs you', nd.length || '', nd.length ? list(nd) : '<div class="jn-empty">Nothing needs you right now.</div>', 'jn-first') +
               section('Businesses', bz.n, bz.html || '<div class="jn-empty">No businesses known yet.</div>') +
               (pl.html ? section('Your places', pl.n, pl.html) : '');
    var right = (sf.html ? section('Staff & payroll', sf.n, sf.html, 'lg-staff') : '') +
                section('People you can hire', pp.n, pp.html || '<div class="jn-empty">Nobody yet.</div>') +
                (fl.html ? section('Your fleet', fl.n, fl.html) : '') + (ct.html ? section('Contracts', ct.n, ct.html) : '') +
                (lg.html ? section('Legacy', lg.n, lg.html) : '');
    page.innerHTML = '<div class="jn lg"><div class="jn-col">' + left + '</div><div class="jn-col">' + right + '</div></div>';
    page.querySelectorAll('.lg-go').forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); if (has('BridgeMenu')) BridgeMenu.show('map', { world: b.getAttribute('data-w') }); });
    });
    page.querySelectorAll('.lg-act').forEach(function (li) {
      li.addEventListener('click', function () { var f = acts[+li.getAttribute('data-act')]; if (f) f(); });
    });
    var pay = page.querySelector('.lg-pay');
    if (pay) pay.addEventListener('click', function (e) { e.stopPropagation(); if (has('BridgeBusiness') && BridgeBusiness.payAll) BridgeBusiness.payAll(); setTimeout(function () { render(); }, 600); });
    if (has('BridgeLook') && BridgeLook.face) page.querySelectorAll('canvas.lg-face').forEach(function (cv) {
      BridgeLook.face(cv, cv.getAttribute('data-seed'), cv.getAttribute('data-style'), cv.getAttribute('data-colour'), !!cv.getAttribute('data-wild'));
    });
  }

  function focusStaff() {
    var sec = page && page.querySelector('.lg-staff');
    if (sec && sec.scrollIntoView) sec.scrollIntoView({ block: 'start' });
  }

  if (has('BridgeMenu') && BridgeMenu.page) BridgeMenu.page('ledger', { render: function (el, opts) { render(el); if (opts && opts.focus === 'staff') focusStaff(); }, leave: function () { page = null; } });
  return { render: render, needs: needs, roster: roster, payroll: payroll };
})();
