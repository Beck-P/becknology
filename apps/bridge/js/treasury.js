/**
 * BridgeTreasury — money in and out by where it came from, a day at a time (Eastern-time days, kept a fortnight): the
 * treasury on the counting table in the captain's office, and the ledger's Treasury section (the empire plan's chunk 3,
 * _claude_docs/spec-empire.md: "one view of money in and out by source over the last week (little graphs), what's
 * growing, what's losing — and a hint where the next coin is").
 *
 * It watches every coin that moves through BridgeProgression.awardCoins / wagerCoins (both wrapped as properties, so a
 * stub put in their place is watched too) and files it by its reason (`catOf`):
 *
 *   biz       your businesses' takings collected or banked to you (`business:<id>`, `business:banked`) — and the wages
 *             paid out of their own takings before they reach you (js/business.js `internal`: in here, out under wages)
 *   trade     cargo bought and sold, the catch landed, contracts, the holm's voyages, standing orders (`orders:trade`),
 *             escorts bought from the dispatch
 *   workshop  what the Workshop makes, sold (`cargo:` a material, or a sale at a trader with things it made in it:
 *             `noteSale`), and what it buys (`material:`, `plan:`, `orders:supply`, fitting your own parts)
 *   wages     wages and hiring (`wages`, `wages:hire`, `crew:`, the farm's hands)
 *   build     buying and building: businesses, ships, the holm, homes, fittings, repairs, legacy
 *   other     everything else: selling what you find, the casino, rewards, games
 *
 *   BridgeTreasury.week()   { days, series: { cat: [{ in, out } × 7] }, tot: { cat: { in, out, net } }, inAll, outAll, net }
 *   .trend(cat)  .hints()  .graph(canvas) (the chooser's picture)  .spark(cat) (a row's little graph)  .CATS
 */
var BridgeTreasury = (function () {
  var KEY = 'bridge_treasury', KEEP = 15;
  var CATS = [
    { id: 'biz', name: 'Businesses', col: '#e8b840', dark: '#7a5a18' },
    { id: 'trade', name: 'Trade runs', col: '#58b0e8', dark: '#1e4a6a' },
    { id: 'workshop', name: 'Workshop', col: '#e88850', dark: '#6a3418' },
    { id: 'wages', name: 'Wages', col: '#e05a4a', dark: '#6a1c14' },
    { id: 'build', name: 'Buying & building', col: '#a888e0', dark: '#3e2a6a' },
    { id: 'other', name: 'Everything else', col: '#98b098', dark: '#3a4a3a' }
  ];
  var MADE = { plank: 1, oak_plank: 1, iron_bar: 1, copper_sheet: 1, pitch: 1, rope: 1, sailcloth: 1, moonglass: 1,
               iron_pickaxe: 1, star_pickaxe: 1, prospector_pick: 1, greenheart_rod: 1 };     // what js/workshop.js makes

  var st = { d: {} };
  try { st = Object.assign(st, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* fresh */ }
  st.d = st.d || {};
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode */ } }
  function day() { return Math.floor((typeof BridgeClock !== 'undefined' && BridgeClock.etNow ? BridgeClock.etNow() : Date.now()) / 86400000); }   // the Eastern-time day, as the payroll keeps it
  function coins(n) { return Math.round(n).toLocaleString(); }
  function has(n) { return typeof window[n] !== 'undefined'; }

  function made(id) { return !!MADE[id] || String(id).indexOf('part_') === 0; }
  /** Which column a coin's reason goes in (`gain`: coming to you). */
  function catOf(reason, gain) {
    var r = String(reason || ''), head = r.split(':')[0];
    if (head === 'business') return gain ? 'biz' : 'build';
    if (head === 'business-upgrade' || head === 'business-sold') return 'build';
    if (head === 'cargo') return made(r.slice(6)) ? 'workshop' : 'trade';
    if (r === 'catch' || head === 'contract' || r === 'holm:voyages' || head === 'orders' && r !== 'orders:supply' || r === 'crew:trade' || r === 'dispatch:escort' || head === 'royal') return 'trade';
    if (r === 'orders:supply' || head === 'material' || head === 'plan' || head === 'fit-own') return 'workshop';
    if (head === 'wages' || head === 'crew' || r.indexOf('farm:hand') === 0) return 'wages';
    if (head === 'ship' || head === 'ship_sold' || head === 'holm' || head === 'home' || r === 'farm:deed' || head === 'fit' || head === 'repair' ||
        head === 'legacy' || head === 'furniture' || head === 'purchase') return 'build';
    return 'other';
  }
  function add(cat, n) {
    if (!n) return;
    var d = day(), rec = st.d[d] = st.d[d] || {}, c = rec[cat] = rec[cat] || [0, 0];
    if (n > 0) c[0] += n; else c[1] -= n;
    var keys = Object.keys(st.d).map(Number).sort(function (a, b) { return a - b; });
    while (keys.length > KEEP) delete st.d[keys.shift()];
    save();
  }
  // a sale at a trader: the share of it that's things the Workshop made (js/interactions.js, js/inventory.js say what's
  // in it just before they're paid)
  var sale = null;
  function noteSale(items) {
    var w = 0;
    (items || []).forEach(function (x) { if (made(x.id)) w += x.total || 0; });
    sale = w > 0 ? { w: w, at: Date.now() } : null;
  }
  function record(name, n, reason, res) {
    var amt = Math.floor(Math.abs(+n || 0));
    if (!amt) return;
    var gain = name === 'awardCoins' ? n > 0 : n < 0;
    if (name === 'awardCoins' ? res == null || res === false : !(res && res.ok)) return;
    if (gain && /^sell:/.test(String(reason)) && sale && Date.now() - sale.at < 15000) {
      var w = Math.min(amt, sale.w);
      sale = null;
      add('workshop', w);
      if (amt > w) add('other', amt - w);
      return;
    }
    add(catOf(reason, gain), gain ? amt : -amt);
  }
  /** Wages paid out of a business's own takings before they reach you: in from the business, out as wages. */
  function internal(n) { if (n > 0) { add('biz', n); add('wages', -n); } }

  // ---- watching the purse -------------------------------------------------------------------------------------------
  function wrapped(name, f) {
    if (typeof f !== 'function' || f.__treasury) return f;
    if (f.__tw) return f.__tw;
    var w = function (n, reason) {
      var res = f.apply(this, arguments);
      Promise.resolve(res).then(function (r) { try { record(name, n, reason, r); } catch (e) { /* never in the way */ } }, function () {});
      return res;
    };
    w.__treasury = true;
    try { Object.defineProperty(f, '__tw', { value: w }); } catch (e) { /* frozen */ }
    return w;
  }
  (function hook() {
    var P = typeof BridgeProgression !== 'undefined' ? BridgeProgression : null;
    if (!P || P.__treasury) return;
    ['awardCoins', 'wagerCoins'].forEach(function (name) {
      var cur = P[name];
      try { Object.defineProperty(P, name, { configurable: true, enumerable: true, get: function () { return wrapped(name, cur); }, set: function (f) { cur = f; } }); } catch (e) { /* frozen */ }
    });
    try { Object.defineProperty(P, '__treasury', { value: true }); } catch (e) { /* frozen */ }
    // a trophy's reward is paid inside progression.js, past the wrapper: heard as it's announced
    if (P.onCoinChange) P.onCoinChange(function (e) { if (e && /^achievement:/.test(e.reason || '') && e.delta > 0) add('other', Math.floor(e.delta)); });
  })();

  // ---- what the treasury shows --------------------------------------------------------------------------------------------
  function week() {
    var d0 = day(), days = [], series = {}, tot = {}, inAll = 0, outAll = 0;
    for (var i = 6; i >= 0; i--) days.push(d0 - i);
    CATS.forEach(function (c) {
      series[c.id] = days.map(function (d) { var x = (st.d[d] || {})[c.id] || [0, 0]; return { in: x[0], out: x[1] }; });
      var a = 0, b = 0;
      series[c.id].forEach(function (x) { a += x.in; b += x.out; });
      tot[c.id] = { in: a, out: b, net: a - b };
      inAll += a; outAll += b;
    });
    return { days: days, series: series, tot: tot, inAll: inAll, outAll: outAll, net: inAll - outAll };
  }
  /** How a column's doing: its net a day over the last three days less over the four before (> 0 growing). */
  function trend(cat, w) {
    w = w || week();
    var s = w.series[cat] || [], late = 0, early = 0;
    s.forEach(function (x, i) { if (i >= 4) late += x.in - x.out; else early += x.in - x.out; });
    return late / 3 - early / 4;
  }
  function trendWord(cat, w) {
    var t = trend(cat, w), tot = w.tot[cat];
    if (!tot.in && !tot.out) return '';
    var big = Math.max(20, (tot.in + tot.out) / 14);
    if (cat === 'wages' || cat === 'build') return t < -big ? 'rising' : t > big ? 'easing' : 'steady';
    return t > big ? 'growing' : t < -big ? 'falling' : tot.net < 0 ? 'losing' : 'steady';
  }
  function nameOf(id) { var I = has('BridgeVoyage') && BridgeVoyage._isles; return I && I[id] ? I[id].name : id; }
  /** What's growing, what's losing, and where the next coin is: [{ kind: 'up'|'down'|'coin', text, world }] */
  function hints() {
    var out = [], w = week();
    var grow = CATS.filter(function (c) { return c.id !== 'wages' && c.id !== 'build' && trendWord(c.id, w) === 'growing'; })[0];
    if (grow) out.push({ kind: 'up', text: grow.name + ' are growing: ' + coins(w.tot[grow.id].net) + ' clear this week' });
    var lose = CATS.filter(function (c) { return c.id !== 'wages' && c.id !== 'build' && (trendWord(c.id, w) === 'falling' || trendWord(c.id, w) === 'losing'); })[0];
    if (lose) out.push({ kind: 'down', text: lose.name + ' are ' + (w.tot[lose.id].net < 0 ? 'losing: ' + coins(-w.tot[lose.id].net) + ' out this week' : 'falling off') });
    var earned = w.tot.biz.in + w.tot.trade.in + w.tot.workshop.in;
    if (w.tot.wages.out > 0 && w.tot.wages.out > earned) out.push({ kind: 'down', text: 'Wages came to ' + coins(w.tot.wages.out) + ' this week, more than your businesses and ships brought in' });
    var B = has('BridgeBusiness') ? BridgeBusiness : null, F = has('BridgeFleet') ? BridgeFleet : null, O = has('BridgeOrders') ? BridgeOrders : null;
    if (B) {
      var mine = B.summary(), waiting = mine.reduce(function (a, b) { return a + (b.pending || 0); }, 0);
      if (waiting >= 50) out.push({ kind: 'coin', text: coins(waiting) + ' waiting to be collected at your businesses — a manager banks it to you as it comes' });
      mine.forEach(function (b) {
        var so = B.stockOf(b.id);
        if (so && !so.units && b.status.running) out.push({ kind: 'coin', text: b.name + ' is buying its stock in at cost — stock it from your pack, or send it a supply run from your warehouse', world: b.world });
      });
      if (!mine.length) {
        var seen = B.all().filter(function (d) { return !d.built && has('BridgeMap') && BridgeMap.visited && BridgeMap.visited(d.world); }).sort(function (a, b) { return a.price - b.price; })[0];
        if (seen) out.push({ kind: 'coin', text: 'A business of your own: ' + seen.name + ' is ' + coins(seen.price) + ', and earns about ' + seen.rate + ' an open hour', world: seen.world });
      }
    }
    if (F) F.all().forEach(function (s) {
      if (s.type === 'sloop' || s.away || (O && O.get(s.id))) return;
      var cpt = O && O.captainOf(s.id);
      out.push({ kind: 'coin', text: 'The ' + s.name + ' lies idle at ' + nameOf(s.at) + (cpt ? ' with ' + cpt.name + ' aboard — give her a standing order at the chart table' : ' — a captain would trade her while you\'re away'), world: 'office' });
    });
    if (has('BridgeHolm') && BridgeHolm.owned && BridgeHolm.owned() && (BridgeHolm._state().chest || 0) > 0)
      out.push({ kind: 'coin', text: coins(BridgeHolm._state().chest) + ' in the strongbox on ' + BridgeHolm.name() + ', from your ships\' voyages', world: 'lumar-holm-home' });
    if (has('BridgeWorkshop') && BridgeWorkshop.built()) { var ws = BridgeWorkshop.summary(); if (ws.idle) out.push({ kind: 'coin', text: ws.idle + ' smith' + (ws.idle === 1 ? '' : 's') + ' idle at the Workshop — queue something from the workshop book on your desk', world: 'office' }); }
    if (has('BridgeTrade') && BridgeTrade.routes) {
      var r = BridgeTrade.routes(40)[0];
      if (r) out.push({ kind: 'coin', text: 'Today\'s best run: ' + r.goods.map(function (g) { return BridgeTrade.name(g.good).toLowerCase(); }).join(' and ') + ' from ' + nameOf(r.from) + ' to ' + nameOf(r.to) + ', about ' + coins(r.profit) + ' for a cutter\'s hold' });
    }
    return out.slice(0, 6);
  }

  // ---- the little graphs ---------------------------------------------------------------------------------------------------
  // a 3 × 5 pixel hand for the days and the scale (the office's own, js/worlds/office.js)
  var GL = { M: '101111111101101', T: '111010010010010', W: '101101101111101', F: '111100110100100', S: '111100111001111',
             '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001',
             '5': '111100111001111', '6': '111100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001111', 'k': '100101110101101', '+': '000010111010000', '-': '000000111000000', '.': '000000000000010' };
  function glyphs(g, t, x, y, col) {
    g.fillStyle = col;
    for (var i = 0; i < t.length; i++) { var m = GL[t[i]]; if (m) for (var j = 0; j < 15; j++) if (m[j] === '1') g.fillRect(x + i * 4 + (j % 3), y + Math.floor(j / 3), 1, 1); }
  }
  function short(n) { n = Math.round(n); return n >= 10000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? Math.round(n / 100) / 10 + 'k' : String(n); }
  function dayLetter(d) {
    var dow = new Date(d * 86400000 + 12 * 3600000).getUTCDay();
    return 'SMTWTFS'[dow];
  }
  /** The week on ledger paper: each day's money in stacked above the line by where it came from, what went out below —
   *  each half to its own scale, its biggest day written in the margin. */
  function graph(cv) {
    var w = week(), W = 192, H = 92, mid = 50, top = 6, bot = 80, colW = 24, ox = 24;
    cv.width = W; cv.height = H;
    var g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#ece0c2'; g.fillRect(0, 0, W, H);                       // the paper, ruled
    g.fillStyle = '#ddcfae';
    for (var y = 5; y < H; y += 6) g.fillRect(0, y, W, 1);
    g.fillStyle = '#c89a8a'; g.fillRect(ox - 2, 0, 1, H);                    // its margin
    var maxIn = 1, maxOut = 1;
    w.days.forEach(function (d, i) {
      var a = 0, b = 0;
      CATS.forEach(function (c) { a += w.series[c.id][i].in; b += w.series[c.id][i].out; });
      maxIn = Math.max(maxIn, a); maxOut = Math.max(maxOut, b);
    });
    var kIn = (mid - top) / maxIn, kOut = (bot - mid - 1) / maxOut;
    w.days.forEach(function (d, i) {
      var x = ox + i * colW + 4, bw = colW - 8, up = mid, dn = mid + 1;
      if (i === 6) { g.fillStyle = 'rgba(255,240,190,0.7)'; g.fillRect(x - 3, 2, bw + 6, H - 4); }   // today
      CATS.forEach(function (c) {
        var v = w.series[c.id][i], hi = Math.round(v.in * kIn), ho = Math.round(v.out * kOut);
        if (v.in > 0 && hi < 1) hi = 1;
        if (v.out > 0 && ho < 1) ho = 1;
        if (hi) { g.fillStyle = c.dark; g.fillRect(x, up - hi, bw, hi); g.fillStyle = c.col; g.fillRect(x + 1, up - hi + (hi > 1 ? 1 : 0), bw - 2, Math.max(1, hi - 1)); up -= hi; }
        if (ho) { g.fillStyle = c.dark; g.fillRect(x, dn, bw, ho); g.fillStyle = c.col; g.fillRect(x + 1, dn, bw - 2, Math.max(1, ho - 1)); dn += ho; }
      });
      glyphs(g, dayLetter(d), x + (bw >> 1) - 1, H - 8, i === 6 ? '#5a2a10' : '#7a6a50');
    });
    g.fillStyle = '#3a2a1a'; g.fillRect(ox - 2, mid, W - ox, 1);             // the line: in above it, out below
    if (w.inAll) glyphs(g, '+' + short(maxIn), 1, top, '#4a6a2a');
    if (w.outAll) glyphs(g, '-' + short(maxOut), 1, bot - 5, '#8a3a2a');
    glyphs(g, '0', 1, mid - 2, '#7a6a50');
    var dp = Math.max(1, Math.round(window.devicePixelRatio || 1)), z = Math.max(dp, Math.min(2 * dp, Math.floor(400 * dp / W)));
    cv.style.width = W * z / dp + 'px';
  }
  /** A column's week as a row's icon: a bar a day, up for what came in clear, down for what went out. */
  function spark(cat) {
    return function (g, n) {
      var w = week(), s = w.series[cat], c = CATS.filter(function (x) { return x.id === cat; })[0], max = 1, u = n / 24;
      s.forEach(function (v) { max = Math.max(max, Math.abs(v.in - v.out)); });
      g.fillStyle = '#ece0c2'; g.fillRect(0, 0, n, n);
      g.fillStyle = '#3a2a1a'; g.fillRect(1 * u, 12 * u, 22 * u, 1 * u);
      s.forEach(function (v, i) {
        var net = v.in - v.out, h = Math.round(Math.abs(net) / max * 10);
        if (net && !h) h = 1;
        g.fillStyle = net >= 0 ? c.col : '#c04030';
        if (net >= 0) g.fillRect((2 + i * 3) * u, (12 - h) * u, 2 * u, h * u); else g.fillRect((2 + i * 3) * u, 13 * u, 2 * u, h * u);
      });
    };
  }

  return { CATS: CATS, week: week, trend: trend, trendWord: trendWord, hints: hints, graph: graph, spark: spark, noteSale: noteSale, internal: internal, catOf: catOf,
           _add: add, _state: function () { return st; } };
})();
