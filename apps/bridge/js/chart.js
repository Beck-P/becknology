/**
 * BridgeChart — the chart of Lumar's seas: open it anywhere on Lumar (C, or the Chart pill) or at sea (C, or the
 * chart button), see where everything is, and set your course.
 *
 * A parchment chart drawn in its own small native buffer, scaled up by a whole number (the world's pixel look), names
 * and notes laid over it as text. The five seas are the voyage's own (the nearest island's sea, borders wandering);
 * every island is inked from its world's land (`tiles`, cached), with what's there beside it (CHART NOTES), your ships
 * at their moorings, the contracts you've taken, your holm's flag, you, and your course as a dotted gold line.
 *
 * You start with the Emerald Sea charted: Diggen's Point, Crownhaven, Tern Holm, Starling Holm. The other seas are
 * blank until you buy their charts (PRICES; any harbourmaster's book, or Ilsa Venn the cartographer) — or until you've
 * been there yourself. Only islands you know are on the compass and the course lists (js/sloop.js asks `known`).
 *
 * Setting a course ashore (`setDest`) makes the next passage sail for it: the pier's Go sailing takes you there. At sea
 * (no course yet) it commits the course at once. Kept in localStorage bridge_charts.
 */
var BridgeChart = (function () {
  var KEY = 'bridge_charts';
  var SEA = { emerald: 'The Emerald Sea', sapphire: 'The Sapphire Sea', rose: 'The Rose Sea', crimson: 'The Crimson Sea', midnight: 'The Midnight Sea' };
  var PRICES = { sapphire: 220, rose: 220, crimson: 380, midnight: 520 };
  var TINT = { emerald: [126, 170, 132], sapphire: [128, 150, 190], rose: [196, 150, 170], crimson: [196, 132, 116], midnight: [140, 132, 172] };
  // what's there, for the chart's note on each island
  var NOTES = {
    'lumar': ['Your home harbour', 'Bess Tolliver\'s yard: cutters', 'Salt fish, lamp oil, timber cheap'],
    'lumar-crown': ['The capital', 'The Royal Yard: up to a galleon', 'The Merchants\' Exchange', 'Buys everything, luxuries dearest'],
    'lumar-tern': ['A fishing village', 'Salt fish cheapest on the seas', 'Maud buys your catch'],
    'lumar-holm': ['A small island, for sale', 'Cottage, jetty, walled garden'],
    'lumar-sapphire': ['The great trading port', 'Brigantines at the Great Yard', 'Glass cheap; pays well for timber, silk'],
    'lumar-rose': ['Crystal terraces, the old mine', 'Crystal sails, roseite sheathing', 'Spore silk and roseite cheap'],
    'lumar-crimson': ['The pirate beach, the dragon\'s cave', 'The raider, heavy guns, storm rigging', 'Rum and black powder cheap', 'Squalls: ease your sheet'],
    'lumar-cinder': ['Tortuga, the pirates\' port, on a volcano', 'Vesper Quick buys hot goods', 'The stormwatch: Wick\'s forecast', 'Rum and powder; squalls'],
    'lumar-saltmere': ['The drowned village', 'Its bell rings in the dark of the moon', 'No harbour; the drowned walk'],
    'lumar-midnight': ['The drowned abbey, the moon pool', 'The Ferryman: moonglass, moon salt', 'Rocks in the mist; drowned ships']
  };

  var st = { seas: { emerald: true }, visited: {}, dest: null };
  var fresh = true;
  try { var saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved) { st = Object.assign(st, saved); fresh = false; } } catch (e) { /* new */ }
  st.seas = st.seas || { emerald: true }; st.seas.emerald = true; st.visited = st.visited || {}; st.sailed = st.sailed || {};
  function store() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode */ } }
  // a captain who's sailed before this chart existed: the islands their saves mention count as visited
  if (fresh) {
    try {
      var blob = '';
      for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (/^bridge_/.test(k) && k !== KEY) blob += localStorage.getItem(k); }
      ['lumar-sapphire', 'lumar-rose', 'lumar-crimson', 'lumar-midnight'].forEach(function (id) { if (blob.indexOf(id) >= 0) st.visited[id] = 1; });
    } catch (e) { /* no storage */ }
    store();
  }

  function isles() { return typeof BridgeVoyage !== 'undefined' && BridgeVoyage._isles || {}; }
  // at sea: the sea your mark is in colours on the chart as you cross into it (open or not)
  setInterval(function () {
    if (!sailing() || !BridgeSloop.chartPos) return;
    var p = BridgeSloop.chartPos(), sea = p && seaAt(mapX(p.x), mapY(p.y));
    if (sea && !charted(sea) && !st.sailed[sea]) { st.sailed[sea] = Date.now(); store(); }
  }, 1000);
  var INSIDE = { 'lumar-home': 'lumar-sapphire', 'lumar-manor': 'lumar-crown' };          // rooms whose ids don't start with their island's
  function islandOf(worldId) {
    var I = isles(), best = null;
    if (!worldId) return null;
    if (I[worldId]) return worldId;
    if (INSIDE[worldId]) return INSIDE[worldId];
    if (/^lumar-manor-/.test(worldId)) return 'lumar-crown';                 // Ashcombe House's other rooms
    for (var id in I) if (worldId.indexOf(id + '-') === 0 && (!best || id.length > best.length)) best = id;   // the longest: lumar-rose-mine is Rose's
    return best;
  }
  function seaOf(id) { var I = isles()[id]; return I ? I.pal : null; }
  function charted(sea) { return !!st.seas[sea]; }
  function cap(t) { return String(t || '').charAt(0).toUpperCase() + String(t || '').slice(1); }
  function known(id) { return !!isles()[id] && (charted(seaOf(id)) || !!st.visited[id]); }
  function dest() { return st.dest && isles()[st.dest] ? st.dest : null; }
  function course() {                                       // where you're bound: at sea, the passage's course; ashore, the one you set
    if (sailing()) return BridgeSloop.course ? BridgeSloop.course() : null;
    return dest();
  }
  function setDest(id) {
    st.dest = id || null; store();
    var w = typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorld ? BridgeWorld.getWorld() : null;
    if (w) retitle(w.interactions);
  }
  function here() { var w = typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId ? BridgeWorld.getWorldId() : null; return islandOf(w); }
  function sailing() { return typeof BridgeSloop !== 'undefined' && BridgeSloop.isRunning(); }
  function available() { return sailing() || !!here(); }
  function name(id) { var I = isles()[id]; return I ? I.name : id; }

  /** A world loaded: if it's on an island, you've been there. An island you stumbled on without its sea's chart stays
   *  off your chart (`found`, not `visited`): buy the chart to keep it on your map and compass. */
  function decorate(worldId, data) {
    var id = islandOf(worldId);
    if (id && !st.visited[id] && charted(seaOf(id))) { st.visited[id] = 1; store(); }
    else if (id && !st.visited[id] && !(st.found = st.found || {})[id]) {
      st.found[id] = Date.now(); store();
      setTimeout(function () {
        if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast)
          BridgeQuests.toast('Not on your chart', name(id), 'You found it without a chart. Buy the ' + cap(seaOf(id)) + ' Sea\'s chart from a harbourmaster to keep it on your map');
      }, 3000);
    }
    if (id && st.dest === id) { st.dest = null; store(); }               // you're here: the course is run
    if (pill) pill.style.display = id ? 'flex' : 'none';
    if (data) retitle(data.interactions);
    if (id && !st.hinted) {                                                // the first time on Lumar: you have a chart
      st.hinted = 1; store();
      setTimeout(function () {
        if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast)
          BridgeQuests.toast('Your chart', 'The Emerald Sea, the capital and all', (document.documentElement.classList.contains('touch') ? 'Tap Chart' : 'Press C') + ' to see it and set a course');
      }, 2500);
    }
  }
  // the pier says where you're bound
  function retitle(list) {
    var d = dest();
    (list || []).forEach(function (it) { if (it.type === 'go_sailing') it.prompt = d ? 'PRESS E TO SAIL FOR ' + name(d).toUpperCase() : 'PRESS E TO GO SAILING'; });
  }

  // ---- buying charts ----------------------------------------------------------------------------------------------
  function shop(worldId, note, back) {
    if (typeof BridgeInteractions === 'undefined' || !BridgeInteractions.choose) return;
    var mine = seaOf(islandOf(worldId));
    var rows = Object.keys(SEA).filter(function (s) { return s !== 'emerald'; }).map(function (s) {
      var price = s === mine ? Math.round(PRICES[s] * 0.6) : PRICES[s];
      var isl = Object.keys(isles()).filter(function (id) { return seaOf(id) === s; }).map(name);
      return { label: SEA[s], sub: isl.join(', ') + (s === mine ? ' · this sea\'s own, cheaper' : ''), note: charted(s) ? 'charted' : price + ' coins', disabled: charted(s),
               pick: function () {
                 var pay = typeof BridgeProgression !== 'undefined' && BridgeProgression.wagerCoins ? BridgeProgression.wagerCoins(price, 'chart:' + s) : Promise.resolve({ ok: false });
                 pay.then(function (r) {
                   if (!r || !r.ok) { shop(worldId, r && r.reason === 'insufficient' || r && r.reason === 'insufficient_funds' ? 'NOT ENOUGH COINS.' : 'NOT ENOUGH COINS (OR NO WAY TO PAY RIGHT NOW).', back); return; }
                   st.seas[s] = true; store();
                   if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx('coin');
                   if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast('Chart', SEA[s], 'Its islands are on your chart and compass now');
                   shop(worldId, SEA[s].toUpperCase() + ' IS YOURS. OPEN YOUR CHART (C) TO SEE IT.', back);
                 });
               } };
    });
    BridgeInteractions.choose({ title: 'Charts', text: note || 'SOUNDINGS, SHOALS, EVERY ISLAND AND ITS HARBOUR. ONCE AN ISLAND\'S ON YOUR CHART YOU CAN SET A COURSE FOR IT.',
                                rows: rows, buttons: back ? [{ label: 'Back', act: back }] : [], closeLabel: 'Done' });
  }

  // ---- the chart itself ------------------------------------------------------------------------------------------
  var NW = 400, NH = 264, MX = 34, MY = 30;
  function mapX(x) { return MX + x * (NW - 2 * MX); }
  function mapY(y) { return MY + y * (NH - 2 * MY); }
  function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function vnoise(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    function h(i, j) { return hash(i * 57 + j * 131); }
    return h(xi, yi) * (1 - u) * (1 - v) + h(xi + 1, yi) * u * (1 - v) + h(xi, yi + 1) * (1 - u) * v + h(xi + 1, yi + 1) * u * v;
  }
  // the sea at a chart point: the nearest island's, the borders nudged by noise (the voyage's seas, at chart scale)
  // the Midnight Sea reaches further than the rest (a weighted nearest island: its distances count for less), so the
  // Midnight Isle sits deep inside its own sea. Squared here; js/sloop.js and js/voyage.js weigh the same way.
  var SEA_W = { midnight: 0.4624 };
  function seaAt(px, py) {
    var wx = px + (vnoise(px / 26, py / 26) - 0.5) * 34 + (vnoise(px / 9 + 9, py / 9) - 0.5) * 9;
    var wy = py + (vnoise(px / 26 + 31, py / 26 + 17) - 0.5) * 34 + (vnoise(px / 9, py / 9 + 5) - 0.5) * 9;
    var I = isles(), best = 'emerald', bd = 1e18;
    for (var id in I) {
      var dx = wx - mapX(I[id].x), dy = (wy - mapY(I[id].y)) * 1.25, d = (dx * dx + dy * dy) * (SEA_W[I[id].pal] || 1);
      if (d < bd) { bd = d; best = I[id].pal; }
    }
    return best;
  }
  var shapes = {};
  var SIZE = { 'lumar-crown': 50, 'lumar': 30, 'lumar-tern': 26, 'lumar-holm': 24 };     // chart px across
  function shapeOf(id) {                                   // the island inked small from its own render (cut at the waterline)
    if (shapes[id]) return shapes[id].ready ? shapes[id] : null;
    shapes[id] = { ready: false };
    function img(src) { return new Promise(function (ok, no) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = no; im.src = src; }); }
    var base = '/bridge/assets/scenes/' + id + '/';
    fetch(base + 'scene.json').then(function (r) { return r.json(); }).then(function (meta) {
      return Promise.all([img(base + 'full.' + (meta.ext || 'png') + '?v=' + meta.rev), img(base + 'shore.' + (meta.ext || 'png') + '?v=' + meta.rev)]);
    }).then(function (res) {
      var full = res[0], shore = res[1], q = 4, w = Math.ceil(full.width / q), h = Math.ceil(full.height / q);
      function px(im) {
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        var g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingEnabled = false; g.drawImage(im, 0, 0, w, h);
        return g.getImageData(0, 0, w, h).data;
      }
      var F = px(full), Sh = px(shore), L = new Float32Array(w * h), m = Math.min(w, h) * 0.16, x0 = w, x1 = -1, y0 = h, y1 = -1;
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var i = y * w + x, o = i * 4, e = Math.min(x, w - 1 - x, y, h - 1 - y) / m;
        var land = F[o + 3] > 40 && !(Sh[o + 1] > 0 || Sh[o + 2] > 127) &&
                   !(e < 1 && e + 0.45 * (vnoise(x / 10, y / 10) - 0.5) + 0.2 * (vnoise(x / 3, y / 3) - 0.5) < 0.62);   // renders cut square: a ragged coast
        L[i] = land ? (F[o] * 0.3 + F[o + 1] * 0.59 + F[o + 2] * 0.11) / 255 : -1;
        if (land) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      }
      if (x1 < 0) throw new Error('no land');
      var W2 = SIZE[id] || 40, sc = (x1 - x0 + 1) / W2, H2 = Math.ceil((y1 - y0 + 1) / sc * 0.8), cw = W2 + 2, chh = H2 + 2;
      var V = new Float32Array(cw * chh).fill(-1);
      for (var yy = 0; yy < H2; yy++) for (var xx = 0; xx < W2; xx++) {   // each chart pixel: land if most of its block is
        var n = 0, tot = 0, sum = 0, bx = x0 + xx * sc, by = y0 + yy * sc / 0.8;
        for (var a = 0; a < 3; a++) for (var b = 0; b < 3; b++) {
          var sx = Math.min(w - 1, Math.floor(bx + (a + 0.5) * sc / 3)), sy = Math.min(h - 1, Math.floor(by + (b + 0.5) * sc / 0.8 / 3));
          var v = L[sy * w + sx]; tot++; if (v >= 0) { n++; sum += v; }
        }
        if (n * 2 > tot) V[(yy + 1) * cw + xx + 1] = sum / n;
      }
      var lo = 1, hi = 0;
      for (var k = 0; k < V.length; k++) if (V[k] >= 0) { lo = Math.min(lo, V[k]); hi = Math.max(hi, V[k]); }
      var cv = document.createElement('canvas'); cv.width = cw; cv.height = chh;
      var g = cv.getContext('2d'), out = g.createImageData(cw, chh), d = out.data;
      var PAL = [[58, 40, 24], [118, 88, 58], [150, 120, 84], [182, 154, 112], [206, 186, 142]];
      for (var y2 = 0; y2 < chh; y2++) for (var x2 = 0; x2 < cw; x2++) {
        var k2 = y2 * cw + x2, v2 = V[k2];
        if (v2 < 0) continue;
        var edge = V[k2 - 1] < 0 || V[k2 + 1] < 0 || V[k2 - cw] < 0 || V[k2 + cw] < 0;
        var t = (v2 - lo) / Math.max(0.05, hi - lo), tone = edge ? 0 : t < 0.2 ? 1 : t < 0.45 ? 2 : t < 0.7 ? 3 : 4;
        var c3 = PAL[tone];
        d[k2 * 4] = c3[0]; d[k2 * 4 + 1] = c3[1]; d[k2 * 4 + 2] = c3[2]; d[k2 * 4 + 3] = 255;
      }
      g.putImageData(out, 0, 0);
      shapes[id] = { ready: true, cv: cv, w: cw, h: chh };
      layout();
    }).catch(function () { /* drawn as a blob */ });
    return null;
  }
  var base = null, baseKey = '';
  function drawBase() {                                    // the parchment and the seas, made once per set of charts
    var key = Object.keys(st.seas).sort().join(',') + '|' + Object.keys(st.visited).sort().join(',') + '|' + Object.keys(st.found || {}).sort().join(',') +
              '|' + Object.keys(st.sailed).sort().join(',');
    if (base && baseKey === key) return base;
    base = document.createElement('canvas'); base.width = NW; base.height = NH; baseKey = key;
    var g = base.getContext('2d'), img = g.createImageData(NW, NH), d = img.data;
    var regions = new Array(NW * NH);
    for (var y = 0; y < NH; y++) for (var x = 0; x < NW; x++) regions[y * NW + x] = seaAt(x, y);
    for (var y2 = 0; y2 < NH; y2++) for (var x2 = 0; x2 < NW; x2++) {
      var i = y2 * NW + x2, s = regions[i], n = hash(x2 * 13 + y2 * 7919);
      var r = 216, gg = 200, b = 160;                                          // parchment
      // a sea you've charted in full colour; one you've sailed into (your mark crossed into it, or an island in it
      // visited or stumbled on) lightly — its islands stay off the chart until you buy it
      if (charted(s) || st.sailed[s] || Object.keys(st.visited).concat(Object.keys(st.found || {})).some(function (id) { return seaOf(id) === s; })) {
        var T = TINT[s], k = charted(s) ? 0.42 : 0.3;
        r = r * (1 - k) + T[0] * k; gg = gg * (1 - k) + T[1] * k; b = b * (1 - k) + T[2] * k;
        if ((x2 * 3 + y2 * 7) % 23 === 0 && ((y2 >> 2) % 3 === 0)) { r -= 24; gg -= 22; b -= 18; }   // little waves
      } else if ((x2 + y2) % 6 === 0) { r -= 14; gg -= 14; b -= 12; }        // uncharted: hatched
      var edge = Math.min(x2, y2, NW - 1 - x2, NH - 1 - y2);                 // browned edges, dithered
      var dark = Math.max(0, 1 - edge / 22) * 0.32 + (n < 0.06 ? 0.06 : 0);
      if (dark > 0 && hash(i) < 0.5 + dark) { r *= 1 - dark; gg *= 1 - dark; b *= 1 - dark * 1.2; }
      var seam = (x2 + 1 < NW && regions[i + 1] !== s) || (y2 + 1 < NH && regions[i + NW] !== s);
      if (seam && (x2 + y2) % 3) { r = 120; gg = 100; b = 76; }               // the seams, dotted
      d[i * 4] = r; d[i * 4 + 1] = gg; d[i * 4 + 2] = b; d[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    g.strokeStyle = '#5a4428'; g.lineWidth = 1; g.strokeRect(4.5, 4.5, NW - 9, NH - 9); g.strokeRect(7.5, 7.5, NW - 15, NH - 15);
    compass(g, NW - 30, NH / 2);
    return base;
  }
  function compass(g, cx, cy) {
    g.fillStyle = '#5a4428';
    for (var a = 0; a < 8; a++) {
      var ang = a * Math.PI / 4 - Math.PI / 2, L = a % 2 ? 10 : 18;
      for (var t = 0; t < L; t++) g.fillRect(Math.round(cx + Math.cos(ang) * t), Math.round(cy + Math.sin(ang) * t), 1, 1);
    }
    g.fillStyle = '#a03a2e'; g.fillRect(cx - 1, cy - 19, 3, 4);
    g.strokeStyle = '#5a4428'; g.beginPath(); g.arc(cx + 0.5, cy + 0.5, 12, 0, Math.PI * 2); g.stroke();
  }

  var el = null, cv = null, ctx = null, Z = 2, raf = 0, sel = null, labels = {}, info = null, closing = null;
  function shipsAt(id) { return typeof BridgeFleet === 'undefined' ? [] : BridgeFleet.all().filter(function (s) { return s.type !== 'sloop' && s.at === id; }); }
  function contractsTo(id) { return typeof BridgeTrade === 'undefined' ? [] : BridgeTrade.mine().filter(function (c) { return c.to === id; }); }
  function whereAmI() {                                    // ashore: your island; at sea: between the two, by the passage
    if (sailing() && BridgeSloop.chartPos) { var p = BridgeSloop.chartPos(); if (p) return p; }
    var h = here(), I = isles()[h];
    return I ? { x: I.x, y: I.y, island: h } : null;
  }
  function render(now) {
    if (!el) return;
    raf = requestAnimationFrame(render);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(drawBase(), 0, 0);
    var I = isles(), me = whereAmI(), d = course();
    // the course: a dotted gold line from you to where you're bound
    if (me && d && I[d]) {
      var x0 = mapX(me.x), y0 = mapY(me.y), x1 = mapX(I[d].x), y1 = mapY(I[d].y), n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 3);
      ctx.fillStyle = '#c89020';
      for (var i = 0; i <= n; i++) if ((i + Math.floor(now / 160)) % 3) ctx.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 2, 2);
    }
    Object.keys(I).forEach(function (id) {
      var cx = Math.round(mapX(I[id].x)), cy = Math.round(mapY(I[id].y)), k = known(id), sh = shapeOf(id);
      if (!k) {                                              // somewhere out there: a smudge, no name
        ctx.fillStyle = 'rgba(90,70,44,0.25)';
        for (var j = 0; j < 14; j++) ctx.fillRect(cx - 6 + Math.round(hash(j * 3 + cx) * 12), cy - 4 + Math.round(hash(j * 7 + cy) * 8), 2, 2);
        return;
      }
      if (sh) ctx.drawImage(sh.cv, cx - Math.round(sh.w / 2), cy - Math.round(sh.h / 2));
      else { ctx.fillStyle = '#cdb889'; ctx.fillRect(cx - 6, cy - 4, 12, 8); }
      if (id === sel) {                                      // picked: a ring round it
        ctx.strokeStyle = '#a03a2e'; ctx.lineWidth = 1; ctx.beginPath();
        ctx.ellipse(cx + 0.5, cy + 0.5, (sh ? sh.w : 12) / 2 + 5, (sh ? sh.h : 8) / 2 + 5, 0, 0, Math.PI * 2); ctx.stroke();
      }
      var ships = shipsAt(id).length, mark = cx + (sh ? Math.round(sh.w / 2) : 6) + 2;
      for (var s2 = 0; s2 < Math.min(4, ships); s2++) anchor(mark + s2 * 6, cy - 2);
      if (contractsTo(id).length) { ctx.fillStyle = '#a02a22'; ctx.fillRect(cx - 2, cy - (sh ? sh.h / 2 : 4) - 6, 5, 5); ctx.fillStyle = '#e0b060'; ctx.fillRect(cx, cy - (sh ? sh.h / 2 : 4) - 4, 1, 1); }
      if (id === 'lumar-holm' && typeof BridgeHolm !== 'undefined' && BridgeHolm.owned()) flag(cx + 2, cy - (sh ? sh.h / 2 : 4) - 1);
    });
    if (me) {                                                // you: a red ring that breathes
      var mx = Math.round(mapX(me.x)), my = Math.round(mapY(me.y)), pr = 3 + Math.round((Math.sin(now / 300) + 1) * 1.5);
      ctx.strokeStyle = '#c02a1e'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(mx + 0.5, my + 0.5, pr, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#c02a1e'; ctx.fillRect(mx - 1, my - 1, 3, 3);
    }
  }
  function anchor(x, y) {
    ctx.fillStyle = '#3a2a18';
    ctx.fillRect(x + 1, y - 3, 1, 6); ctx.fillRect(x, y - 2, 3, 1); ctx.fillRect(x - 1, y + 2, 1, 1); ctx.fillRect(x + 3, y + 2, 1, 1); ctx.fillRect(x, y + 3, 3, 1);
  }
  function flag(x, y) { ctx.fillStyle = '#3a2a18'; ctx.fillRect(x, y - 8, 1, 8); ctx.fillStyle = '#2e8a5a'; ctx.fillRect(x + 1, y - 8, 5, 3); }

  function layout() {
    if (!el) return;
    var side = window.innerWidth >= NW * 2 + 330 && window.innerWidth > window.innerHeight;   // wide: the notes beside the chart
    el.classList.toggle('side', side);
    Z = Math.floor(Math.min((window.innerWidth - 28 - (side ? 300 : 0)) / NW, (window.innerHeight - (side ? 96 : 250)) / NH));
    if (Z < 1) Z = Math.min(1, (window.innerWidth - 28) / NW);            // a phone: a little under the native size
    el.classList.toggle('small', Z < 1.5);
    cv.style.width = NW * Z + 'px'; cv.style.height = NH * Z + 'px';
    var I = isles();
    Object.keys(I).forEach(function (id) {
      var L = labels[id];
      if (!L) return;
      var k = known(id);
      L.style.display = k ? 'block' : 'none';
      L.style.left = mapX(I[id].x) * Z + 'px';
      var sh = shapes[id] && shapes[id].ready ? shapes[id] : null;
      L.style.top = (mapY(I[id].y) + (sh ? Math.ceil(sh.h / 2) + 2 : 8)) * Z + 'px';
    });
    Object.keys(SEA).forEach(function (s) {
      var L = labels['sea:' + s];
      if (!L) return;
      var isl = Object.keys(I).filter(function (id) { return seaOf(id) === s; }), ax = 0, ay = 0;
      isl.forEach(function (id) { ax += I[id].x; ay += I[id].y; });
      ax /= isl.length || 1; ay /= isl.length || 1;
      var pos = { emerald: [0.5, 0.8], sapphire: [0.88, 0.94], rose: [0.88, 0.06], crimson: [0.12, 0.94], midnight: [0.12, 0.06] }[s] || [ax, ay];
      L.style.left = mapX(pos[0]) * Z + 'px'; L.style.top = mapY(pos[1]) * Z + 'px';
      L.textContent = SEA[s] + (charted(s) ? '' : ' · uncharted');
      L.classList.toggle('dim', !charted(s));
    });
  }
  function pick(id) {
    sel = id;
    var I = isles(), d = course(), h = here(), k = known(id);
    if (!info) return;
    var notes = (NOTES[id] || []).slice();
    if (id === 'lumar-holm' && typeof BridgeHolm !== 'undefined' && BridgeHolm.owned()) notes = ['Yours: ' + BridgeHolm.name(), 'Your home port'];
    var ships = shipsAt(id), cons = contractsTo(id);
    if (ships.length) notes.push('Your ships here: ' + ships.map(function (s) { return s.name; }).join(', '));
    if (cons.length) notes.push('Contracts to deliver here: ' + cons.length);
    var can = k && id !== h && (!sailing() || BridgeSloop.canSetCourse && BridgeSloop.canSetCourse());
    info.innerHTML = '<div class="ch-name"></div><div class="ch-sea"></div><ul class="ch-notes"></ul><div class="ch-btns"></div>';
    info.querySelector('.ch-name').textContent = k ? I[id].name : 'Uncharted';
    info.querySelector('.ch-sea').textContent = SEA[seaOf(id)] + (k ? '' : ' - buy its chart from a harbourmaster');
    var ul = info.querySelector('.ch-notes');
    (k ? notes : ['Somewhere about here, an island. Without the chart you\'d never find it.']).forEach(function (n) { var li = document.createElement('li'); li.textContent = n; ul.appendChild(li); });
    var btns = info.querySelector('.ch-btns');
    function btn(label, fn, primary) { var b = document.createElement('button'); b.type = 'button'; b.textContent = label; if (primary) b.className = 'primary'; b.addEventListener('click', fn); btns.appendChild(b); return b; }
    if (id === h && !sailing()) btn('You are here', function () {}).disabled = true;
    else if (k) {
      var b1 = btn(d === id ? 'Course set ✓' : 'Set course for ' + I[id].name, function () { setCourse(id); }, true);
      if (!can || d === id) { b1.disabled = true; if (sailing() && d !== id) b1.textContent = d ? 'Bound for ' + name(d) : id === h ? 'Put back from the menu (Esc)' : 'Not now'; }
    }
    if (d && !sailing()) btn('Clear course', function () { setDest(null); pick(sel); });
    btn('Close', close);
  }
  function setCourse(id) {
    if (sailing()) {
      if (BridgeSloop.setCourse && BridgeSloop.setCourse(id)) { setDest(id); close(); }
      return;
    }
    setDest(id);
    if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast('Course set', name(id), 'Go sailing from the pier');
    pick(id);
  }
  function open() {
    if (el) return;
    if (!available()) return;
    el = document.createElement('div');
    el.id = 'sea-chart';
    el.innerHTML = '<div class="ch-frame"><div class="ch-title">The Seas of Lumar</div><div class="ch-body"><div class="ch-map"><canvas width="' + NW + '" height="' + NH + '"></canvas></div>' +
      '<div class="ch-info"></div></div><div class="ch-hint"><span class="ip-key">C</span> close · click an island · ←/→ to step through them</div></div>';
    document.body.appendChild(el);
    cv = el.querySelector('canvas'); ctx = cv.getContext('2d'); info = el.querySelector('.ch-info');
    var map = el.querySelector('.ch-map');
    labels = {};
    var I = isles();
    Object.keys(I).forEach(function (id) {
      var L = document.createElement('div'); L.className = 'ch-label'; L.textContent = I[id].name;
      L.addEventListener('click', function (e) { e.stopPropagation(); pick(id); });
      map.appendChild(L); labels[id] = L;
    });
    Object.keys(SEA).forEach(function (s) { var L = document.createElement('div'); L.className = 'ch-sea-label'; map.appendChild(L); labels['sea:' + s] = L; });
    cv.addEventListener('click', function (e) {
      var r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / Z, y = (e.clientY - r.top) / Z, best = null, bd = 400;
      Object.keys(I).forEach(function (id) { var d2 = Math.pow(mapX(I[id].x) - x, 2) + Math.pow(mapY(I[id].y) - y, 2); if (d2 < bd) { bd = d2; best = id; } });
      if (best) pick(best);
    });
    el.addEventListener('click', function (e) { if (e.target === el) close(); });
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', layout);
    if (typeof BridgeControls !== 'undefined' && !sailing()) BridgeControls.disable();
    layout();
    pick(course() || here() || 'lumar-crown');
    raf = requestAnimationFrame(render);
    requestAnimationFrame(function () { if (el) el.classList.add('open'); });
    if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx('open');
  }
  function close() {
    if (!el) return;
    cancelAnimationFrame(raf);
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', layout);
    el.remove(); el = null; info = null;
    if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx('close');
    if (typeof BridgeControls !== 'undefined' && !sailing()) BridgeControls.enable();
  }
  function toggle() { if (el) close(); else open(); }
  function onKey(e) {
    var k = e.key;
    if (k === 'Escape' || k === 'c' || k === 'C') { e.preventDefault(); e.stopPropagation(); close(); return; }
    var ids = Object.keys(isles()).filter(known);
    if (k === 'ArrowRight' || k === 'ArrowLeft' || k === 'ArrowDown' || k === 'ArrowUp') {
      e.preventDefault(); e.stopPropagation();
      var i = ids.indexOf(sel), step = k === 'ArrowRight' || k === 'ArrowDown' ? 1 : -1;
      pick(ids[((i < 0 ? 0 : i + step) + ids.length) % ids.length]);
      return;
    }
    if (k === 'Enter' || k === 'e' || k === 'E') { e.preventDefault(); e.stopPropagation(); if (sel && known(sel) && sel !== here()) setCourse(sel); }
  }

  // ---- the Chart pill, on Lumar ------------------------------------------------------------------------------------
  var pill = null;
  function init() {
    pill = document.createElement('button');
    pill.id = 'chart-pill';
    pill.innerHTML = '<span class="ip-key">C</span> Chart';
    pill.addEventListener('click', toggle);
    pill.style.display = 'none';
    document.body.appendChild(pill);
    if (typeof BridgeState !== 'undefined' && BridgeState.onChange) BridgeState.onChange(function (s) { if (s !== 'world') { pill.style.display = 'none'; close(); } else pill.style.display = here() ? 'flex' : 'none'; });
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'c' || e.key === 'C') && !e.repeat && !el && available() && !e.defaultPrevented) {
        var t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
        if (document.querySelector('.world-dialog.visible, #sloop-menu, #game-menu.open, #treasure-map, #fishing.visible')) return;   // (the menu's Map tab opens it itself)
        if (!sailing() && BridgeWorld.getMode && BridgeWorld.getMode()) return;          // skiing, climbing, boarding...
        e.preventDefault(); open();
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  return { known: known, charted: charted, dest: dest, setDest: setDest, decorate: decorate, shop: shop, open: open, close: close, toggle: toggle, islandOf: islandOf,
           isOpen: function () { return !!el; }, SEA: SEA, _state: function () { return st; } };
})();
