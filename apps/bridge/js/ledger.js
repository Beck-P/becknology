/**
 * BridgeLedger — the Ledger tab of the game menu (L): everything you run, own and employ, in one book.
 *
 *   Needs you     what wants your attention now: takings piled up (a business at its cap stops earning), ships home
 *                 with a profit in the strongbox, ripe crops, eggs and milk waiting, the shipping bin, contracts due,
 *                 a battered hull — each with where, and a Map button to find it
 *   Businesses    every business there is: yours with what it earns an hour, what's waiting and who runs it; ones
 *                 you've found but don't own with their price; the rest blocked out until you've been where they are
 *   People        who you can hire: your crew (where they stand, what they do for you), the farm's hands, the hands
 *                 aboard your ships; anyone you haven't met yet is a shadow with a hint where to look
 *   Fleet         every ship: where she lies (or how long till she's home), hull, hold, fish hold, hands
 *   Places        your homes, the farm, the holm and what's built on it
 *   Contracts     what you've promised to carry, where, by when
 *
 * It only reads: each module keeps its own state (js/business.js, crew.js, fleet.js, holm.js, homestead.js, farm.js,
 * animals.js, trade.js, home.js). Registered as a page with BridgeMenu.
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
  function row(o) {
    return '<li class="lg-row' + (o.dim ? ' lg-dim' : '') + (o.alert ? ' lg-alert' : '') + '"><div class="lg-main"><b>' + esc(o.name) + '</b>' +
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
      if (p >= Math.max(20, BridgeBusiness.perHour(d.id) * 2) || full)
        out.push({ name: d.name, sub: full ? 'Full — it\'s stopped earning until you collect' : 'Takings waiting to collect', fig: coins(p), world: d.world, alert: full });
    });
    if (has('BridgeHolm') && BridgeHolm.owned && BridgeHolm.owned()) {
      if (BridgeHolm.returns) BridgeHolm.returns();
      var chest = BridgeHolm._state().chest || 0;
      if (chest > 0) out.push({ name: 'The strongbox on ' + BridgeHolm.name(), sub: 'What your ships brought home', fig: coins(chest), world: 'lumar-holm-home' });
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
    var all = BridgeBusiness.all(), mine = 0, earn = 0;
    var rows = all.map(function (d) {
      if (BridgeBusiness.owned(d.id)) {
        var s = BridgeBusiness.state(d.id) || {}, p = BridgeBusiness.pending(d.id), ph = BridgeBusiness.perHour(d.id), full = p >= ph * BridgeBusiness.cap(d.id) * 0.98;
        var mgr = s.manager && has('BridgePeople') ? (BridgePeople.all()[s.manager] || {}).name : null;
        mine++; earn += ph;
        return { name: d.name, sub: placeOf(d.world) + ' · ' + ph + ' an hour' + (s.level ? ' · improved ×' + s.level : '') + (mgr ? ' · run by ' + mgr : '') +
                 (full ? ' · FULL' : p ? ' · ' + p + ' waiting' : ''), fig: coins(p), world: d.world, alert: full };
      }
      if (been(d.world)) return { name: d.name, sub: 'For sale · ' + placeOf(d.world) + ' · earns ~' + d.rate + ' an hour', fig: coins(d.price), world: d.world };
      var reg = regionOf(d.world);
      return { name: '? ? ?', sub: 'A business you haven\'t found' + (reg ? ' — somewhere in ' + reg : ''), dim: true };
    });
    rows.sort(function (a, b) { return (!!a.dim - !!b.dim); });
    return { html: list(rows) + (mine ? '<div class="lg-total">Yours: ' + mine + ' · ' + earn + ' coins an hour between them</div>' : ''), n: mine + ' / ' + all.length };
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
      var where = s.away ? 'Away on a voyage — home in ' + ago(Math.max(0, s.away.back - Date.now())) : s.at ? 'Lying at ' + portName(s.at) : 'At whichever pier you\'re at';
      var crew = BridgeFleet.crewOn(s.id).length, fish = BridgeFleet.catchCount ? BridgeFleet.catchCount(s) : 0;
      return { name: s.name + ' · ' + sp.name, sub: where + ' · hull ' + Math.round((s.hull == null ? 1 : s.hull) * 100) + '%' + (sp.hold ? ' · hold ' + hold + '/' + sp.hold : '') +
               (fish ? ' · ' + fish + ' fish' : '') + (sp.crew ? ' · hands ' + crew + '/' + sp.crew : ''), world: s.away ? null : s.at, alert: (s.hull || 1) < 0.25 };
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
    var nd = needs(), bz = businesses(), pp = people(), fl = fleet(), pl = places(), ct = contracts();
    var left = section('Needs you', nd.length || '', nd.length ? list(nd) : '<div class="jn-empty">Nothing needs you right now.</div>', 'jn-first') +
               section('Businesses', bz.n, bz.html || '<div class="jn-empty">No businesses known yet.</div>') +
               (pl.html ? section('Your places', pl.n, pl.html) : '');
    var right = section('People you can hire', pp.n, pp.html || '<div class="jn-empty">Nobody yet.</div>') +
                (fl.html ? section('Your fleet', fl.n, fl.html) : '') + (ct.html ? section('Contracts', ct.n, ct.html) : '');
    page.innerHTML = '<div class="jn lg"><div class="jn-col">' + left + '</div><div class="jn-col">' + right + '</div></div>';
    page.querySelectorAll('.lg-go').forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); if (has('BridgeMenu')) BridgeMenu.show('map', { world: b.getAttribute('data-w') }); });
    });
  }

  if (has('BridgeMenu') && BridgeMenu.page) BridgeMenu.page('ledger', { render: function (el) { render(el); }, leave: function () { page = null; } });
  return { render: render, needs: needs };
})();
