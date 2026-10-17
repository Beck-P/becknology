/**
 * The captain's office — aboard the Wayfarer, through the door in the bridge's south wall (pre-rendered:
 * scenes/office.py). Beck asked for an office for running his workers, then "keep working on the office space too":
 * the headquarters of everything you own and everyone who works for you. Its `office` interactions, by `part`:
 *
 *   CAPTAIN'S DESK   the ledger, the whole book (js/ledger.js)
 *   STAFF BOARD      the faces of everyone working for you, pinned to the board live (BridgeLedger.roster: the staff
 *                    at your businesses, the hands aboard your ships, your crew, the farm's hands), a lamp under each
 *                    — green at work, amber off shift or on the way, cyan at sea, red when a payday's been missed;
 *                    it opens the ledger at Staff & payroll
 *   CHART TABLE      Lumar's seas under glass, your ships pinned where they lie or moving along their passage
 *                    (js/fleet.js `away`: an order's passage, or a trading voyage out of the holm); orders: send any
 *                    of them anywhere (BridgeHarbour.send → BridgeFleet.order)
 *   STRONGBOX        the accounts (the counting table too): what your businesses made today, what's waiting at each
 *                    or banked by its manager, wages and what's owed (pay it), the holm's strongbox; each business's
 *                    books open from here (BridgeInteractions.business, as from the ledger) — nothing new is earned
 *                    or collected here that its own books don't already do
 *
 * The window looks out on wherever the ship is (BridgeOrbit). The board and the chart are holes in the render at the
 * world JSON's `office.board` / `office.chart` (screen tiles), drawn here behind it in native pixels.
 */
(function () {
  function has(n) { return typeof window[n] !== 'undefined'; }
  function choose(spec) { BridgeInteractions.choose(spec); }
  function sfx(n) { if (has('BridgeAudio') && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function rect(world, key, offX, offY, ts) {
    var r = world.office && world.office[key];
    if (!r) return null;
    var x = Math.round(offX + r[0] * ts), y = Math.round(offY + r[1] * ts);
    return { x: x, y: y, w: Math.round(offX + r[2] * ts) - x, h: Math.round(offY + r[3] * ts) - y };
  }

  // ============================================================
  //  THE STAFF BOARD
  // ============================================================
  // Green baize, a card for each of them with their face (js/look.js, or a crew member's own sheet), a brass pin and
  // a lamp: ten big cards on two rows, then twenty-one small ones on three, then "+N".
  var LAMP = { on: '#58d878', off: '#e0a840', sea: '#48c8e0', owed: '#f04838' };
  var faces = {}, people = [], peopleAt = 0;
  function roster(now) {
    if (now - peopleAt > 2000 || now < peopleAt) {
      peopleAt = now;
      people = has('BridgeLedger') && BridgeLedger.roster ? BridgeLedger.roster() : [];
    }
    return people;
  }
  // their face, 24 × 24 like the ledger's, painted once its sheet has loaded (asked again now and then until it has:
  // BridgeLook.face gives up on a sheet slow to come)
  function faceOf(p, now) {
    var key = p.sheet ? 'sheet:' + p.sheet : [p.face.seed, p.face.style, p.face.colour, p.face.wild ? 1 : 0].join('|');
    var f = faces[key];
    if (!f) { f = faces[key] = { cv: document.createElement('canvas'), next: 0, ok: false }; f.cv.width = 24; f.cv.height = 24; }
    if (!f.ok && now >= f.next) {
      if (f.next) f.ok = f.cv.getContext('2d').getImageData(12, 12, 1, 1).data[3] > 0;
      f.next = now + 5000;
      if (!f.ok && p.sheet) {                              // a crew member: the head of their own sheet, facing you
        var im = new Image();
        im.onload = function () { var g = f.cv.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(im, 4, 2, 24, 24, 0, 0, 24, 24); };
        im.src = '/bridge/assets/characters/' + p.sheet + '.png';
      } else if (!f.ok && has('BridgeLook') && BridgeLook.face) BridgeLook.face(f.cv, p.face.seed, p.face.style, p.face.colour, !!p.face.wild);
    }
    return f.cv;
  }
  var cloth = null;
  function baize(ctx, b) {                                 // the cloth, its weave dithered (made once per size)
    if (!cloth || cloth.width !== b.w || cloth.height !== b.h) {
      cloth = document.createElement('canvas'); cloth.width = b.w; cloth.height = b.h;
      var g = cloth.getContext('2d');
      g.fillStyle = '#1c3324';
      g.fillRect(0, 0, b.w, b.h);
      for (var yy = 0; yy < b.h; yy++) for (var xx = (yy * 3) % 4; xx < b.w; xx += 4) {
        var n = hash(xx * 31 + yy * 17);
        if (n < 0.35) { g.fillStyle = n < 0.12 ? '#14271b' : '#223d2b'; g.fillRect(xx, yy, 1, 1); }
      }
    }
    ctx.drawImage(cloth, b.x, b.y);
  }
  function drawBoard(ctx, world, offX, offY, ts, now) {
    var b = rect(world, 'board', offX, offY, ts);
    if (!b) return;
    baize(ctx, b);
    var list = roster(now), n = list.length;
    // the grid: big cards (head and shoulders) or small ones (a head), as many as fit; under the face a strip with
    // their lamp
    var big = n <= 10, cols = big ? 5 : 7, rows = big ? 2 : 3;
    var cw = Math.floor(b.w / cols), ch = Math.floor(b.h / rows), W = cw - (big ? 3 : 2), H = ch - (big ? 4 : 3);
    var pw = W - 2, ph = H - 5, slots = cols * rows, shown = n > slots ? slots - 1 : n;
    var ox = b.x + Math.floor((b.w - cols * cw) / 2), oy = b.y + Math.floor((b.h - rows * ch) / 2) + 2;
    for (var i = 0; i < slots; i++) {
      var cx = ox + (i % cols) * cw + Math.floor((cw - W) / 2), cy = oy + Math.floor(i / cols) * ch, mid = cx + (W >> 1);
      var p = i < shown ? list[i] : null;
      if (!p && !(i === slots - 1 && n > slots)) {       // a vacancy: a pin, and the faint mark of a card that isn't there
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(cx, cy, W, H);
        ctx.fillStyle = '#8a7440';
        ctx.fillRect(mid, cy - 1, 1, 1);
        continue;
      }
      ctx.fillStyle = 'rgba(0,0,0,0.38)';                  // the card's shadow, its paper, its lower edge
      ctx.fillRect(cx + 1, cy + 1, W, H);
      ctx.fillStyle = '#e4d6b4';
      ctx.fillRect(cx, cy, W, H);
      ctx.fillStyle = '#b8a47c';
      ctx.fillRect(cx, cy + H - 1, W, 1);
      if (p) {
        ctx.fillStyle = '#3a3028';
        ctx.fillRect(cx + 1, cy + 1, pw, ph);
        var cv = faceOf(p, now), sx = (24 - pw) >> 1, sy = big ? 2 : 3;
        ctx.drawImage(cv, sx, sy, pw, Math.min(ph, 24 - sy), cx + 1, cy + 1, pw, Math.min(ph, 24 - sy));
        var lamp = LAMP[p.state] || LAMP.on, blink = p.state === 'owed' && Math.floor(now / 500) % 2;
        ctx.fillStyle = '#4a3a24';                          // the lamp under them, in a brass cup
        ctx.fillRect(mid - 2, cy + ph + 1, 5, 3);
        ctx.fillStyle = blink ? '#5a1810' : lamp;
        ctx.fillRect(mid - 1, cy + ph + 1, 3, 2);
        if (!blink) { ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.fillRect(mid - 1, cy + ph + 1, 1, 1); }
      } else {                                             // more than the board holds: +N
        digits(ctx, '+' + (n - shown), cx + 1, cy + (H >> 1) - 3, '#5a3a20');
      }
      ctx.fillStyle = '#f0c860';                           // the brass pin
      ctx.fillRect(mid - 1, cy - 1, 2, 2);
      ctx.fillStyle = '#7a5a20';
      ctx.fillRect(mid, cy, 1, 1);
    }
    var g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);   // the picture lamp over it
    g.addColorStop(0, 'rgba(255,214,150,0.14)');
    g.addColorStop(0.55, 'rgba(255,214,150,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = g;
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }
  // a tiny pixel figure set for the board and the chart: 3 × 5
  var GLYPH = { '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001',
                '5': '111100111001111', '6': '111100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001111',
                '+': '000010111010000' };
  function digits(ctx, t, x, y, col) {
    ctx.fillStyle = col;
    for (var i = 0; i < t.length; i++) {
      var gl = GLYPH[t[i]];
      if (!gl) continue;
      for (var j = 0; j < 15; j++) if (gl[j] === '1') ctx.fillRect(x + i * 4 + (j % 3), y + Math.floor(j / 3), 1, 1);
    }
  }

  // ============================================================
  //  THE CHART TABLE
  // ============================================================
  // Lumar's seas on parchment (the seas you've charted tinted as on the chart, js/chart.js; the rest hatched), every
  // island you know inked small, your ships as pins — at their islands, or moving along their passage with their
  // course dotted ahead of them.
  var TINT = { emerald: [126, 170, 132], sapphire: [128, 150, 190], rose: [196, 150, 170], crimson: [196, 132, 116], midnight: [140, 132, 172] };
  var SIZE = { 'lumar-crown': 6, 'lumar': 5, 'lumar-tern': 4, 'lumar-holm': 4 };
  var PIN = { cutter: '#4a90e8', brigantine: '#50c070', galleon: '#f0c040', raider: '#e04040' };
  var base = null, baseKey = '';
  function isles() { return has('BridgeVoyage') && BridgeVoyage._isles || {}; }
  function known(id) { return has('BridgeChart') && BridgeChart.known ? BridgeChart.known(id) : true; }
  function charted(sea) { return has('BridgeChart') && BridgeChart.charted ? BridgeChart.charted(sea) : sea === 'emerald'; }
  function mapX(c, x) { return 6 + (x - 0.14) / 0.72 * (c.w - 12); }       // room at the top for a pin's head
  function mapY(c, y) { return 8 + (y - 0.12) / 0.72 * (c.h - 14); }
  function seaAt(c, px, py) {                              // the nearest island's sea (Midnight's reaches further)
    var I = isles(), best = 'emerald', bd = 1e18;
    var wx = px + (hash(px * 7 + py * 13) - 0.5) * 2, wy = py + (hash(px * 11 + py * 5) - 0.5) * 2;
    for (var id in I) {
      var dx = wx - mapX(c, I[id].x), dy = (wy - mapY(c, I[id].y)) * 1.3, d = (dx * dx + dy * dy) * (I[id].pal === 'midnight' ? 0.46 : 1);
      if (d < bd) { bd = d; best = I[id].pal; }
    }
    return best;
  }
  function drawBase(w, h) {                                // the parchment, its seas and islands: made once per set of charts
    var I = isles(), ids = Object.keys(I);
    var key = w + 'x' + h + '|' + ids.map(function (id) { return (known(id) ? 1 : 0) + (charted(I[id].pal) ? 1 : 0); }).join('');
    if (base && baseKey === key) return base;
    base = document.createElement('canvas'); base.width = w; base.height = h; baseKey = key;
    var g = base.getContext('2d'), img = g.createImageData(w, h), d = img.data, c = { w: w, h: h };
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var i = (y * w + x) * 4, s = seaAt(c, x, y), r = 214, gg = 198, b = 158, n = hash(x * 13 + y * 7919);
      if (charted(s)) {
        var T = TINT[s];
        r = r * 0.5 + T[0] * 0.5; gg = gg * 0.5 + T[1] * 0.5; b = b * 0.5 + T[2] * 0.5;
        if ((x * 3 + y * 7) % 17 === 0 && (y >> 1) % 3 === 0) { r -= 22; gg -= 20; b -= 16; }     // little waves
      } else { r -= 8; gg -= 10; b -= 14; if ((x + y) % 4 === 0) { r -= 22; gg -= 22; b -= 18; } }  // uncharted: hatched
      var edge = Math.min(x, y, w - 1 - x, h - 1 - y), dark = Math.max(0, 1 - edge / 6) * 0.3 + (n < 0.05 ? 0.05 : 0);
      if (dark > 0 && hash(i) < 0.5 + dark) { r *= 1 - dark; gg *= 1 - dark; b *= 1 - dark * 1.2; }
      d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255;
    }
    ids.forEach(function (id) {                            // the islands: inked blobs, a smudge where you've not been
      var cx = mapX(c, I[id].x), cy = mapY(c, I[id].y), R = SIZE[id] || 5, k = known(id), seed = id.length * 31 + id.charCodeAt(id.length - 1);
      for (var y2 = Math.floor(cy - R - 1); y2 <= cy + R + 1; y2++) for (var x2 = Math.floor(cx - R - 2); x2 <= cx + R + 2; x2++) {
        if (x2 < 1 || y2 < 1 || x2 >= w - 1 || y2 >= h - 1) continue;
        var a = Math.atan2(y2 - cy, x2 - cx), lim = R * (0.7 + 0.45 * hash(seed + Math.round(a * 2.2)));
        var dd = Math.hypot((x2 - cx) * 0.8, y2 - cy), o = (y2 * w + x2) * 4;
        if (dd > lim) continue;
        if (!k) { if (hash(x2 * 3 + y2 * 5) < 0.35) { d[o] -= 30; d[o + 1] -= 28; d[o + 2] -= 24; } continue; }
        var rim = dd > lim - 1, hi = !rim && (x2 - cx) + (y2 - cy) < -R * 0.4;
        var col = rim ? [92, 68, 40] : hi ? [214, 190, 140] : [176, 146, 100];
        d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2];
      }
    });
    g.putImageData(img, 0, 0);
    g.strokeStyle = 'rgba(80,60,36,0.8)'; g.lineWidth = 1; g.strokeRect(1.5, 1.5, w - 3, h - 3);
    return base;
  }
  // where a ship is on the chart now (0..1 chart units): at her island, or along her passage or trading voyage
  function shipPos(s, now) {
    var I = isles(), a = s.away;
    if (!a) return I[s.at] ? { x: I[s.at].x, y: I[s.at].y, at: s.at } : null;
    var f = a.back > (a.out || 0) ? Math.max(0, Math.min(1, (now - (a.out || now)) / (a.back - (a.out || now)))) : 1;
    var path = a.passage ? [a.from, a.to] : ['lumar-holm', a.from].concat((a.legs || [[a.from, a.to]]).map(function (l) { return l[1]; }), ['lumar-holm']);
    path = path.filter(function (id) { return I[id]; });
    if (path.length < 2) return null;
    var lens = [], tot = 0;
    for (var i = 1; i < path.length; i++) { var l = Math.hypot(I[path[i]].x - I[path[i - 1]].x, I[path[i]].y - I[path[i - 1]].y); lens.push(l); tot += l; }
    var t = f * tot;
    for (var j = 0; j < lens.length; j++) {
      if (t <= lens[j] || j === lens.length - 1) {
        var p = I[path[j]], q = I[path[j + 1]], u = lens[j] ? Math.min(1, t / lens[j]) : 1;
        return { x: p.x + (q.x - p.x) * u, y: p.y + (q.y - p.y) * u, to: path[j + 1], moving: true };
      }
      t -= lens[j];
    }
    return null;
  }
  var chartBuf = null;
  function drawChart(ctx, world, offX, offY, ts, now) {
    var r = rect(world, 'chart', offX, offY, ts);
    if (!r || r.w < 8 || r.h < 8) return;
    if (!chartBuf) chartBuf = document.createElement('canvas');
    if (chartBuf.width !== r.w || chartBuf.height !== r.h) { chartBuf.width = r.w; chartBuf.height = r.h; }
    var g = chartBuf.getContext('2d'), c = { w: r.w, h: r.h }, I = isles();
    g.imageSmoothingEnabled = false;
    g.drawImage(drawBase(r.w, r.h), 0, 0);
    if (has('BridgeHolm') && BridgeHolm.owned && BridgeHolm.owned() && I['lumar-holm']) {     // your island's flag
      var hx = Math.round(mapX(c, I['lumar-holm'].x)), hy = Math.round(mapY(c, I['lumar-holm'].y));
      g.fillStyle = '#3a2a18'; g.fillRect(hx, hy - 7, 1, 6);
      g.fillStyle = '#2e8a5a'; g.fillRect(hx + 1, hy - 7, 3, 2);
    }
    var ships = has('BridgeFleet') ? BridgeFleet.all().filter(function (s) { return s.type !== 'sloop'; }) : [];
    var atIsle = {};
    ships.forEach(function (s, idx) {
      var p = shipPos(s, now);
      if (!p) return;
      var x = mapX(c, p.x), y = mapY(c, p.y), col = PIN[s.type] || '#e0e0e0';
      if (p.moving) {
        var T = I[p.to], tx = mapX(c, T.x), ty = mapY(c, T.y), n = Math.ceil(Math.hypot(tx - x, ty - y) / 2);
        g.fillStyle = '#7a2a1a';                           // her course, dotted in red ink, marching on ahead of her
        for (var i = 2; i <= n; i++) if ((i + Math.floor(now / 220)) % 3 === 0) g.fillRect(Math.round(x + (tx - x) * i / n), Math.round(y + (ty - y) * i / n), 1, 1);
        g.fillStyle = 'rgba(255,255,255,0.7)';             // and a wake behind
        var ux = (tx - x) / Math.max(1, Math.hypot(tx - x, ty - y)), uy = (ty - y) / Math.max(1, Math.hypot(tx - x, ty - y));
        for (var j = 2; j <= 4; j++) if ((j + Math.floor(now / 300)) % 2) g.fillRect(Math.round(x - ux * j), Math.round(y - uy * j), 1, 1);
      } else {                                             // at her island: fanned out round it
        var k = atIsle[p.at] = (atIsle[p.at] || 0) + 1, R = (SIZE[p.at] || 5) + 2, a = -0.5 + (k - 1) * 1.2;
        x += Math.cos(a) * R + 1; y += Math.sin(a) * R * 0.7;
      }
      x = Math.round(x); y = Math.round(y);
      var bob = p.moving ? Math.round(Math.sin(now / 350 + idx) * 0.6) : 0;
      g.fillStyle = 'rgba(40,24,10,0.4)'; g.fillRect(x + 1, y, 2, 1);                 // its shadow on the paper
      g.fillStyle = '#2a1c10'; g.fillRect(x, y - 4 + bob, 1, 4 - bob);               // the pin
      g.fillStyle = '#1a1008'; g.fillRect(x - 1, y - 7 + bob, 4, 4);                  // its head in her colour, shadowed
      g.fillStyle = col; g.fillRect(x - 1, y - 7 + bob, 3, 3);
      g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(x - 1, y - 7 + bob, 1, 1);
    });
    ctx.drawImage(chartBuf, r.x, r.y);
    ctx.save();                                            // the glass over it, and the lamp's warmth
    ctx.globalCompositeOperation = 'lighter';
    var sh = Math.floor((now / 60) % (r.w + r.h + 40)) - 20;
    ctx.fillStyle = 'rgba(255,240,210,0.06)';
    for (var y2 = 0; y2 < r.h; y2++) {
      var x0 = sh - y2;
      if (x0 >= 0 && x0 < r.w - 3) ctx.fillRect(r.x + x0, r.y + y2, 3, 1);
    }
    ctx.restore();
    var gr = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
    gr.addColorStop(0, 'rgba(255,200,130,0.10)');
    gr.addColorStop(1, 'rgba(20,10,0,0.18)');
    ctx.fillStyle = gr;
    ctx.fillRect(r.x, r.y, r.w, r.h);
  }

  // ============================================================
  //  REGISTER
  // ============================================================
  BridgeWorld.registerTileset('office', {});
  BridgeWorld.registerBackground('office', function (ctx, w, h) {
    ctx.fillStyle = '#07060c';
    ctx.fillRect(0, 0, w, h);
  });
  BridgeWorld.registerSceneHooks('office', {
    behind: function (ctx, world, offX, offY, ts, time) {
      var sky = world.scene && world.scene.sky;
      if (sky && has('BridgeOrbit')) {
        var x = Math.floor(offX + sky[0] * ts), y = Math.floor(offY + sky[1] * ts);
        BridgeOrbit.draw(ctx, x, y, Math.ceil((sky[2] - sky[0]) * ts), Math.ceil((sky[3] - sky[1]) * ts), time, { horizon: 0.55 });
      }
      var now = Date.now();
      drawBoard(ctx, world, offX, offY, ts, now);
      drawChart(ctx, world, offX, offY, ts, now);
    }
  });

  // ============================================================
  //  WHAT THEY DO — 'office' interactions (js/interactions.js register)
  // ============================================================
  function coins(n) { return Math.round(n).toLocaleString(); }
  function placeOf(w) { return has('BridgeMap') && BridgeMap.placeName ? BridgeMap.placeName(w) : w; }

  // the chart table: your ships, and orders to send any of them anywhere
  function orders(note) {
    var F = has('BridgeFleet') ? BridgeFleet : null;
    var ships = F ? F.all().filter(function (s) { return s.type !== 'sloop'; }) : [];
    if (!ships.length) {
      choose({ title: 'The chart table', text: note || "LUMAR'S SEAS UNDER GLASS, AND NOT A PIN IN THEM: THE SLOOP GOES WHERE YOU GO. " +
               "A SHIP OF YOUR OWN WOULD BE PINNED HERE, WHEREVER SHE LIES - BESS TOLLIVER'S YARD ON DIGGEN'S POINT BUILDS CUTTERS.", closeLabel: 'Done' });
      return;
    }
    var rows = ships.map(function (s) {
      var no = F.canOrder(s);
      return { label: s.name, sub: F.spec(s.type).name + ' · ' + F.where(s), note: no ? (s.away && s.away.passage ? 'under way' : 'trading') : 'send her',
               disabled: !!no, pick: function () { if (has('BridgeHarbour')) BridgeHarbour.send(s, function (msg) { orders(msg); }); } };
    });
    choose({ title: 'Orders', text: note || "YOUR SHIPS, PINNED WHERE THEY LIE. PICK ONE AND SEND HER ANYWHERE: HER HANDS SAIL HER THERE WHILE YOU'RE ELSEWHERE.",
             rows: rows, closeLabel: 'Done' });
  }

  // the strongbox and the counting table: the accounts
  function accounts(note) {
    var B = has('BridgeBusiness') ? BridgeBusiness : null, mine = B ? B.summary() : [];
    var pr = has('BridgeLedger') && BridgeLedger.payroll ? BridgeLedger.payroll() : { wages: 0, made: 0, owed: { total: 0, people: [] } };
    var banked = mine.reduce(function (a, b) { return a + (b.status.banks ? b.status.banked : 0); }, 0);
    var rows = [];
    if (pr.owed.total > 0) rows.push({ label: 'Pay what\'s owed', sub: pr.owed.people.map(function (p) { return p.name + (p.missed ? ' (missed a payday)' : ''); }).join(', '),
      note: coins(pr.owed.total), pick: function () {
        B.payAll(); sfx('coin');
        setTimeout(function () { var left = B.owing().total; accounts(left ? 'PAID WHAT THERE WAS. ' + coins(left) + ' STILL OWED.' : 'EVERYONE PAID: FROM THE TAKINGS FIRST, THEN YOUR PURSE.'); }, 600);
      } });
    mine.forEach(function (o) {
      var st = o.status, where = placeOf(o.world);
      if (where === o.name && has('BridgeMap') && BridgeMap.regionOf) where = BridgeMap.regionOf(o.world) || where;   // a pub that's a place of its own
      rows.push({ label: o.name, sub: where + ' · ' + (!st.running ? 'shut: ' + (st.needsManager ? 'it needs a manager' : 'nobody working it') : st.open ? 'open' : 'shut till it opens') +
                  ' · made ' + coins(st.today) + ' today · ' + (st.banks ? coins(st.banked) + ' banked to you' : coins(o.pending) + ' waiting to collect'),
                  note: 'its books', pick: function () { BridgeInteractions.business(o.id); } });
    });
    if (has('BridgeHolm') && BridgeHolm.owned && BridgeHolm.owned()) {
      if (BridgeHolm.returns) BridgeHolm.returns();
      var chest = BridgeHolm._state().chest || 0, out = has('BridgeFleet') ? BridgeFleet.all().filter(function (s) { return s.away && !s.away.passage; }).length : 0;
      rows.push({ label: 'The strongbox on ' + BridgeHolm.name(), sub: (chest ? coins(chest) + ' coins from your ships\' voyages, at the cottage' : 'empty') +
                  (out ? ' · ' + out + (out === 1 ? ' ship' : ' ships') + ' out trading' : ''), note: 'map',
                  pick: function () { if (has('BridgeMenu')) BridgeMenu.open('map', { world: 'lumar-holm-home' }); } });
    }
    var text = note || (mine.length
      ? ('TODAY YOUR BUSINESSES HAVE MADE ' + coins(pr.made) + ' COINS' + (banked ? ', AND THEIR MANAGERS HAVE BANKED ' + coins(banked) + ' TO YOU' : '') +
         '. WAGES COME TO ' + coins(pr.wages) + ' A DAY' + (pr.owed.total ? '; ' + coins(pr.owed.total) + ' IS OWED.' : ', ALL PAID.'))
      : 'THE STRONGBOX IS EMPTY AND THE ACCOUNT BOOK BLANK. BUY A BUSINESS: THE LEDGER ON THE DESK LISTS WHAT\'S FOR SALE IN PLACES YOU\'VE BEEN.');
    choose({ title: 'The accounts', text: text, rows: rows,
             buttons: [{ label: 'The whole ledger', act: function () { if (has('BridgeMenu')) BridgeMenu.open('ledger'); } }], closeLabel: 'Done' });
  }

  function use(inter) {
    switch (inter.part) {
      case 'books':                                        // the captain's desk: the whole book
        if (has('BridgeMenu')) BridgeMenu.open('ledger');
        break;
      case 'staff':                                        // the staff board: the book, open at the staff
        if (has('BridgeMenu')) BridgeMenu.open('ledger', { focus: 'staff' });
        break;
      case 'chart': sfx('open'); orders(); break;
      case 'accounts': sfx('open'); accounts(); break;
    }
  }
  if (has('BridgeInteractions') && BridgeInteractions.register) BridgeInteractions.register('office', use, 'Use');

  // the first time in: what the room is for
  BridgeState.onChange(function (state, prev, ctx) {
    if (state !== 'world' || !ctx || ctx.worldId !== 'office') return;
    peopleAt = 0;
    var seen = null;
    try { seen = localStorage.getItem('bridge_office_seen'); localStorage.setItem('bridge_office_seen', '1'); } catch (e) { /* private mode */ }
    if (!seen && has('BridgeQuests') && BridgeQuests.toast) {
      setTimeout(function () { BridgeQuests.toast('Your office', "The captain's office", 'Your books, your people and your ships, all in one room'); }, 600);
    }
  });

  window.BridgeOffice = { orders: orders, accounts: accounts, use: use };
})();
