/**
 * BridgeHarbourLife — Lumar's harbours at work (Beck: "I like harbors that work a lot"; _claude_docs/spec-denser-worlds.md).
 *
 * The fishing fleet out at dawn and home at dusk by Lumar's own clock (js/clock.js: its 8-hour day), a merchantman
 * lying alongside now and then with a crane swinging her cargo ashore and dockhands carrying it off, the catch auctioned
 * on the quay as the boats come in (js/events.js `auction*`), and by day sailmakers, net-menders and a ropewalk at work.
 * Everything here comes from the clock alone, so every pilot sees the same with nothing sent between them.
 *
 *   BridgeHarbourLife.fleet(ms)            → { phase: 'home' | 'leaving' | 'out' | 'returning', f }   the fleet as a whole
 *   BridgeHarbourLife.times(id, i, ms)     → { dep, arr, day }  when island id's boat i casts off and is back at her berth
 *   BridgeHarbourLife.auctionAt(id, ms)    → ms the day's catch goes under the hammer on its quay (the boats just in)
 *   BridgeHarbourLife.merchant(id, ms)     → null | { kind, seed, state: 'arriving' | 'alongside' | 'leaving', t, len }
 *   BridgeHarbourLife.crane(id, ms)        → { a (0 over her hold … 1 over the stack), drop (0 up … 1 down), crate, n }
 *   BridgeHarbourLife.HARBOURS             each harbour: its quay work (crane, stack, store, sailmaker, nets, ropewalk)
 *
 * The boats themselves (their berths, their way out of the harbour, at sea) are drawn by js/sloop.js, which has the
 * hulls, sails and lines; this draws what stands on the quay — the crane, the crates, the canvas, the nets, the rope —
 * and the people at work, through the Lumar scene hooks, depth-tested and lit by the scene (BridgeScene).
 * Test hooks: _check() (every quay spot on open ground), _workers(id).
 */
var BridgeHarbourLife = (function () {
  var MIN = 60000;
  function Cl() { return typeof BridgeClock !== 'undefined' ? BridgeClock : null; }
  function now() { return Cl() ? Cl().now() : Date.now(); }
  function H(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000003) / 1000003; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---- the quays: what's at work where (tiles of each island's own map) ----------------------------------------------
  // crane: the post on the quay's edge (made solid), the merchantman's berth found by js/sloop.js in the water off it;
  // stack: where the crates land; store: where the dockhands carry them; sail: a sailmaker's canvas spread on the stones
  // [x, y, w, h] and where she works; nets: nets spread to mend [x, y, w] and the menders; rope: a ropewalk, the wheel at
  // [x0, y] and the walk out to x1. extra: dories that fish inshore off an island with no grounds offshore. keep: boats in
  // the render itself ([x0, y0, x1, y1] tiles) that no berth or way out may cross.
  var HARBOURS = {
    'lumar':          { max: 3,                        // (no room for a merchantman and a crane: the shuttle's pad has the sand)
                        nets: { at: [6, 10, 2], who: [[7, 11, 'up']] } },
    'lumar-crown':    { keep: [[12.2, 34.2, 13.8, 36.9], [15.2, 34.2, 16.8, 36.9]], merchant: 'm_brig', crane: [29, 33], stack: [28, 32], pick: [27, 32], store: [19, 31], max: 6,
                        sail: { at: [38, 32, 3, 1], who: [[41, 32, 'left']] }, nets: { at: [9, 30, 3], who: [[10, 31, 'up'], [12, 30, 'left']] },
                        rope: { from: [44, 32], to: 58 } },
    'lumar-tern':     { max: 4, nets: { at: [12, 16, 3], who: [[13, 17, 'up'], [11, 17, 'up']] }, sail: { at: [24, 13, 3, 1], who: [[23, 13, 'right']] } },
    'lumar-holm':     { extra: 2, max: 2 },
    'lumar-sapphire': { keep: [[36.4, 25, 37.7, 27.9], [39.3, 25, 40.7, 27.9]], merchant: 'm_brig', crane: [20, 24], stack: [19, 23], pick: [18, 23], store: [12, 21], max: 3,
                        sail: { at: [45, 22, 3, 1], who: [[44, 22, 'right']] }, nets: { at: [40, 23, 3], who: [[41, 22, 'down']] },
                        rope: { from: [20, 19], to: 31 } },
    'lumar-rose':     { keep: [[19.6, 25.8, 22, 27.4]], max: 3, nets: { at: [23, 20, 2], who: [[22, 20, 'right']] } },   // on the shore by the pier
    'lumar-crimson':  { extra: 2, max: 2, nets: { at: [20, 32, 2], who: [[21, 33, 'up']] } }
  };

  // ---- the fleet's day: out at dawn, home at dusk ---------------------------------------------------------------------
  var LEAVE0 = -15 * MIN, LEAVE_SPREAD = 25 * MIN;          // casting off from a quarter of an hour before sunrise, over 25 min
  var BACK0 = -35 * MIN, BACK_SPREAD = 25 * MIN;            // and home over the half hour before sunset
  /** Lumar's day round ms: its start (ms), length and sunrise and sunset (ms into it). */
  function dayOf(ms) {
    var C = Cl(), len = C ? C.dayLen('lumar') : 8 * 3600000, et = C ? C.etAt(ms) : ms;
    var into = ((et % len) + len) % len, D = daylightAt(et - into);
    return { start: ms - into, n: Math.floor(et / len), len: len, sunrise: (0.5 - D / 2) * len, sunset: (0.5 + D / 2) * len };
  }
  // Lumar's daylight as it was at the start of the day (js/clock.js `daylight`, which reads it for now: a whole day's
  // timetable is laid from its start, so it doesn't creep as the season turns under it)
  function daylightAt(et) {
    var C = Cl(), P = C && C.PLANETS && C.PLANETS.lumar;
    if (!P || !P.year || !P.year.reduce) return C ? C.daylight('lumar') : 0.5;
    var len = 0, mid = 0;
    P.year.forEach(function (x) { if (x[0] === 'summer') mid = len + x[1] / 2; len += x[1]; });
    var weekF = (et / 86400000 + 3) / 7, pos = (((weekF + (P.offset || 0)) % len) + len) % len;
    return 0.5 + (P.amp || 0.15) * Math.cos(2 * Math.PI * (pos / len - mid / len));
  }
  function times(id, i, ms) {
    var d = dayOf(ms == null ? now() : ms);
    return { dep: d.start + d.sunrise + LEAVE0 + H(id + '|out|' + i) * LEAVE_SPREAD,
             arr: d.start + d.sunset + BACK0 + H(id + '|in|' + i) * BACK_SPREAD, day: d.n };
  }
  function fleet(ms) {
    var d = dayOf(ms == null ? now() : ms), t = (ms == null ? now() : ms) - d.start;
    var l0 = d.sunrise + LEAVE0, l1 = l0 + LEAVE_SPREAD + 5 * MIN, b0 = d.sunset + BACK0 - 4 * MIN, b1 = d.sunset + BACK0 + BACK_SPREAD;
    if (t < l0 || t >= b1) return { phase: 'home', f: t < l0 ? (t + d.len - b1) / (d.len - b1 + l0) : (t - b1) / (d.len - b1 + l0) };
    if (t < l1) return { phase: 'leaving', f: (t - l0) / (l1 - l0) };
    if (t < b0) return { phase: 'out', f: (t - l1) / (b0 - l1) };
    return { phase: 'returning', f: (t - b0) / (b1 - b0) };
  }
  /** When the day's catch goes up for auction on a quay: once the last boats are in. */
  function auctionAt(id, ms) { var d = dayOf(ms == null ? now() : ms); return d.start + d.sunset + BACK0 + BACK_SPREAD + 2 * MIN; }

  // ---- a merchantman alongside now and then (half-hour slots: in, unloading, out) -------------------------------------
  var MSLOT = 30 * MIN, MIN_IN = 100000;                    // a slot; her way in (and out) takes this long
  function merchant(id, ms) {
    var cfg = HARBOURS[id];
    if (!cfg || !cfg.merchant) return null;
    ms = ms == null ? now() : ms;
    var slot = Math.floor(ms / MSLOT), t = ms - slot * MSLOT;
    var C = Cl(), sun = C ? sunAt(slot * MSLOT + MSLOT / 2) : 1;
    if (H(id + '|ship|' + slot) >= (sun > 0.3 ? 0.62 : 0.3)) return null;   // (more by day)
    var lead = 60000 + H(id + '|lead|' + slot) * 120000, end = MSLOT - 60000 - H(id + '|tail|' + slot) * 120000;
    if (t < lead || t >= end) return null;
    var st = t < lead + MIN_IN ? 'arriving' : t >= end - MIN_IN ? 'leaving' : 'alongside';
    return { kind: cfg.merchant, seed: Math.floor(H(id + '|who|' + slot) * 1e6), state: st, t: t - lead, len: end - lead, slot: slot,
             since: ms - (slot * MSLOT + lead + MIN_IN), until: (slot * MSLOT + end - MIN_IN) - ms };
  }
  function sunAt(ms) {                                       // Lumar's sun at a moment (as js/events.js skyAt)
    var C = Cl(), P = C.PLANETS.lumar, x = C.hoursAt('lumar', ms) / P.day, D = C.daylight('lumar'), w = Math.PI / 12;
    var e = Math.cos(2 * Math.PI * (x - 0.5)) - Math.cos(Math.PI * D), k = clamp((e + w) / (2 * w), 0, 1);
    return k * k * (3 - 2 * k);
  }
  // the crane's round while she's alongside: down into her hold, the sling made fast, up, swung over the quay, down onto
  // the stack, let go, up, swung back. CYCLE ms a crate.
  var CYCLE = 32000;
  function crane(id, ms) {
    var m = merchant(id, ms);
    if (!m || m.state !== 'alongside') return { a: 0.35, drop: 0, crate: false, n: m ? 0 : -1, idle: true };
    var k = Math.max(0, m.since), n = Math.floor(k / CYCLE), s = (k % CYCLE) / 1000, a, drop, crate;
    if (s < 3) { a = 0; drop = s / 3; crate = false; }                       // lowering into the hold
    else if (s < 5) { a = 0; drop = 1; crate = s > 4.2; }                    // the sling made fast
    else if (s < 9) { a = 0; drop = 1 - (s - 5) / 4; crate = true; }         // up
    else if (s < 17) { a = ease((s - 9) / 8); drop = 0; crate = true; }      // swung over the quay
    else if (s < 20) { a = 1; drop = (s - 17) / 3; crate = true; }           // down onto the stack
    else if (s < 22) { a = 1; drop = 1; crate = s < 20.8; }                  // let go
    else if (s < 25) { a = 1; drop = 1 - (s - 22) / 3; crate = false; }      // up
    else { a = 1 - ease((s - 25) / 7); drop = 0; crate = false; }            // back over her
    return { a: a, drop: drop, crate: crate, n: n, landed: n + (s >= 20.8 ? 1 : 0) };
  }
  function ease(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }

  // ---- drawing what's on the quay --------------------------------------------------------------------------------------
  var O = '#1a1008', u = 2;                                  // the outline; native px a unit (ts / 16)
  var spr = {};
  function sprite(key, w, h, paint) {
    if (spr[key]) return spr[key];
    var c = document.createElement('canvas'); c.width = w * u; c.height = h * u;
    var g = c.getContext('2d');
    paint(function (col, rs) { g.fillStyle = col; rs.forEach(function (r) { g.fillRect(r[0] * u, r[1] * u, r[2] * u, r[3] * u); }); }, g);
    return (spr[key] = c);
  }
  var ART = {
    // a crate, roped (one in the sling, the stack two or three of them)
    crate: function () { return sprite('crate', 9, 9, function (P) {
      P(O, [[0, 1, 9, 8]]); P('#9a6a34', [[1, 2, 7, 3]]); P('#7a5028', [[1, 5, 7, 3]]); P('#c08a48', [[1, 2, 7, 1]]);
      P('#4a2e14', [[1, 5, 7, 1], [4, 2, 1, 6]]); P('#d8c49a', [[2, 2, 1, 6]]);
    }); },
    // the crane's foot: a squared stone block, the post's iron collar
    base: function () { return sprite('cbase', 12, 7, function (P) {
      P(O, [[0, 0, 12, 7]]); P('#8a8a84', [[1, 1, 10, 2]]); P('#6a6a66', [[1, 3, 10, 3]]); P('#4a4a48', [[1, 5, 10, 1], [6, 3, 1, 3]]);
      P('#a8a8a0', [[1, 1, 10, 1]]); P('#2e2e30', [[4, 0, 4, 2]]);
    }); },
    // sailcloth spread flat on the stones (seen from above at the camera's slant, so it's shallow), its edge rippled, a
    // fold or two in shadow, a seam half-sewn across it, and the rest of the bolt rolled up at one end
    canvas: function (w) { return sprite('canvas' + w, w * 16, 14, function (P) {
      var W = w * 16, R = W - 5;
      for (var x = 0; x < R; x++) {
        var top = 2 + (Math.sin(x * 0.7) > 0.6 ? 1 : 0), bot = 12 + (Math.sin(x * 0.45 + 1) > 0.7 ? 1 : 0);
        P(O, [[x, top - 1, 1, bot - top + 2]]);
        if (x > 0 && x < R - 1) { P('#e6dcc4', [[x, top, 1, bot - top]]); P('#f4eedc', [[x, top, 1, 1]]); P('#cfc3a6', [[x, bot - 1, 1, 1]]); }
      }
      for (var f = 0; f < 2; f++) { var fx = Math.floor(W * (0.3 + f * 0.32)); for (var y = 3; y < 12; y++) P('#c4b898', [[fx + Math.floor((y - 3) / 2), y, 1, 1]]); }   // folds
      for (var sx = 4; sx < R - 6; sx += 4) P('#8a7e62', [[sx, 7, 2, 1]]);                                              // the seam, stitched
      P(O, [[R - 1, 0, 6, 14]]); P('#d8ccb0', [[R, 1, 4, 12]]); P('#f0e8d2', [[R, 1, 1, 12]]); P('#b0a486', [[R + 3, 1, 1, 12]]);   // the bolt, rolled
      P('#9a8e72', [[R + 1, 3, 2, 1], [R + 1, 7, 2, 1], [R + 1, 11, 2, 1]]);
      P('#c8a040', [[6, 7, 1, 1]]); P('#6a6a70', [[9, 4, 3, 1]]);                                                     // a grommet, the palm and needle
    }); },
    // a net heaped to mend: a lumpy mound of mesh, lit on its upper left, folds shadowed between the lumps, and the end
    // of it pulled out flat on the ground with the ground showing through the holes (that's what says "net"); the float
    // line looping out of the tail and over the heap with its corks, a red-and-white buoy on the far shoulder. (It was a strip of mesh in a black outline, a slab: Beck, "what is this thing?"; then a flat-topped
    // block of even mesh, still a slab.)
    net: function (w) { return sprite('net3-' + w, w * 16, 13, function (P) {
      var W = w * 16, bot = 12, tail = Math.round(W * 0.3), top = [], lo = [];
      for (var x = 0; x < W; x++) {
        if (x < tail) { top.push(bot - 3 + (Math.sin(x * 1.3) > 0.5 ? 1 : 0) + (x < 2 ? 1 : 0)); lo.push(bot - (Math.sin(x * 0.9 + 2) > 0.6 ? 1 : 0)); continue; }
        var f = (x - tail + 0.5) / (W - tail), h = 2 + 7.5 * Math.pow(Math.sin(Math.PI * f), 0.8) + 1.3 * Math.sin(f * 11) + 0.6 * Math.sin(f * 23);
        top.push(Math.round(bot - Math.max(2, h))); lo.push(bot);
      }
      var fold = function (x) { return x > tail + 1 && x < W - 2 && top[x] > top[x - 1] && top[x] > top[x + 1] - 0 && top[x] >= top[x + 1]; };
      for (x = 0; x < W; x++) {
        var t0 = top[x], heap = x >= tail, ht = Math.max(1, lo[x] - t0);
        for (var y = t0; y <= lo[x]; y++) {
          var twine = (x + y) % 3 === 0 || ((x - y) % 3 + 3) % 3 === 0, r = (lo[x] - y) / ht, rim = y === t0;
          var lit = heap && r > 0.45 && x - tail < (W - tail) * 0.6;
          if (!heap) {                                          // spread on the ground: twine, and the ground between
            if (!twine && !rim) continue;
            P(rim ? '#6e8a74' : '#5e7464', [[x, y, 1, 1]]);
            continue;
          }
          var col = twine ? (rim || lit ? '#8aa48c' : r > 0.25 ? '#5e7464' : '#4a5c50')
                          : (rim ? '#6e8a74' : r < 0.2 ? '#1e2822' : lit ? '#3a4a40' : '#2c3830');
          if (fold(x) && !rim && r > 0.2) col = '#1e2620';     // a fold between two lumps
          if (y === lo[x] && !twine) col = '#1c2420';            // its foot on the ground
          P(col, [[x, y, 1, 1]]);
        }
      }
      // the float line: out of the tail along the ground, then up and over the heap a unit under its top
      var line = [];
      for (x = 1; x < W - 5; x++) line.push([x, x < tail ? lo[x] - 1 : Math.min(bot - 1, top[x] + 1 + (x - tail < 3 ? 2 - (x - tail) * 0.7 : 0))]);
      line.forEach(function (q) { P('#9a8458', [[q[0], Math.round(q[1]), 1, 1]]); });
      for (var k = 2; k < line.length; k += 4) {               // the corks
        var cx = line[k][0], cy = Math.round(line[k][1]);
        P('#a8884a', [[cx, cy + 1, 2, 1]]); P('#e0c890', [[cx, cy, 2, 1]]); P('#f4e2b0', [[cx, cy, 1, 1]]);
      }
      var bx = W - 6, by = Math.min(bot - 4, top[W - 4] - 1);  // the buoy on the far shoulder, red and white
      P('#3a1a14', [[bx + 1, by - 1, 2, 1], [bx, by, 1, 3], [bx + 3, by, 1, 3], [bx + 1, by + 3, 2, 1]]);
      P('#c8402e', [[bx + 1, by, 2, 1], [bx + 1, by + 2, 2, 1]]); P('#f0e8dc', [[bx + 1, by + 1, 2, 1]]); P('#e86a50', [[bx + 1, by, 1, 1]]);
    }); },
    // the ropewalk's spinning wheel: a frame, the wheel, the hooks the yarn runs from
    // (f: how far it's turned) a spoked wheel on an A-frame trestle, the hooks the yarn runs from; you see through it
    wheel: function (f) { return sprite('wheel' + f, 18, 22, function (P, g) {
      function disc(r, col) { for (var y = -r; y <= r; y++) { var w = Math.round(Math.sqrt(r * r - y * y)); P(col, [[9 - w, 8 + y, w * 2 + 1, 1]]); } }
      for (var k = 0; k <= 11; k++) P(O, [[1 + Math.round(k * 0.5), 21 - k, 3, 1], [15 - Math.round(k * 0.5), 21 - k, 3, 1]]);
      for (var k2 = 0; k2 <= 11; k2++) P('#7a4e22', [[2 + Math.round(k2 * 0.5), 21 - k2, 1, 1], [16 - Math.round(k2 * 0.5), 21 - k2, 1, 1]]);
      disc(7, O); disc(6, '#a06a32');
      for (var y = -5; y <= 5; y++) { var w = Math.round(Math.sqrt(25 - y * y)); g.clearRect((9 - w) * u, (8 + y) * u, (w * 2 + 1) * u, u); }
      for (var y2 = -5; y2 <= 5; y2++) { var w2 = Math.round(Math.sqrt(25 - y2 * y2)); P(O, [[9 - w2, 8 + y2, 1, 1], [9 + w2, 8 + y2, 1, 1]]); }
      for (var sp = 0; sp < 3; sp++) {
        var a = (f / 12 + sp / 3) * Math.PI;
        for (var d = -5; d <= 5; d++) P('#8a5a2e', [[9 + Math.round(Math.cos(a) * d), 8 + Math.round(Math.sin(a) * d), 1, 1]]);
      }
      P(O, [[8, 7, 3, 3]]); P('#c08a48', [[9, 8, 1, 1]]);
      P('#c8c8c0', [[16, 6, 2, 1], [16, 9, 2, 1]]);
    }); }
  };
  function sheet(name) {
    sheet.c = sheet.c || {};
    if (!sheet.c[name]) { var e = sheet.c[name] = { img: new Image(), ready: false }; e.img.onload = function () { e.ready = true; }; e.img.src = '/bridge/assets/characters/' + name + '.png'; }
    return sheet.c[name];
  }
  var FW = 32, FH = 48, DIR = { down: 0, right: 1, up: 2, left: 3 }, IDLE = [0, 1, 2, 1];
  // someone at work: standing (or walking: walk = tiles walked), depth-tested, lit by the scene at their feet
  function person(list, name, x, y, f, walk, ms, world, offX, offY, ts, sc, after) {
    var sh = sheet(name);
    if (!sh.ready) return;
    var footRow = y + 0.9;
    list.push({ footRow: footRow, draw: function (ctx) {
      var col = walk != null ? 4 + Math.floor(walk / 0.3) % 8 : IDLE[Math.floor((ms + x * 517) / 380) % 4];
      var cx = Math.round(offX + (x + 0.5) * ts), fy = Math.round(offY + footRow * ts);
      BridgeScene.drawOccluded(ctx, sc, sh.img, col * FW, (DIR[f] || 0) * FH, FW, FH, cx - FW / 2, fy - (FH - 3), footRow, offX, offY,
        BridgeScene.tintAt(sc, world, Math.round(x), Math.round(y), ms), { x: cx, y: fy, rx: 8, ry: 3 });
      if (after) after(ctx, cx, fy);
    } });
  }
  function thing(list, c, x, y, foot, world, offX, offY, ts, ms, sc, lift) {
    var footRow = y + foot;
    list.push({ footRow: footRow, draw: function (ctx) {
      var dx = Math.round(offX + (x + 0.5) * ts - c.width / 2), dy = Math.round(offY + footRow * ts - c.height - (lift || 0));
      BridgeScene.drawOccluded(ctx, sc, c, 0, 0, c.width, c.height, dx, dy, footRow, offX, offY, BridgeScene.tintAt(sc, world, Math.round(x), Math.round(y), ms), null);
    } });
  }
  function lit(sc, world, x, y, ms) { try { return BridgeScene.tintAt(sc, world, Math.round(x), Math.round(y), ms); } catch (e) { return null; } }
  function working(id, ms) {                                 // the quay's day: work by daylight, not in the rain
    var C = Cl();
    if (C && sunAt(ms) < 0.3) return false;
    var W = typeof BridgeWeather !== 'undefined' ? BridgeWeather : null, r = W && W.regionOf && W.regionOf(id), a = r && W.at ? W.at(r, ms) : null;
    return !(a && a.def && a.def.wet);
  }

  // the crane: the post and its brace standing on the quay, the jib turning on it, the fall and the hook (a crate in the
  // sling) - drawn into a scratch canvas in the island's frame and stood in the scene at the post's foot (and the part
  // over the water at the hook's, so she's drawn over the ship's deck)
  var scratch = null;
  function craneItems(list, id, cfg, world, offX, offY, ts, ms, sc) {
    var c = cfg.crane, px = c[0] + 0.5, pr = c[1] + 0.55, k = crane(id, ms), Z = 0.7071;
    var B = typeof BridgeSloop !== 'undefined' && BridgeSloop.harbour ? BridgeSloop.harbour(id) : null, hold = B && B.merchant && B.merchant.hold;
    var hx = hold ? hold[0] : px, hr = hold ? hold[1] : pr + 2.2, sx0 = cfg.stack[0] + 0.5, sr0 = cfg.stack[1] + 0.6;
    var a0 = Math.atan2(hr - pr, hx - px), a1 = Math.atan2(sr0 - pr, sx0 - px), d0 = Math.hypot(hx - px, hr - pr), d1 = Math.hypot(sx0 - px, sr0 - pr);
    var da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    var ang = a0 + da * k.a, rad = clamp(d0 + (d1 - d0) * k.a, 1.2, 4.2), H0 = 3.6;                 // the jib's height (tiles)
    var tipx = px + Math.cos(ang) * rad, tipr = pr + Math.sin(ang) * rad;
    var groundZ = k.a < 0.5 ? (hold ? 0.55 : 0) : 0.15;                                            // her hold's floor, or the stones
    var hookZ = H0 - 0.2 - (H0 - 0.2 - groundZ - (k.crate ? 0.55 : 0.2)) * k.drop;
    function S(x, r, z) { return [Math.round(offX + x * ts), Math.round(offY + (r - z * Z) * ts)]; }
    var tint = lit(sc, world, c[0], c[1], ms);
    // the post, brace and jib, as one picture stood at the post's foot
    list.push({ footRow: pr + 0.4, draw: function (ctx) {
      var base = ART.base(), b = S(px, pr, 0);
      var W = 300, Ht = 260, ox = b[0] - 150, oy = b[1] - 200;
      if (!scratch) { scratch = document.createElement('canvas'); scratch.width = W; scratch.height = Ht; }
      var g = scratch.getContext('2d'); g.clearRect(0, 0, W, Ht);
      g.drawImage(base, b[0] - ox - base.width / 2, b[1] - oy - base.height + 4);
      var top = S(px, pr, H0 + 0.4), foot = S(px, pr, 0.2), tip = S(tipx, tipr, H0), mid = S(px + Math.cos(ang) * rad * 0.45, pr + Math.sin(ang) * rad * 0.45, H0);
      function ln(a, bb, col, w) { g.fillStyle = col; var dx = bb[0] - a[0], dy = bb[1] - a[1], n = Math.max(Math.abs(dx), Math.abs(dy)) || 1; for (var i = 0; i <= n; i++) g.fillRect(Math.round(a[0] + dx * i / n) - ox, Math.round(a[1] + dy * i / n) - oy, w, w); }
      // the post: dark outline, oak, a lit edge
      g.fillStyle = O; g.fillRect(foot[0] - 4 - ox, top[1] - oy, 9, foot[1] - top[1]);
      g.fillStyle = '#6a4424'; g.fillRect(foot[0] - 3 - ox, top[1] + 1 - oy, 7, foot[1] - top[1] - 1);
      g.fillStyle = '#8a5a2e'; g.fillRect(foot[0] - 3 - ox, top[1] + 1 - oy, 2, foot[1] - top[1] - 1); g.fillStyle = '#4e3018'; g.fillRect(foot[0] + 2 - ox, top[1] + 1 - oy, 2, foot[1] - top[1] - 1);
      g.fillStyle = '#2e2e30'; for (var yy = top[1] + 8; yy < foot[1] - 4; yy += 14) g.fillRect(foot[0] - 3 - ox, yy - oy, 7, 2);   // iron bands
      var brace = S(px, pr, H0 - 1.3);
      ln(brace, mid, O, 5); ln(brace, mid, '#7a4e22', 3);                                            // the brace up to the jib
      ln([top[0], top[1] + 5], tip, O, 6); ln([top[0], top[1] + 6], [tip[0], tip[1] + 1], '#8a5a2e', 4); ln([top[0], top[1] + 7], tip, '#b07a40', 1);   // the jib
      ln(top, tip, 'rgba(40,30,20,0.9)', 1);                                                          // its stay
      g.fillStyle = O; g.fillRect(top[0] - 4 - ox, top[1] - 2 - oy, 9, 5); g.fillStyle = '#4a4a50'; g.fillRect(top[0] - 3 - ox, top[1] - 1 - oy, 7, 3);   // the cap
      g.fillStyle = O; g.fillRect(tip[0] - 2 - ox, tip[1] - 1 - oy, 5, 4); g.fillStyle = '#6a6a70'; g.fillRect(tip[0] - 1 - ox, tip[1] - oy, 3, 2);       // the sheave
      // the winch drum on the post, turning while the fall runs
      var wz = S(px, pr, 1.1), turning = !k.idle && (k.drop > 0 && k.drop < 1);
      g.fillStyle = O; g.fillRect(wz[0] - 7 - ox, wz[1] - 4 - oy, 15, 8); g.fillStyle = '#8a5a2e'; g.fillRect(wz[0] - 6 - ox, wz[1] - 3 - oy, 13, 6);
      g.fillStyle = '#5a3a1a'; g.fillRect(wz[0] - 6 + (turning ? Math.floor(ms / 120) % 4 * 3 : 0) - ox, wz[1] - 3 - oy, 2, 6);
      g.fillStyle = '#c8b48a'; g.fillRect(wz[0] - 5 - ox, wz[1] - 1 - oy, 11, 1);
      // (nothing stands in front of a crane on the quay's edge as a rule: the depth test is tried once and then skipped
      // unless it hid something - it reads the picture back every frame)
      var key = id + ':' + sc.id;
      if (craneFree[key] === undefined) craneFree[key] = frontFree(sc, scratch, W, Ht, ox - offX, oy - offY, pr + 0.4);
      if (craneFree[key]) {
        ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(b[0], b[1] + 2, 14, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        litBlit(ctx, scratch, ox, oy, tint);
      } else BridgeScene.drawOccluded(ctx, sc, scratch, 0, 0, W, Ht, ox, oy, pr + 0.4, offX, offY, tint, { x: b[0], y: b[1] + 2, rx: 14, ry: 4 });
    } });
    // the fall and the hook (with a crate in the sling), stood where it hangs
    list.push({ footRow: tipr + (k.a < 0.5 && hold ? 0.9 : 0.5), draw: function (ctx) {
      var tip = S(tipx, tipr, H0), hk = S(tipx, tipr, hookZ);
      ctx.fillStyle = 'rgba(200,184,140,0.95)';
      for (var y = tip[1] + 2; y < hk[1]; y++) ctx.fillRect(tip[0], y, 1, 1);
      ctx.fillStyle = O; ctx.fillRect(hk[0] - 2, hk[1] - 1, 5, 4); ctx.fillStyle = '#8a8a90'; ctx.fillRect(hk[0] - 1, hk[1], 3, 2);
      if (k.crate) {
        var cr = ART.crate(), sw = Math.round(Math.sin(ms / 420) * (k.a > 0 && k.a < 1 ? 2 : 0.6));
        ctx.fillStyle = 'rgba(200,184,140,0.9)'; ctx.fillRect(hk[0] - 3 + sw, hk[1] + 3, 1, 3); ctx.fillRect(hk[0] + 3 + sw, hk[1] + 3, 1, 3);
        litBlit(ctx, cr, hk[0] - cr.width / 2 + sw, hk[1] + 5, tint);
      }
    } });
  }
  var craneFree = {}, fc = null;
  function frontFree(sc, img, W, Ht, wx, wy, foot) {        // does the scene hide any of it, stood at (wx, wy) in the world's px?
    if (!fc) fc = document.createElement('canvas');
    fc.width = W; fc.height = Ht;
    var g = fc.getContext('2d');
    BridgeScene.drawOccluded(g, sc, img, 0, 0, W, Ht, 0, 0, foot, -wx, -wy, null, null);
    var a = g.getImageData(0, 0, W, Ht).data, b = img.getContext('2d').getImageData(0, 0, W, Ht).data;
    for (var i = 3; i < a.length; i += 4) if (b[i] > 0 && a[i] < b[i]) return false;
    return true;
  }
  var lc = null;
  function litBlit(ctx, img, x, y, tint) {
    if (!tint) { ctx.drawImage(img, Math.round(x), Math.round(y)); return; }
    if (!lc) lc = document.createElement('canvas');
    if (lc.width < img.width || lc.height < img.height) { lc.width = Math.max(lc.width, img.width); lc.height = Math.max(lc.height, img.height); }
    var g = lc.getContext('2d'); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, lc.width, lc.height); g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = tint; g.fillRect(0, 0, img.width, img.height);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-over';
    ctx.drawImage(lc, 0, 0, img.width, img.height, Math.round(x), Math.round(y), img.width, img.height);
  }
  // the stack on the quay (it grows as she's unloaded, and the dockhands carry it off), and the dockhands, by turns
  // carrying a crate on their shoulder from the stack to the store and coming back for the next
  var CARRY = 1.0;                                             // tiles a second, laden or not
  function quayItems(list, id, cfg, world, offX, offY, ts, ms, sc) {
    var m = merchant(id, ms), k = crane(id, ms), cr = ART.crate();
    var n = k.idle ? 1 : 1 + ((k.landed || 0) % 3);
    for (var i = 0; i < n; i++) thing(list, cr, cfg.stack[0] + (i === 2 ? 0.28 : i ? -0.22 : 0), cfg.stack[1] + (i === 2 ? -0.05 : 0), 0.8, world, offX, offY, ts, ms, sc, i === 2 ? 14 : 0);
    if (!m || m.state !== 'alongside') return;
    var a = cfg.pick, b = cfg.store, L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, trip = 2 * L / CARRY + 4;
    ['npc-dockhand', 'npc-sailor'].forEach(function (who, j) {
      var t = (Math.max(0, m.since) / 1000 + j * trip / 2) % trip, out = t < L / CARRY, back = t >= L / CARRY + 2 && t < 2 * L / CARRY + 2;
      var d = out ? t * CARRY : back ? L - (t - L / CARRY - 2) * CARRY : t < L / CARRY + 2 ? L : 0;
      var x = a[0] + (b[0] - a[0]) * d / L, y = a[1] + (b[1] - a[1]) * d / L;
      var dir = out ? [b[0] - a[0], b[1] - a[1]] : [a[0] - b[0], a[1] - b[1]];
      var f = Math.abs(dir[0]) > Math.abs(dir[1]) ? (dir[0] > 0 ? 'right' : 'left') : (dir[1] > 0 ? 'down' : 'up');
      person(list, who, x, y, f, out || back ? d : null, ms, world, offX, offY, ts, sc, out ? function (ctx, cx, fy) {   // the crate on his shoulder
        litBlit(ctx, cr, cx - cr.width / 2 + (f === 'left' ? -3 : f === 'right' ? 3 : 0), fy - 44, lit(sc, world, x, y, ms));
      } : null);
    });
  }
  // the day's work on the quay: the sailmaker over her canvas (the needle glinting), the menders over the nets, the
  // ropemaker walking backwards from the wheel paying out the yarn, then back to start the next
  function workItems(list, id, cfg, world, offX, offY, ts, ms, sc) {
    var on = working(id, ms);
    if (cfg.sail) {
      var s = cfg.sail.at;
      if (on) thing(list, ART.canvas(s[2]), s[0] + s[2] / 2 - 0.5, s[1], 0.75, world, offX, offY, ts, ms, sc);   // (taken in out of the rain, and at night)
      if (on) cfg.sail.who.forEach(function (w, i) { person(list, i ? 'npc-fisher-b' : 'npc-fishwife', w[0], w[1], w[2], null, ms, world, offX, offY, ts, sc, glint(ms, i)); });
    }
    if (cfg.nets) {
      var nt = cfg.nets.at;
      thing(list, ART.net(nt[2]), nt[0] + nt[2] / 2 - 0.5, nt[1], 0.62, world, offX, offY, ts, ms, sc);
      if (on) cfg.nets.who.forEach(function (w, i) { person(list, ['npc-fisher-gran', 'npc-fisher-a'][i % 2], w[0], w[1], w[2], null, ms, world, offX, offY, ts, sc, glint(ms, i + 3)); });
    }
    if (cfg.rope) {
      var R = cfg.rope, x0 = R.from[0], y0 = R.from[1], span = R.to - x0, tint = lit(sc, world, x0, y0, ms);
      var T = span / 0.35 + span / 1.2 + 8, t = (ms / 1000 + H(id) * 100) % T, walkOut = t < span / 0.35;
      var d = walkOut ? t * 0.35 : t < span / 0.35 + 4 ? span : t < span / 0.35 + 4 + span / 1.2 ? span - (t - span / 0.35 - 4) * 1.2 : 0;
      var yarn = on && (walkOut || t < span / 0.35 + 4) ? d : 0, hx = x0 + 0.5 + d;
      thing(list, ART.wheel(on && walkOut ? Math.floor(ms / 140) % 4 : 0), x0, y0, 0.7, world, offX, offY, ts, ms, sc);   // (turning as the yarn's paid out)
      list.push({ footRow: y0 + 0.75, draw: function (ctx) {                                   // the yarn, a hand's height over the stones
        if (yarn < 0.2) return;
        var a = [Math.round(offX + (x0 + 0.5) * ts) + 8, Math.round(offY + (y0 + 0.75) * ts) - 22], b = [Math.round(offX + (x0 + 0.5 + yarn) * ts) - 6, Math.round(offY + (y0 + 0.9) * ts) - 24];
        var sag = Math.min(10, yarn * 1.2);
        for (var x = a[0]; x <= b[0]; x++) {
          var f = (x - a[0]) / Math.max(1, b[0] - a[0]), y = Math.round(a[1] + (b[1] - a[1]) * f + Math.sin(f * Math.PI) * sag);
          ctx.fillStyle = 'rgba(40,26,14,0.55)'; ctx.fillRect(x, y + 1, 1, 1);
          ctx.fillStyle = tint ? mix('#d8c49a', tint) : '#d8c49a'; ctx.fillRect(x, y, 1, 1);
        }
      } });
      if (on) person(list, 'npc-sailor', hx - 0.5, y0, walkOut ? 'left' : t < span / 0.35 + 4 ? 'left' : 'left', walkOut || (t >= span / 0.35 + 4 && d > 0) ? d * (walkOut ? 1 : -1) + 100 : null, ms, world, offX, offY, ts, sc);
    }
  }
  function mix(hex, tint) {                                   // a colour lit by the scene's light (rgb(...) multiply)
    var m = /rgb\((\d+),(\d+),(\d+)\)/.exec(tint || '');
    if (!m) return hex;
    var v = parseInt(hex.slice(1), 16), r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255;
    return 'rgb(' + Math.round(r * m[1] / 255) + ',' + Math.round(g * m[2] / 255) + ',' + Math.round(b * m[3] / 255) + ')';
  }
  function glint(ms, i) {                                     // a needle or a shuttle catching the light at their hands, now and then
    return function (ctx, cx, fy) {
      var p = Math.sin(ms / 260 + i * 1.7);
      if (p < 0.35) return;
      ctx.fillStyle = p > 0.85 ? '#ffffff' : '#e8e0c8';
      ctx.fillRect(cx + (i % 2 ? -7 : 6), fy - 18 + Math.round(p * 2), 1, 1);
    };
  }
  function items(world, offX, offY, ts, ms, sc) {
    if (typeof BridgeWorld === 'undefined' || typeof BridgeScene === 'undefined' || !sc || !sc.depth) return [];
    var id = BridgeWorld.getWorldId(), cfg = HARBOURS[id];
    if (!cfg) return [];
    var list = [], t = now();
    try {
      if (cfg.crane) { craneItems(list, id, cfg, world, offX, offY, ts, t, sc); quayItems(list, id, cfg, world, offX, offY, ts, t, sc); }
      workItems(list, id, cfg, world, offX, offY, ts, t, sc);
    } catch (e) { /* a quay half-loaded */ }
    return list;
  }
  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('lumar', { items: items });

  /** As a world loads (js/world.js): the crane's post and the stack are solid; nobody walks through them. */
  function decorate(worldId, data) {
    var cfg = HARBOURS[worldId];
    if (!cfg || !data || !data.collisions) return;
    [cfg.crane, cfg.stack].forEach(function (c) { if (c && data.collisions[c[1]] && data.collisions[c[1]][c[0]] === 0) data.collisions[c[1]][c[0]] = 1; });
  }
  /** (tests) every quay spot on open ground (or, the crane, at the quay's edge), and the dockhands' way clear. */
  function check() {
    var out = [];
    return Promise.all(Object.keys(HARBOURS).map(function (id) {
      return fetch('/bridge/assets/worlds/' + id + '.json').then(function (r) { return r.json(); }).then(function (d) {
        var C = d.collisions, cfg = HARBOURS[id];
        function open(x, y) { x = Math.round(x); y = Math.round(y); return C[y] && C[y][x] === 0; }
        function way(a, b, what) {
          var n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 3);
          for (var k = 0; k <= n; k++) { var x = a[0] + (b[0] - a[0]) * k / n, y = a[1] + (b[1] - a[1]) * k / n; if (!open(x, y)) { out.push(id + ': ' + what + ' crosses a solid tile near ' + Math.round(x) + ',' + Math.round(y)); return; } }
        }
        if (cfg.pick && !open(cfg.pick[0], cfg.pick[1])) out.push(id + ': the dockhands\' pick-up on a solid tile');
        if (cfg.store) way(cfg.pick, cfg.store, 'the dockhands\' way');
        if (cfg.sail) cfg.sail.who.forEach(function (w) { if (!open(w[0], w[1])) out.push(id + ': the sailmaker on a solid tile'); });
        if (cfg.sail) for (var x = 0; x < cfg.sail.at[2]; x++) if (!open(cfg.sail.at[0] + x, cfg.sail.at[1])) out.push(id + ': the canvas on a solid tile at ' + (cfg.sail.at[0] + x));
        if (cfg.nets) cfg.nets.who.forEach(function (w) { if (!open(w[0], w[1])) out.push(id + ': a net-mender on a solid tile at ' + w); });
        if (cfg.nets) for (var x2 = 0; x2 < cfg.nets.at[2]; x2++) if (!open(cfg.nets.at[0] + x2, cfg.nets.at[1])) out.push(id + ': the net on a solid tile at ' + (cfg.nets.at[0] + x2));
        if (cfg.rope) way(cfg.rope.from, [cfg.rope.to, cfg.rope.from[1]], 'the ropewalk');
      });
    })).then(function () { return out; });
  }
  return {
    HARBOURS: HARBOURS, fleet: fleet, times: times, auctionAt: auctionAt, merchant: merchant, crane: crane, dayOf: dayOf, sunAt: sunAt,
    decorate: decorate, working: working, _check: check, CYCLE: CYCLE
  };
})();
