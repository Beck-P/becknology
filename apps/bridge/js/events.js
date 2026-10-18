/**
 * BridgeEvents — small things happening, between the festivals (_claude_docs/spec-denser-worlds.md).
 *
 * Beck: small events on the hour, "a lot of fun". A trader in on Crownhaven quay, the catch auctioned on Tern Holm, a
 * fiddler by the fountain, a fight out of the tavern, a wedding on St Brendan's steps, toy boats in the fountain; a
 * chase through Arcadia's sky lanes, NULL taking every screen in the city, a star on the Royale's carpet, a drone losing
 * its parcel, a brownout block by block; a hen loose in Brambleford, the mail coach, a balloon, kites, a rainbow; avalanche
 * blasting, the ski patrol, a sleigh, a snowball fight, the whole of Fellhaven out for the aurora; Elderglade's lantern
 * procession, the spirit stag, Thaelin playing; and on Enigma, lights going down the ring, a door that opens by itself,
 * a voice on the comms.
 *
 * Each place (a *stream*: a world, or a few that share a sky) has a slot every twenty minutes; most slots one thing
 * happens in it, picked by a hash of the stream and the slot from what fits the hour and the weather then (js/clock.js,
 * js/weather.js), at a time in the slot the same hash gives. So everyone online sees the same thing at the same
 * moment, and the schedule is just the next slots read ahead (`_schedule`). Nothing happens where a festival's on.
 *
 * You notice one the way you would: a sound, people gathering (BridgeCrowd.gather, when crowds are about), a word
 * overheard in a bubble over whoever's in it — at the edge of the screen, pointing, if it's off it. Some leave something:
 * a short sale, a lot at auction, a coin on a bet, a parcel in the road, a slice of cake. What you got from each is
 * kept (localStorage `bridge_events`), once per happening.
 *
 * An event in the catalogue (EV) is data plus a few hooks:
 *   stream, worlds   where it runs (stream defaults to the world; worlds to [world])
 *   len, w           minutes it lasts; its weight in the draw
 *   when(ms, E)      whether it fits then (the hour, the weather); evaluated at the slot's middle
 *   at, hear         where it is (the bubble points there), and how far off you hear it (tiles)
 *   cast             people: { sheet, x, y, f } standing, or with path [[x, y], …] and speed (tiles a second), from/until (s)
 *   props            things put up: { art, x, y, solid }
 *   talk             what you can do: { x, y (or at(L)), label, prompt, on(L, inter) }; take: an existing one's label taken over
 *   gather           a crowd round it: { x, y, r, n, face }
 *   sfx / loop       a sound as it starts; a sound every `every` s while you're within `near` tiles
 *   say              [[s, who (cast index or 'at'), text], …]: bubbles at those moments
 *   begin, tick, end, behind, ground, items, over: its own parts, called with the live happening L
 *
 * BridgeEvents.decorate(worldId, data)   as a world loads (js/world.js)
 * BridgeEvents.live(worldId?)            → [{ id, name, start, end }] happening now
 * BridgeEvents.screens(now)              → 'null' while NULL has Arcadia's screens (js/skyline.js)
 * BridgeEvents._force(id, s), _schedule(worldId, hours), _check()   the tests
 */
var BridgeEvents = (function () {
  var MIN = 60000, SLOT = 20 * MIN, KEY = 'bridge_events';
  var mem = {};
  try { mem = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { mem = {}; }
  mem.got = mem.got || {};
  function save() {
    var k = Object.keys(mem.got);
    if (k.length > 300) k.slice(0, k.length - 300).forEach(function (x) { delete mem.got[x]; });
    try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* private mode: this session only */ }
  }
  function H(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000003) / 1000003; }
  function Cl() { return typeof BridgeClock !== 'undefined' ? BridgeClock : null; }
  function now() { return Cl() ? Cl().now() : Date.now(); }
  function wid() { return typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId ? BridgeWorld.getWorldId() : null; }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function itemName(id) { var it = typeof BridgeItems !== 'undefined' && BridgeItems.get(id); return it ? it.name : String(id).replace(/_/g, ' '); }
  function give(id, n) { if (typeof BridgeInventory !== 'undefined') (BridgeInventory.give || BridgeInventory.addItem)(id, n || 1); }
  function coins(n, why) { if (typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins) BridgeProgression.awardCoins(n, 'event:' + why); }
  function pay(n, why) {
    if (typeof BridgeProgression === 'undefined' || !BridgeProgression.wagerCoins) return Promise.resolve({ ok: false });
    return BridgeProgression.wagerCoins(n, 'event:' + why);
  }
  function note(title, sub) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.note) BridgeQuests.note('Happening', title, sub || ''); }
  function toast(k, t, s) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(k, t, s, false); }
  function say(title, text) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(title, text); }
  function choose(spec) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.choose(spec); }
  function me() { return typeof BridgeCharacter !== 'undefined' && BridgeCharacter.getX ? { x: BridgeCharacter.getX(), y: BridgeCharacter.getY() } : null; }
  function dist(a, b) { return Math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1])); }
  function near(x, y, r) { var p = me(); return !!p && dist([p.x, p.y], [x, y]) <= r; }
  function pick(list, k) { return list[Math.floor(H(k) * list.length) % list.length]; }
  function got(L, what) { return !!mem.got[L.key + ':' + what]; }
  function mark(L, what) { mem.got[L.key + ':' + what] = 1; save(); }

  // ---- the sky and the weather at a moment (the schedule asks at a slot's middle, so it's the same for everyone) ----
  function skyAt(world, ms) {
    var C = Cl(), planet = C && C.planet(world), P = planet && C.PLANETS[planet];
    if (!P) return { sun: 0.5, dusk: 0, x: 0.5 };
    if (P.night) return { sun: 0, dusk: 0, x: 0.5 };
    if (P.none || /^lumar-midnight/.test(world)) return { sun: 0, dusk: 0, x: 0.5 };
    var x = C.hoursAt(planet, ms) / P.day, D = C.daylight(planet), w = Math.PI / 12;
    var e = Math.cos(2 * Math.PI * (x - 0.5)) - Math.cos(Math.PI * D);
    var t = Math.max(0, Math.min(1, (e + w) / (2 * w)));
    return { sun: t * t * (3 - 2 * t), dusk: Math.exp(-(e / w) * (e / w)), x: x };
  }
  function wxAt(world, ms) {
    var W = typeof BridgeWeather !== 'undefined' ? BridgeWeather : null, r = W && W.regionOf(world);
    var a = r ? W.at(r, ms) : null;
    return a ? { kind: a.kind, wet: !!(a.def && a.def.wet), bad: !!(a.def && a.def.bad) } : { kind: null, wet: false, bad: false };
  }
  function festival(world) {
    if (typeof BridgeFestivals === 'undefined' || !BridgeFestivals.on || !Cl()) return false;
    return BridgeFestivals.on(Cl().planet(world)).some(function (f) { return f.world === world; });
  }

  // ---- drawing: people from their sheets, things from a few rects on the 16-unit grid --------------------------------
  var FW = 32, FH = 48, DIR = { down: 0, right: 1, up: 2, left: 3 }, IDLE = [0, 1, 2, 1], sheets = {};
  function sheet(name) {
    if (!sheets[name]) {
      var e = sheets[name] = { img: new Image(), ready: false };
      e.img.onload = function () { e.ready = true; };
      e.img.src = '/bridge/assets/characters/' + name + '.png';
    }
    return sheets[name];
  }
  // someone in the scene: { sheet, x, y, f, walk (tiles walked, while walking), lift (native px) }
  function person(o, world, offX, offY, ts, ms, sc) {
    var sh = sheet(o.sheet);
    if (!sh.ready || !sc) return null;
    var footRow = o.y + 0.9;
    return { footRow: footRow, draw: function (ctx) {
      var col = o.walk != null ? 4 + Math.floor(o.walk / 0.3) % 8 : (function (k) { return k % 12 === 5 ? 3 : IDLE[k % 4]; })(Math.floor((ms + (o.seed || 0) * 137) / 360));
      var cx = Math.round(offX + (o.x + 0.5) * ts), footY = Math.round(offY + footRow * ts) - (o.lift || 0);
      BridgeScene.drawOccluded(ctx, sc, sh.img, col * FW, (DIR[o.f] || 0) * FH, FW, FH, cx - FW / 2, footY - (FH - 3), footRow,
        offX, offY, BridgeScene.tintAt(sc, world, Math.round(o.x), Math.round(o.y), ms), { x: cx, y: footY + (o.lift || 0), rx: 8, ry: 3 });
      if (o.after) o.after(ctx, cx, footY, ts);
    } };
  }
  function px(ctx, x, y, u, c, rs) { ctx.fillStyle = c; for (var i = 0; i < rs.length; i++) { var r = rs[i]; ctx.fillRect(x + r[0] * u, y + r[1] * u, r[2] * u, r[3] * u); } }
  var art = {};
  // a sprite drawn once at 2 native px a unit: w × h units, its foot at the bottom; mirror for facing left
  function sprite(key, w, h, paint, flip) {
    var k = key + (flip ? ':f' : '');
    if (art[k]) return art[k];
    var c = document.createElement('canvas'), u = 2;
    c.width = w * u; c.height = h * u;
    var g = c.getContext('2d');
    if (flip) { g.translate(c.width, 0); g.scale(-1, 1); }
    paint(function (col, rs) { px(g, 0, 0, u, col, rs); }, g);
    return (art[k] = c);
  }
  // a sprite stood in the scene at tile (x, y), centred on x + 0.5, depth-tested; lit by the room unless glow
  function thing(c, x, y, world, offX, offY, ts, ms, sc, o) {
    o = o || {};
    var footRow = y + (o.foot != null ? o.foot : 0.95);
    return { footRow: footRow, draw: function (ctx) {
      var dx = Math.round(offX + (x + 0.5) * ts - c.width / 2), dy = Math.round(offY + (y + 1) * ts - c.height - (o.lift || 0));
      if (o.alpha != null) ctx.globalAlpha = o.alpha;
      if (sc) BridgeScene.drawOccluded(ctx, sc, c, 0, 0, c.width, c.height, dx, dy, footRow, offX, offY,
        o.glow ? null : BridgeScene.tintAt(sc, world, Math.round(x), Math.round(y), ms), o.shadow ? { x: dx + c.width / 2, y: dy + c.height + (o.lift || 0), rx: o.shadow, ry: Math.max(2, o.shadow / 3) } : null);
      else ctx.drawImage(c, dx, dy);
      ctx.globalAlpha = 1;
      if (o.after) o.after(ctx, dx, dy);
    } };
  }
  function glow(ctx, x, y, r, rgb, a) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  // ---- the art --------------------------------------------------------------------------------------------------------
  var O = '#1a1008';                                                   // the outline most things share
  var ART = {
    // a sea trader's stall: blue-and-white awning on two posts, a counter of goods, a chest, cloth, a lamp
    stall: function () { return sprite('stall', 48, 40, function (P) {
      P(O, [[1, 3, 46, 10], [2, 12, 2, 28], [44, 12, 2, 28], [0, 23, 48, 12], [1, 35, 46, 5]]);
      for (var i = 0; i < 12; i++) P(i % 2 ? '#f0e8d8' : '#2a5a8a', [[1 + i * 4, 4, 4, 7], [2 + i * 4, 11, 2, 1]]);
      P('#3e78b0', [[1, 4, 4, 1], [9, 4, 4, 1], [17, 4, 4, 1], [25, 4, 4, 1], [33, 4, 4, 1], [41, 4, 4, 1]]);
      P('#6a4422', [[2, 13, 1, 22], [44, 13, 1, 22]]);
      P('#7a4e22', [[1, 26, 46, 9]]); P('#a06a32', [[1, 24, 46, 2]]); P('#4a2e14', [[1, 26, 46, 1], [9, 27, 1, 8], [19, 27, 1, 8], [29, 27, 1, 8], [39, 27, 1, 8]]);
      P('#5a3a1a', [[2, 35, 44, 4]]);
      P(O, [[5, 16, 10, 8]]); P('#6a3a18', [[6, 17, 8, 6]]); P('#c0902a', [[6, 19, 8, 1], [9, 17, 2, 6]]); P('#e0c060', [[9, 19, 2, 1]]);
      P(O, [[17, 18, 9, 6]]); P('#3a6ab0', [[18, 19, 3, 5]]); P('#c05a8a', [[22, 19, 3, 5]]); P('#5a8ad0', [[18, 19, 3, 1]]); P('#e07aaa', [[22, 19, 3, 1]]);
      P(O, [[28, 18, 4, 6], [33, 19, 3, 5]]); P('#4aa0a8', [[29, 19, 2, 4]]); P('#c8a040', [[34, 20, 1, 3]]); P('#a0e0e0', [[29, 19, 1, 1]]);
      P(O, [[38, 17, 5, 7]]); P('#a08040', [[39, 18, 3, 5]]); P('#ffe080', [[40, 19, 1, 3]]);
    }); },
    // crates, two high, roped
    crates: function () { return sprite('crates', 16, 22, function (P) {
      P(O, [[1, 2, 13, 20]]); P('#8a5a2a', [[2, 3, 11, 8], [2, 12, 11, 9]]); P('#a87038', [[2, 3, 11, 1], [2, 12, 11, 1]]);
      P('#5a3a1a', [[2, 7, 11, 1], [2, 16, 11, 1], [7, 3, 1, 18]]); P('#c8b080', [[4, 3, 1, 18]]);
    }); },
    // the auctioneer's chalkboard on an easel: a fish drawn at the top, the bids chalked under it
    board: function () { return sprite('board', 16, 26, function (P) {
      P(O, [[2, 2, 12, 14], [3, 16, 1, 10], [12, 16, 1, 10]]); P('#243428', [[3, 3, 10, 12]]);
      P('#d8e0d0', [[4, 9, 6, 1], [4, 11, 7, 1], [4, 13, 5, 1]]); P('#8ab0c0', [[5, 5, 5, 2]]); P('#5a8090', [[10, 5, 2, 2]]); P('#e8e8d8', [[6, 5, 1, 1]]);
      P('#7a5030', [[3, 16, 1, 9], [12, 16, 1, 9]]);
    }); },
    // a box of the catch on ice
    fishbox: function () { return sprite('fishbox', 16, 12, function (P) {
      P(O, [[1, 2, 14, 10]]); P('#8a5a2a', [[2, 5, 12, 6]]); P('#5a3a1a', [[2, 8, 12, 1]]); P('#d8eef4', [[2, 3, 12, 2]]);
      P('#a0b8c8', [[3, 3, 4, 1], [8, 2, 5, 2]]); P('#e8f0f8', [[4, 3, 1, 1], [10, 2, 1, 1]]); P('#4a6a7a', [[7, 3, 1, 1], [13, 2, 1, 1]]);
    }); },
    // a hen, side on, two strides
    hen: function (frame, flip) { return sprite('hen' + frame, 9, 9, function (P) {
      P(O, [[1, 2, 7, 5], [5, 0, 3, 3], [2, 7, 1, 2], [5, 7, 1, 2]]);
      P('#f2ece0', [[2, 3, 5, 3], [6, 1, 1, 2]]); P('#c8bcac', [[2, 5, 4, 1], [1, 3, 1, 2]]); P('#d83a2a', [[6, 0, 1, 1], [7, 2, 1, 1]]);
      P('#f0b020', [[8, 1, 1, 1]]); P('#1a1008', [[7, 1, 1, 1]]);
      P('#e0a020', frame ? [[3, 7, 1, 2], [5, 7, 1, 1]] : [[2, 7, 1, 1], [5, 7, 1, 2]]);
    }, flip); },
    // the mail coach: bottle-green body lined in gold, red wheels, the coachman up front with his horn; its horse
    coach: function (frame, flip) { return sprite('coach' + frame, 40, 24, function (P) {
      // the coach
      P(O, [[1, 3, 23, 15], [3, 1, 18, 3], [22, 7, 5, 2]]);
      P('#1e4a30', [[2, 4, 21, 12]]); P('#2e6a44', [[2, 4, 21, 2]]); P('#c8a040', [[2, 9, 21, 1], [2, 15, 21, 1]]);
      P('#6a4a2a', [[4, 1, 16, 2]]); P('#8a6a3a', [[5, 0, 6, 1], [12, 0, 6, 1]]);
      P(O, [[5, 5, 6, 4], [13, 5, 6, 4]]); P('#ffe080', [[6, 6, 4, 2], [14, 6, 4, 2]]);
      P('#3a2414', [[21, 0, 3, 2]]); P('#5a3a1a', [[20, 2, 5, 5]]); P('#e0c090', [[22, 3, 2, 2]]); P('#c8a040', [[25, 3, 2, 1]]);
      // wheels
      [[2, 14], [16, 14]].forEach(function (w) {
        P(O, [[w[0], w[1], 7, 7]]); P('#a83030', [[w[0] + 1, w[1] + 1, 5, 5]]); P('#5a1414', [[w[0] + 3, w[1] + 1, 1, 5], [w[0] + 1, w[1] + 3, 5, 1]]);
        P('#e0c060', [[w[0] + 3, w[1] + 3, 1, 1]]);
      });
      // the shafts and the horse
      P('#3a2414', [[24, 13, 6, 1]]);
      P(O, [[28, 6, 9, 8], [34, 2, 5, 6], [37, 3, 3, 3]]);
      P('#7a4a26', [[29, 7, 7, 6], [35, 3, 3, 4]]); P('#9a6234', [[29, 7, 7, 1], [35, 3, 2, 1]]); P('#3a2010', [[34, 2, 1, 4], [28, 7, 1, 3]]);
      P('#1a1008', [[37, 4, 1, 1]]); P('#a83030', [[31, 9, 4, 1]]); P('#e0c060', [[33, 9, 1, 1]]);
      P(O, frame ? [[29, 13, 2, 7], [34, 13, 2, 6]] : [[30, 13, 2, 6], [33, 13, 2, 7]]);
      P('#6a3e20', frame ? [[29, 13, 1, 6], [34, 13, 1, 5]] : [[30, 13, 1, 5], [33, 13, 1, 6]]);
    }, flip); },
    // a horse-drawn sleigh, red and gold, two under rugs and a lantern on the dash
    sleigh: function (frame, flip) { return sprite('sleigh' + frame, 40, 22, function (P) {
      P(O, [[1, 6, 22, 12], [0, 16, 26, 2], [21, 4, 4, 6]]);
      P('#a8282a', [[2, 7, 20, 9]]); P('#d03a3a', [[2, 7, 20, 2]]); P('#e0b040', [[2, 12, 20, 1], [22, 5, 2, 1], [1, 17, 24, 1]]);
      P('#3a2a5a', [[5, 3, 5, 5], [12, 3, 5, 5]]); P('#e0c098', [[6, 2, 3, 3], [13, 2, 3, 3]]); P('#e04a4a', [[5, 5, 5, 2]]); P('#4a8ad0', [[12, 5, 5, 2]]);
      P('#2a6a3a', [[4, 8, 15, 3]]);
      P('#3a2414', [[24, 12, 6, 1]]);
      P(O, [[28, 5, 9, 8], [34, 1, 5, 6], [37, 2, 3, 3]]);
      P('#4a3020', [[29, 6, 7, 6], [35, 2, 3, 4]]); P('#6a4630', [[29, 6, 7, 1], [35, 2, 2, 1]]); P('#e8e8f0', [[34, 1, 1, 4]]);
      P('#1a1008', [[37, 3, 1, 1]]); P('#a83030', [[30, 8, 5, 1]]); P('#f0d050', [[30, 9, 1, 1], [32, 9, 1, 1], [34, 9, 1, 1]]);
      P(O, frame ? [[29, 12, 2, 7], [34, 12, 2, 6]] : [[30, 12, 2, 6], [33, 12, 2, 7]]);
      P('#3a2414', frame ? [[29, 12, 1, 6], [34, 12, 1, 5]] : [[30, 12, 1, 5], [33, 12, 1, 6]]);
      P('#ffe080', [[22, 3, 1, 1]]);
    }, flip); },
    // the ski patrol's rescue sled: orange, a white cross, someone under a blanket
    sled: function () { return sprite('sled', 18, 8, function (P) {
      P(O, [[0, 2, 18, 6]]); P('#e06020', [[1, 3, 16, 4]]); P('#f08a40', [[1, 3, 16, 1]]); P('#f4f4f4', [[3, 4, 3, 1], [4, 3, 1, 3]]);
      P('#3a6ab0', [[7, 2, 8, 4]]); P('#5a8ad0', [[7, 2, 8, 1]]); P('#e8c0a0', [[14, 1, 3, 3]]); P('#6a3a1a', [[14, 1, 3, 1]]);
    }); },
    // a hot-air balloon: panels in red, gold and cream, a wicker basket, a passenger waving
    balloon: function () { return sprite('balloon', 34, 46, function (P) {
      // the envelope: an egg of eight gores, red, gold and cream, lit from the upper left, darker at the crown and the mouth
      var cols = [['#8a1a1a', '#c83030', '#e85a4a'], ['#a07a10', '#f0c040', '#ffe080'], ['#a89a80', '#f4ecd8', '#ffffff'], ['#8a1a1a', '#c83030', '#e85a4a']];
      for (var y = 0; y < 32; y++) {
        var t = y / 31, half = Math.round(16 * Math.sin(Math.PI * Math.min(1, 0.12 + t * 1.05)) * (t > 0.78 ? 1 - (t - 0.78) * 2.2 : 1));
        if (half < 2) half = 2;
        P(O, [[17 - half - 1, y, half * 2 + 2, 1]]);
        for (var x = -half; x < half; x++) {
          var g = Math.floor((x + half) / (half * 2) * 8), c = cols[g % 4], sh = x < -half * 0.4 ? 2 : x > half * 0.5 ? 0 : 1;
          P(y < 3 || y > 28 ? c[0] : c[sh], [[17 + x, y, 1, 1]]);
        }
      }
      P('#4a2a1a', [[11, 32, 1, 6], [22, 32, 1, 6], [14, 32, 1, 6], [19, 32, 1, 6]]);
      // the basket and who's in it, waving
      P(O, [[10, 37, 14, 9]]); P('#a87038', [[11, 38, 12, 7]]); P('#c89050', [[11, 38, 12, 1]]); P('#6a4422', [[13, 39, 1, 6], [16, 39, 1, 6], [19, 39, 1, 6], [11, 41, 12, 1]]);
      P(O, [[13, 34, 4, 4], [19, 34, 3, 4]]); P('#e8c098', [[14, 35, 2, 2], [20, 35, 1, 2]]); P('#5a3a1a', [[14, 34, 2, 1]]); P('#e8c098', [[22, 32, 1, 3]]);
    }); },
    // a kite
    kite: function (col) { return sprite('kite' + col, 11, 14, function (P) {
      for (var y = 0; y < 13; y++) { var w = y < 5 ? y + 1 : 13 - y; if (w < 1) w = 1; P(O, [[5 - w, y, w * 2 + 1, 1]]); if (w > 1) P(col, [[6 - w, y, w * 2 - 1, 1]]); }
      P('#fff4d8', [[5, 1, 1, 11], [1, 5, 9, 1]]);
    }); },
    // the spirit stag: pale silver-green, antlers like branches, four strides
    stag: function (frame, flip) { return sprite('stag' + frame, 22, 22, function (P) {
      var body = '#c8ecdc', dark = '#7ab0a0', lite = '#f0fff8';
      P('#3a6a62', [[5, 9, 12, 6], [15, 4, 4, 6], [18, 5, 3, 3], [14, 0, 1, 5], [17, 0, 1, 5], [12, 1, 3, 1], [17, 1, 3, 1], [13, 3, 2, 1], [18, 2, 2, 1]]);
      P(body, [[6, 10, 10, 4], [16, 5, 2, 5], [19, 6, 1, 1]]); P(lite, [[6, 10, 10, 1], [16, 5, 1, 2]]); P(dark, [[6, 13, 10, 1]]);
      P('#e8fff4', [[14, 0, 1, 4], [17, 0, 1, 4], [12, 1, 2, 1], [18, 1, 2, 1], [13, 3, 1, 1], [19, 2, 1, 1]]);
      P('#1a3a34', [[18, 6, 1, 1]]);
      var legs = [[[7, 14, 1, 6], [9, 14, 1, 5], [13, 14, 1, 6], [15, 14, 1, 5]], [[6, 14, 1, 5], [9, 14, 1, 6], [12, 14, 1, 5], [15, 14, 1, 6]],
                  [[7, 14, 1, 5], [8, 14, 1, 6], [13, 14, 1, 5], [14, 14, 1, 6]], [[8, 14, 1, 6], [9, 14, 1, 5], [14, 14, 1, 6], [15, 14, 1, 5]]][frame];
      P('#3a6a62', legs.map(function (l) { return [l[0] - 0, l[1], l[2] + 1, l[3] + 1]; })); P(body, legs);
      P(lite, [[5, 9, 1, 2]]);
    }, flip); },
    // a drone with a parcel slung under it
    drone: function (frame, parcel) { return sprite('drone' + frame + (parcel ? 'p' : ''), 14, 12, function (P) {
      P(O, [[3, 2, 8, 3], [1, 1, 3, 1], [10, 1, 3, 1]]);
      P('#3a3e4a', [[4, 3, 6, 1]]); P('#6a7080', [[4, 2, 6, 1]]); P(frame ? '#ff3a6a' : '#5cc8d0', [[6, 3, 2, 1]]);
      P('#a0a8b8', frame ? [[0, 0, 5, 1], [9, 0, 5, 1]] : [[1, 0, 3, 1], [10, 0, 3, 1]]);
      if (parcel) { P('#3a2a1a', [[6, 5, 1, 2], [7, 5, 1, 2]]); P(O, [[4, 7, 6, 5]]); P('#b08050', [[5, 8, 4, 3]]); P('#e0d0a0', [[6, 8, 2, 3]]); }
    }); },
    parcel: function () { return sprite('parcel', 8, 7, function (P) {
      P(O, [[1, 1, 7, 6]]); P('#b08050', [[2, 2, 5, 4]]); P('#d0a070', [[2, 2, 5, 1]]); P('#e0d0a0', [[4, 2, 1, 4]]); P('#5cc8d0', [[2, 4, 1, 1]]);
    }); },
    // a toy boat, its sail in a child's colour
    boat: function (col) { return sprite('boat' + col, 7, 7, function (P) {
      P(O, [[0, 4, 7, 3], [3, 0, 1, 4]]); P('#7a4e22', [[1, 5, 5, 1]]); P('#a06a32', [[1, 4, 5, 1]]);
      P(col, [[4, 1, 2, 3], [5, 2, 1, 1]]); P('#f4ecd8', [[2, 1, 1, 3]]);
    }); },
    // a fiddle under the chin, its bow
    fiddle: function () { return sprite('fiddle', 6, 4, function (P) {
      P(O, [[2, 0, 4, 4], [0, 1, 2, 1]]); P('#a8582a', [[3, 1, 2, 2]]); P('#d07a3a', [[3, 1, 2, 1]]); P('#3a2010', [[1, 1, 1, 1]]);
    }); },
    // a leaf lantern, lit
    lantern: function () { return sprite('lantern', 4, 6, function (P) {
      P(O, [[1, 0, 2, 1], [0, 1, 4, 5]]); P('#e0a040', [[1, 2, 2, 3]]); P('#fff0b8', [[1, 3, 1, 1]]); P('#3e6e34', [[0, 1, 4, 1]]);
    }); },
    // a note of music, rising
    note: function () { return sprite('note', 4, 6, function (P) {
      P('#2a1a10', [[0, 3, 3, 3], [2, 0, 2, 4]]); P('#fff0c8', [[1, 4, 1, 1], [3, 0, 1, 3]]);
    }); },
    snowball: function () { return sprite('snowball', 3, 3, function (P) { P('#5a6a8a', [[0, 0, 3, 3]]); P('#f4f8ff', [[0, 0, 2, 2]]); }); }
  };

  // ---- the catalogue ----------------------------------------------------------------------------------------------------
  // the lantern procession's way down from the Great Tree, and where each lantern-bearer stands round the Moonwell
  var LANTERN_PATH = [[22.5, 7.4], [22.5, 12], [20, 15], [16, 16], [13, 17], [12, 19], [12, 21]];
  var RING = [[12, 21.2], [11, 22.2], [9, 22.4], [7, 22.2], [6, 21.2]];
  var day = function (min) { return function (ms, E) { return skyAt(E.worlds[0], ms).sun >= (min == null ? 0.3 : min); }; };
  var dry = function (ms, E) { return !wxAt(E.worlds[0], ms).wet; };
  var both = function () { var fs = [].slice.call(arguments); return function (ms, E) { return fs.every(function (f) { return f(ms, E); }); }; };
  // a talk that gives something once per happening
  function once(L, what, fn) { if (got(L, what)) return false; mark(L, what); fn(); return true; }

  // the catch auction on a quay: the auctioneer by a chalkboard, boxes of the catch, a crowd; a lot a minute. Due once a day
  // as the fleet comes in (js/harbourlife.js `auctionAt`), in the slot that holds it (or the next, if it falls too late)
  function catchAuction(world, o) {
    var E = {
      world: world, name: 'The catch auctioned', len: 6, w: 3, at: o.at, haul: o.haul,
      hint: 'The boats are in — the catch is up for auction', sfx: 'gavel',
      props: [{ art: 'board', x: o.board[0], y: o.board[1], solid: [o.board] }].concat(o.boxes.map(function (b) { return { art: 'fishbox', x: b[0], y: b[1], foot: b[2] }; })),
      cast: [{ sheet: o.who, x: o.at[0], y: o.at[1], f: 'down' }],
      gather: { x: o.gather.x, y: o.gather.y, r: o.gather.r, n: o.gather.n, face: o.at },
      talk: [{ x: o.talk[0], y: o.talk[1], label: 'THE CATCH AUCTION', prompt: 'PRESS E TO BID', on: function (L) { auctionBid(L); } }],
      tick: function (L) { auctionTick(L); },
      when: function () { return false; },                         // (not drawn at random: due)
      note: o.note
    };
    E.due = function (slot) {
      var HL = typeof BridgeHarbourLife !== 'undefined' ? BridgeHarbourLife : null;
      if (!HL) return null;
      var t = HL.auctionAt(world, slot * SLOT + SLOT / 2), s = Math.floor(t / SLOT);
      if (t - s * SLOT > SLOT - E.len - MIN) { s++; t = s * SLOT + MIN; }
      return s === slot ? t : null;
    };
    return E;
  }

  var EV = {
    // ---- Lumar ----
    trader: {
      world: 'lumar-crown', name: 'A trader in on the quay', len: 6, w: 2, at: [35, 31],
      hint: 'A ship\'s just in — a trader\'s set up on the quay', sfx: 'bell',
      props: [{ art: 'stall', x: 35, y: 31, solid: [[34, 31], [35, 31], [36, 31]] }, { art: 'crates', x: 33, y: 30 }],
      cast: [{ sheet: 'npc-trader', x: 37, y: 31, f: 'left' }],
      gather: { x: 35, y: 32.6, r: 2.6, n: 7, face: [35, 31] },
      say: [[3, 0, 'FRESH OFF THE BOAT!'], [40, 0, 'RARE GOODS, WHILE THEY LAST'], [120, 0, 'NOT HERE TOMORROW!']],
      talk: [{ x: 35, y: 31, label: 'SHIP\'S TRADER', prompt: 'PRESS E TO BROWSE', on: function (L) { traderSale(L); } }],
      note: 'A trader in on Crownhaven quay'
    },
    wedding: {
      world: 'lumar-crown', name: 'A wedding at St Brendan\'s', len: 6, w: 4, at: [47, 20], when: day(0.25),
      hint: 'Bells at St Brendan\'s — a wedding!', sfx: 'peal', loop: { name: 'peal', every: 16, near: 24 },
      cast: [{ sheet: 'npc-bride', x: 46, y: 20, f: 'down' }, { sheet: 'npc-groom', x: 47, y: 20, f: 'down' }, { sheet: 'npc-coralie', x: 48, y: 19, f: 'down' }],
      gather: { x: 47, y: 22.6, r: 3, n: 10, face: [46.5, 20] },
      say: [[4, 'at', 'THEY SAID YES!'], [30, 2, 'BLESSINGS ON YOU BOTH'], [90, 'at', 'THROW THE PETALS!']],
      talk: [{ x: 47, y: 21, label: 'THE HAPPY COUPLE', prompt: 'PRESS E TO WISH THEM WELL', on: function (L) {
        if (once(L, 'cake', function () { give('wedding_cake', 1); }))
          say('THE HAPPY COUPLE', 'THE BRIDE LAUGHS AND PRESSES A SLICE OF CAKE ON YOU, WRAPPED IN A NAPKIN. "FOR LUCK. EVERYONE GETS SOME."');
        else say('THE HAPPY COUPLE', '"THANK YOU! STAY FOR THE DANCING."');
      } }],
      over: function (L, ctx, offX, offY, ts, ms) { petals(L, ctx, offX, offY, ts, ms, [43, 16, 52, 23]); },
      note: 'A wedding on St Brendan\'s steps'
    },
    toyboats: {
      world: 'lumar-crown', name: 'Toy boats in the fountain', len: 5, w: 2, at: [32, 18], when: day(0.2),
      hint: 'Kids racing toy boats in the fountain', sfx: 'splash',
      cast: [{ sheet: 'npc-kid-a', x: 29, y: 18, f: 'right' }, { sheet: 'npc-kid-b', x: 34, y: 18, f: 'left' }, { sheet: 'npc-kid-a', x: 31, y: 20, f: 'up', seed: 3 }],
      gather: { x: 32, y: 20.8, r: 2.2, n: 4, face: [31.5, 18] },
      say: [[5, 0, 'GO ON, RED!'], [25, 1, 'BLUE\'S WINNING!'], [50, 2, 'NOT FAIR, IT HIT THE SPOUT!']],
      take: [{ label: 'FOUNTAIN', prompt: 'PRESS E TO BACK A BOAT', on: function (L) { boatBet(L); } }],
      ground: function (L, ctx, offX, offY, ts, ms) { toyBoats(L, ctx, offX, offY, ts, ms); },
      tick: function (L) { boatResult(L); },
      note: 'Toy boats raced in Crownhaven\'s fountain'
    },
    fiddler: {
      world: 'lumar-square', name: 'A fiddler by the fountain', len: 5, w: 3, at: [13, 10], when: dry,
      hint: 'A fiddler\'s struck up by the fountain', loop: { name: 'fiddle', every: 4.8, near: 14 },
      cast: [{ sheet: 'npc-townsman', x: 13, y: 10, f: 'down', after: fiddleOn }],
      gather: { x: 13, y: 12.2, r: 2.4, n: 6, face: [13, 10] },
      talk: [{ x: 13, y: 11, label: 'THE FIDDLER', prompt: 'PRESS E TO TIP', on: function (L) { tipFiddler(L); } }],
      over: function (L, ctx, offX, offY, ts, ms) { notes(ctx, offX, offY, ts, ms, 13, 10, 1); },
      note: 'A fiddler played in the Market Square'
    },
    brawl: {
      world: 'lumar-square', name: 'A fight out of the tavern', len: 4, w: 2, at: [5.5, 7], when: function (ms, E) { return skyAt(E.worlds[0], ms).sun < 0.45; },
      hint: 'Shouting outside the tavern — a fight!', sfx: 'door', loop: { name: 'hit', every: 1.1, near: 16 },
      cast: [{ sheet: 'npc-sailor', x: 5, y: 7, f: 'right', shove: 1 }, { sheet: 'npc-dockhand', x: 6, y: 7, f: 'left', shove: -1 }],
      gather: { x: 5.5, y: 8.8, r: 2.6, n: 7, face: [5.5, 7] },
      say: [[2, 0, 'SAY THAT AGAIN!'], [8, 1, 'YOU CHEATED AT BONES!'], [16, 'at', 'FIGHT! FIGHT!'], [50, 0, 'HOLD STILL, YOU…'], [100, 1, 'I\'M NOT DONE!']],
      talk: [{ x: 5, y: 8, label: 'THE BRAWL', prompt: 'PRESS E TO STEP IN', on: function (L) { brawlStep(L); } }],
      items: function (L, world, offX, offY, ts, ms, sc) { return L.mine && L.mine.calm ? [] : dust(L, ms, 5.5, 7.2, offX, offY, ts); },
      tick: function (L) { brawlEnd(L); },
      note: 'A fight spilled out of Diggen\'s Tavern'
    },
    // the day's catch auctioned on each fishing harbour's quay as the boats come in at dusk (js/harbourlife.js: the fleet's
    // day) - never at random, always that once a day (`due`)
    auction: catchAuction('lumar-tern', { at: [30, 16], board: [31, 16], boxes: [[29, 17], [30, 17, 0.6]], talk: [31, 17], who: 'npc-fishmonger',
      gather: { x: 30.5, y: 18.6, r: 2.4, n: 7 }, haul: 'OLD PELL\'S BOYS ARE STILL HAULING BOXES UP THE SHINGLE.', note: 'The catch went under the hammer on Tern Holm' }),
    auction_crown: catchAuction('lumar-crown', { at: [15, 31], board: [14, 31], boxes: [[16, 32], [17, 32, 0.6]], talk: [15, 32], who: 'npc-fishmonger',
      gather: { x: 15.5, y: 32.4, r: 2.4, n: 8 }, haul: 'THE TRAWLERS ARE IN UNDER THE FISHING JETTY AND THE BOXES ARE COMING UP THE STEPS.', note: 'The catch went under the hammer on Crownhaven quay' }),
    auction_diggen: catchAuction('lumar', { at: [7, 11], board: [6, 10], boxes: [[8, 11, 0.6]], talk: [7, 12], who: 'npc-fishwife',
      gather: { x: 7.5, y: 13, r: 2, n: 5 }, haul: 'THE BOATS ARE DRAWN UP AND THE BOXES ARE STACKED ON THE SAND.', note: 'The catch went under the hammer on Diggen\'s Point' }),
    auction_sapphire: catchAuction('lumar-sapphire', { at: [37, 22], board: [36, 22], boxes: [[38, 22], [36, 23, 0.6]], talk: [37, 23], who: 'npc-fishmonger',
      gather: { x: 37.5, y: 23.6, r: 2.2, n: 7 }, haul: 'THE BOATS ARE IN AT THE FISHING PIER AND THE GLASSWORKS\' COOKS ARE ALREADY ELBOWING FOR THE FRONT.', note: 'The catch went under the hammer in Sapphire Port' }),
    auction_rose: catchAuction('lumar-rose', { at: [24, 16], board: [23, 16], boxes: [[25, 17], [23, 17, 0.6]], talk: [24, 17], who: 'npc-fishwife',
      gather: { x: 24.5, y: 17.8, r: 2.2, n: 6 }, haul: 'THE BOATS ARE IN UNDER THE CRYSTAL TERRACES, THE CATCH STILL GLITTERING WITH SPORE.', note: 'The catch went under the hammer in Rose Cove' }),
    auction_crimson: catchAuction('lumar-crimson', { at: [33, 32], board: [32, 32], boxes: [[34, 33], [32, 33, 0.6]], talk: [33, 33], who: 'npc-sailor',
      gather: { x: 33.5, y: 33.8, r: 2.2, n: 6 }, haul: 'WHATEVER CAME UP IN THE NETS - AND OFF A FEW OTHER PEOPLE\'S BOATS - SOLD OFF A BARREL HEAD. NO QUESTIONS.', note: 'The catch went under the hammer at Crimson Reach' }),

    // ---- Arcadia ----
    celebrity: {
      world: 'arcadia-street', name: 'A star on the Royale\'s carpet', len: 3, w: 3, at: [50.5, 10],
      hint: 'Flashbulbs at the Royale — someone famous!', sfx: 'flash', loop: { name: 'flash', every: 0.9, near: 18 },
      cast: [{ sheet: 'npc-highroller', path: [[50.5, 12.6], [50.5, 8.6]], speed: 0.07, from: 14, until: 120, end: 'down' },
             { sheet: 'npc-host', path: [[50.5, 13.2], [50.5, 9.2]], speed: 0.07, from: 16, until: 118, end: 'up' }],
      gather: { x: 50.5, y: 10.5, r: 3.6, n: 12, face: [50.5, 10.5] },
      say: [[6, 'at', 'IS THAT…?!'], [24, 0, 'NO PICTURES. OKAY, ONE.'], [70, 'at', 'OVER HERE!']],
      talk: [{ at: function (L) { var p = L.pos[0]; return p && !p.hide ? [Math.round(p.x), Math.round(p.y) + 1] : null; },
               label: 'THE STAR', prompt: 'PRESS E TO ASK FOR AN AUTOGRAPH', on: function (L) { autograph(L); } }],
      over: function (L, ctx, offX, offY, ts, ms) { flashes(L, ctx, offX, offY, ts, ms); },
      note: function (L) { return starName(L) + ' on the Neon Royale\'s red carpet'; }
    },
    parcel: {
      world: 'arcadia-street', name: 'A drone drops its parcel', len: 2.5, w: 3, at: [30, 10],
      hint: 'A delivery drone\'s in trouble — its parcel\'s falling!', sfx: 'drone',
      begin: function (L) { L.drop = parcelDrop(L); },
      items: function (L, world, offX, offY, ts, ms, sc) { return droneItems(L, world, offX, offY, ts, ms, sc); },
      tick: function (L) { parcelLand(L); },
      note: 'A drone dropped its parcel on the District street'
    },
    brownout: {
      world: 'arcadia-street', name: 'A brownout, block by block', len: 1.5, w: 2, at: [30, 10],
      when: function (ms, E) { return wxAt(E.worlds[0], ms).kind !== 'blackout'; },
      hint: 'The power\'s going — block by block', sfx: 'powerdown',
      over: function (L, ctx, offX, offY, ts, ms, w, h) { brownout(L, ctx, offX, offY, ts, ms); },
      tick: function (L) { var k = Math.floor(L.t / 7000); if (k !== L.band && k < 9) { L.band = k; if (L.here) sfx('powerdown'); } },
      note: 'A brownout rolled down the District street'
    },
    chase: {
      stream: 'arcadia-sky', worlds: ['arcadia-street', 'arcadia-skywalk', 'arcadia-skypad', 'arcadia-alley', 'arcadia-oldquarter', 'arcadia-spaceport', 'arcadia-terraces'], name: 'A chase in the sky lanes',
      len: 1.5, w: 2, at: null, hint: 'Sirens — a chase through the sky lanes!', sfx: 'siren', loop: { name: 'siren', every: 2.2, near: 999 },
      behind: function (L, ctx, offX, offY, ts, ms) { chaseSky(L, ctx, ms); },
      over: function (L, ctx, offX, offY, ts, ms) { chaseLights(L, ctx, ms); },
      react: 'look', note: 'A police chase tore through Arcadia\'s sky lanes'
    },
    hijack: {
      stream: 'arcadia-sky', worlds: ['arcadia-street', 'arcadia-skywalk', 'arcadia-skypad', 'arcadia-alley', 'arcadia-home', 'arcadia-penthouse', 'arcadia-oldquarter', 'arcadia-spaceport', 'arcadia-terraces'],
      name: 'NULL takes the screens', len: 1, w: 1, at: null, hint: 'Every screen in the city — NULL\'s mark', sfx: 'glitch', loop: { name: 'glitch', every: 7, near: 999 },
      react: 'look', note: function (L) { return 'NULL had every screen in Arcadia: "' + pick(NULL_SAYS, L.key) + '"'; },
      over: function (L, ctx, offX, offY, ts, ms) { scanlines(L, ctx, ms); }
    },
    // Arcadia below (js/undercity.js): the Saints collecting down the market, a downpour through the grates, the Sump stirring
    collection: {
      world: 'arcadia-undercity', name: 'The Saints come collecting', len: 3, w: 3, at: [20, 15],
      hint: 'Two Rust Saints are working down the stalls, collecting', sfx: 'thud',
      cast: [{ sheet: 'npc-saint-a', path: [[58, 15.4], [40, 15.4], [21, 15.2], [15, 15.2]], speed: 0.5, from: 1, end: 'up' },
             { sheet: 'npc-saint-b', path: [[59, 16.0], [41, 16.0], [22, 15.9], [16, 15.9]], speed: 0.5, from: 2, end: 'up' }],
      say: [[6, 0, 'DUES, GRANDAD. SAME AS EVERY WEEK.'], [50, 1, 'THE SAINTS SAY THANK YOU.'], [96, 0, 'NEXT!'], [120, 'at', 'NOT AGAIN...']],
      react: 'look',
      talk: [{ x: 16, y: 14, label: 'THE SAINTS', prompt: 'PRESS E TO STAND UP TO THEM', on: function (L) { saintsStand(L); } }],
      note: 'The Rust Saints came collecting in the Warrens'
    },
    surge: {
      world: 'arcadia-undercity', name: 'A downpour through the grates', len: 2, w: 2, at: [40, 22],
      hint: 'A downpour up on the District — every grate in the Warrens is pouring', sfx: 'splat', loop: { name: 'splat', every: 3, near: 999 },
      over: function (L, ctx, offX, offY, ts, ms, w, h) { downpour(L, ctx, w, h); },
      react: 'look', note: 'A downpour came through the Warrens\' grates'
    },
    stirring: {
      world: 'arcadia-sump', name: 'Something moving in the canal', len: 1.5, w: 2, at: [60, 33],
      hint: 'The water in the south basin is moving — something big under it', sfx: 'horn',
      over: function (L, ctx, offX, offY, ts, ms) { stirring(L, ctx, offX, offY, ts); },
      say: [[4, 'at', 'DID YOU HEAR THAT?'], [30, 'at', 'GET AWAY FROM THE EDGE.']],
      react: 'flee', note: 'Something moved under the water of the Sump'
    },
    // the Spires (arcadia-spires, L480: js/spires.js)
    operaout: {
      world: 'arcadia-spires', name: 'The Lyra lets out', len: 4, w: 3, at: [72.5, 12],
      hint: 'The interval — the Lyra empties onto the plaza', sfx: 'chime',
      cast: [{ sheet: 'npc-diva', path: [[72.5, 10.2], [71.0, 13.0], [69.5, 14.5]], speed: 0.05, from: 20, until: 220, end: 'down' },
             { sheet: 'npc-usher', x: 74, y: 11, f: 'down' },
             { sheet: 'npc-member-b', path: [[73.5, 10.2], [76.0, 14.0]], speed: 0.05, from: 6, end: 'down' }],
      gather: { x: 71, y: 15.5, r: 3.6, n: 12, face: [72.5, 10] },
      say: [[8, 'at', 'BRAVA! BRAVA!'], [26, 0, 'THANK YOU, DARLINGS. THE THIRD ACT IS WORSE. FOR ME.'], [60, 'at', 'IS THAT SERAPHINE?'],
            [110, 1, 'THE SECOND ACT, LADIES AND GENTLEMEN, IN FIVE MINUTES.']],
      note: 'The Lyra let out for the interval and Seraphine came down the steps'
    },
    fireworks: {
      world: 'arcadia-spires', name: 'Fireworks over the sky docks', len: 3, w: 2, at: [80, 38],
      hint: 'Fireworks off the Lumière — a party aboard', sfx: 'blast', loop: { name: 'blast', every: 2.4, near: 60 },
      gather: { x: 78, y: 39, r: 4.2, n: 14, face: [80, 44] },
      say: [[10, 'at', 'OOOH.'], [40, 'at', 'WHOSE PARTY IS IT?'], [90, 'at', 'NOBODY KNOWS. NOBODY EVER KNOWS.']],
      over: function (L, ctx, offX, offY, ts, ms) { spireFireworks(L, ctx, offX, offY, ts, ms); },
      note: 'Fireworks went up off the yacht at the sky docks'
    },

    // the Mid-Levels' Terraces (L200): a proposal at Halo, a jam at Moonglow
    proposal: {
      world: 'arcadia-terraces', name: 'A proposal at Halo', len: 4, w: 2, at: [16.5, 32],
      hint: 'Everyone on Halo\'s deck has gone quiet — someone\'s on one knee', sfx: 'chime',
      cast: [{ sheet: 'npc-highroller', x: 15, y: 32, f: 'right' }, { sheet: 'npc-gambler-a', x: 17, y: 32, f: 'left' }],
      gather: { x: 16, y: 33.4, r: 3, n: 8, face: [16, 32] },
      say: [[4, 0, 'I HAD A WHOLE SPEECH…'], [16, 0, 'WILL YOU…?'], [22, 1, 'YES! OBVIOUSLY YES!'], [26, 'at', 'SHE SAID YES!'], [90, 'at', 'CHAMPAGNE FOR THE DECK!']],
      talk: [{ x: 16, y: 33, label: 'THE HAPPY COUPLE', prompt: 'PRESS E TO CONGRATULATE THEM', on: function (L) {
        if (L.t < 22000) { say('THE HAPPY COUPLE', 'NOT YET - HE HASN\'T ASKED. EVERYONE ON THE DECK IS HOLDING THEIR BREATH.'); return; }
        if (once(L, 'fizz', function () { give('champagne', 1); }))
          say('THE HAPPY COUPLE', 'HE SHAKES YOUR HAND TWICE. SHE PUTS A FLUTE OF CHAMPAGNE IN YOUR OTHER ONE. "WE MET DOWN IN THE DISTRICT. LOOK AT US NOW."');
        else say('THE HAPPY COUPLE', '"THANK YOU! WE\'RE GOING TO TELL EVERYONE ABOUT THE STRANGER WHO CLAPPED LOUDEST."');
      } }],
      tick: function (L) {
        if (L.t > 22000 && !L.cheered) {
          L.cheered = 1;
          if (typeof BridgeCrowd !== 'undefined' && BridgeCrowd.react) try { BridgeCrowd.react('arcadia-terraces', { x: 16, y: 32, r: 8, kind: 'cheer', ms: 5000 }); } catch (e) { /* no crowd */ }
        }
      },
      over: function (L, ctx, offX, offY, ts, ms) { if (L.t > 22000) petals(L, ctx, offX, offY, ts, ms, [12, 27, 21, 36]); },
      note: 'A proposal on Halo\'s deck, two hundred floors up'
    },
    jam: {
      world: 'arcadia-jazz', name: 'A jam at Moonglow', len: 5, w: 3, at: [14, 6],
      hint: 'Ray\'s waved someone up from the floor — a jam session', loop: { name: 'chime', every: 6, near: 18 },
      cast: [{ sheet: 'npc-highroller', x: 16, y: 6, f: 'up' }, { sheet: 'npc-gambler-c', x: 9, y: 5, f: 'right' }],
      gather: { x: 14, y: 8, r: 2.6, n: 6, face: [14, 4] },
      say: [[3, 'at', 'RAY CALLS A TUNE NOBODY KNOWS'], [30, 0, 'TAKE IT, ODETTE'], [80, 'at', 'ONE MORE CHORUS!']],
      talk: [{ x: 14, y: 7, label: 'THE JAM', prompt: 'PRESS E TO LISTEN', on: function (L) {
        if (once(L, 'listen', function () { if (typeof BridgeInventory !== 'undefined' && BridgeInventory.restoreEnergy) BridgeInventory.restoreEnergy(25); }))
          note('A jam at Moonglow', 'Odette scatted over Ray\'s chords until the moon went behind the smog.');
        say('THE JAM', 'YOU STAND AT THE BACK WITH YOUR EYES SHUT. THE PIANO ASKS, THE SAX ANSWERS, THE BASS AGREES WITH BOTH OF THEM. NOBODY IS LOOKING AT THEIR WRIST.');
      } }],
      over: function (L, ctx, offX, offY, ts, ms) { notes(ctx, offX, offY, ts, ms, 14, 4, 1); notes(ctx, offX, offY, ts, ms, 11, 4, 2); },
      note: 'Sat in on a jam session at Moonglow'
    },
    liftoff: {
      world: 'arcadia-spaceport', name: 'A freighter lifts off', len: 1.5, w: 3, at: [36, 26],
      hint: 'Engines lighting past the railing — a freighter\'s lifting off', sfx: 'blast', loop: { name: 'thunder', every: 6, near: 40 },
      gather: { x: 36, y: 26.4, r: 4.5, n: 12, face: [36, 29] },
      say: [[4, 'at', 'THERE SHE GOES!'], [30, 'at', 'WHERE\'S SHE BOUND?'], [60, 'at', 'SAFE ROAD, SPACER.']],
      over: function (L, ctx, offX, offY, ts, ms) { liftoff(L, ctx, offX, offY, ts, ms); },
      react: 'look', note: function (L) { return 'Watched the ' + pick(SHIPS_OUT, L.key) + ' lift off from the spaceport'; }
    },
    skylanterns: {
      world: 'arcadia-oldquarter', name: 'Sky lanterns from the roof shrine', len: 4, w: 3, at: [5, 12],
      hint: 'Paper lanterns rising off the shrine roof', sfx: 'chime', loop: { name: 'chime', every: 9, near: 26 },
      gather: { x: 6, y: 11.5, r: 3.2, n: 10, face: [3, 6] },
      say: [[5, 'at', 'MAKE A WISH!'], [50, 'at', 'THAT ONE\'S MINE, THE BIG ONE'], [120, 'at', 'LOOK HOW HIGH…']],
      talk: [{ x: 8, y: 10, label: 'A SKY LANTERN', prompt: 'PRESS E TO LET ONE GO', on: function (L) {
        if (once(L, 'wish', function () { if (typeof BridgeInventory !== 'undefined') BridgeInventory.restoreEnergy(20); }))
          say('A SKY LANTERN', 'A CHILD HANDS YOU A LANTERN, ALREADY LIT. YOU HOLD IT TILL IT TUGS, AND LET GO. IT CLIMBS PAST THE ROOFS, PAST THE LOOP, UP TOWARD THE TOWERS, AND YOU LOSE IT AMONG THEIR WINDOWS.');
        else say('A SKY LANTERN', 'YOURS IS UP THERE SOMEWHERE, AMONG THE TOWERS\' LIGHTS.');
      } }],
      over: function (L, ctx, offX, offY, ts, ms) { skyLanterns(L, ctx, offX, offY, ts, ms); },
      note: 'Let a sky lantern go from Lantern Row'
    },

    // ---- Verdance ----
    hen: {
      world: 'verdance-village', name: 'A hen loose in Brambleford', len: 3, w: 3, at: [20, 15], when: both(day(0.3), dry),
      gather: { x: 20, y: 15, r: 3.4, n: 5, face: [20, 15] },          // the village stops to watch
      hint: 'A hen\'s got loose — the whole street\'s after her!', sfx: 'cluck', loop: { name: 'cluck', every: 2.4, near: 12 },
      begin: function (L) { L.henPath = henWay(W.data.collisions) || HEN_WAY; },
      cast: [{ sheet: 'npc-kid-a', path: null, chase: 2.2, speed: 1.5 }, { sheet: 'npc-vfolk-b', path: null, chase: 4.2, speed: 1.5 }],
      items: function (L, world, offX, offY, ts, ms, sc) { return henItems(L, world, offX, offY, ts, ms, sc); },
      talk: [{ at: function (L) { var h = L.hen; return h && !L.caught ? [Math.round(h.x), Math.round(h.y)] : null; }, label: 'THE HEN', prompt: 'PRESS E TO CATCH HER',
               on: function (L) { catchHen(L); } }],
      say: [[2, 0, 'COME BACK, HENRIETTA!'], [20, 1, 'SOMEONE GRAB HER!'], [60, 0, 'SHE WENT THAT WAY!']],
      note: 'Chased a hen round Brambleford'
    },
    mailcoach: {
      world: 'verdance-village', name: 'The mail coach', len: 4, w: 3, at: [20, 21], when: day(0.2),
      hint: 'A post horn — the mail coach is coming in', sfx: 'horn',
      items: function (L, world, offX, offY, ts, ms, sc) { return coachItems(L, world, offX, offY, ts, ms, sc); },
      talk: [{ at: function (L) { return L.coach && L.coach.stopped ? [Math.round(L.coach.x) - 1, Math.round(L.coach.y) + 1] : null; },
               label: 'THE MAIL COACH', prompt: 'PRESS E TO ASK FOR POST', on: function (L) { post(L); } }],
      tick: function (L) { if (L.coach && L.coach.leaving && !L.hornOut) { L.hornOut = 1; if (L.here) sfx('horn'); } },
      note: 'The mail coach came through Brambleford'
    },
    balloon: {
      world: 'verdance-village', name: 'A balloon drifting over', len: 3, w: 2, at: null,
      gather: { x: 23, y: 20, r: 4, n: 6, face: [23, 12] },            // out on the green, looking up
      when: function (ms, E) { var w = wxAt(E.worlds[0], ms); return skyAt(E.worlds[0], ms).sun > 0.45 && !w.wet && !w.bad; },
      hint: 'Look up — a hot-air balloon!', react: 'look',
      ground: function (L, ctx, offX, offY, ts, ms) { balloon(L, ctx, offX, offY, ts, ms, true); },
      over: function (L, ctx, offX, offY, ts, ms) { balloon(L, ctx, offX, offY, ts, ms, false); },
      note: 'A hot-air balloon drifted over Brambleford'
    },
    kites: {
      world: 'verdance-village', name: 'Kites over the green', len: 5, w: 2, at: [30, 22],
      gather: { x: 30, y: 23.5, r: 3.4, n: 6, face: [30, 18] },        // faces up at the kites
      when: function (ms, E) { var w = wxAt(E.worlds[0], ms); return skyAt(E.worlds[0], ms).sun > 0.35 && (w.kind === 'cloudy' || (w.kind === 'fair' && H('breeze' + Math.floor(ms / 10800000)) < 0.5)); },
      hint: 'A good wind — kites up over the green',
      cast: [{ sheet: 'npc-kid-a', x: 29, y: 22, f: 'up' }, { sheet: 'npc-kid-b', x: 33, y: 23, f: 'up' }, { sheet: 'npc-vfolk-a', x: 26, y: 24, f: 'up' }],
      over: function (L, ctx, offX, offY, ts, ms) { kites(L, ctx, offX, offY, ts, ms); },
      note: 'Kites flew over Brambleford\'s green'
    },
    rainbow: {
      world: 'verdance-village', name: 'A rainbow after the rain', len: 5, w: 6, at: null,
      when: function (ms, E) { var w = E.worlds[0]; return skyAt(w, ms).sun > 0.5 && !wxAt(w, ms).wet && wxAt(w, ms - 50 * MIN).wet; },
      hint: 'A rainbow, after the rain', react: 'look',
      over: function (L, ctx, offX, offY, ts, ms, w, h) { rainbow(L, ctx); },
      note: 'A rainbow over Brambleford after the rain'
    },

    // ---- Hoarfell ----
    blasting: {
      stream: 'hoarfell-slopes', worlds: ['hoarfell', 'hoarfell-piste', 'hoarfell-park', 'hoarfell-summit'], name: 'Avalanche blasting', len: 1.5, w: 1, at: null,
      when: function (ms, E) { var k = skyAt('hoarfell', ms); return k.sun > 0.3 && k.x < 0.5 && wxAt('hoarfell', ms).kind !== 'blizzard'; },
      hint: 'A boom off the far slopes — avalanche blasting', react: 'look',
      tick: function (L) { blastTick(L); },
      over: function (L, ctx, offX, offY, ts, ms) { blastPuffs(L, ctx, offX, offY, ts, ms); },
      note: 'Heard the avalanche blasting on Hoarfell'
    },
    patrol: {
      world: 'hoarfell', name: 'The ski patrol brings someone down', len: 2.5, w: 2, at: [30, 15],
      hint: 'A whistle — the ski patrol\'s bringing someone down', sfx: 'whistle',
      cast: [{ sheet: 'npc-skier-b', path: [[41, 15], [24, 15], [20, 14.6]], speed: 0.9, from: 2, end: 'left', sled: true }],
      talk: [{ at: function (L) { var p = L.pos[0]; return p ? [Math.round(p.x) + 1, Math.round(p.y) + 1] : null; }, label: 'THE SKI PATROL', prompt: 'PRESS E TO ASK',
               on: function (L) { say('THE SKI PATROL', pick(PATROL_SAYS, L.key)); } }],
      note: 'The ski patrol brought someone down to the lodge'
    },
    sleigh: {
      world: 'hoarfell', name: 'A sleigh through Fellhaven', len: 2, w: 2, at: [22, 17], when: function (ms, E) { return skyAt(E.worlds[0], ms).sun < 0.6; },
      hint: 'Sleigh bells', loop: { name: 'jingle', every: 1.3, near: 18 },
      items: function (L, world, offX, offY, ts, ms, sc) { return vehicle(L, 'sleigh', [[47, 17], [-4, 17]], 2.4, 6, world, offX, offY, ts, ms, sc); },
      note: 'A sleigh jingled through Fellhaven'
    },
    snowball: {
      world: 'hoarfell', name: 'A snowball fight', len: 4, w: 3, at: [18, 25], when: function (ms, E) { return skyAt(E.worlds[0], ms).sun > 0.3 && wxAt(E.worlds[0], ms).kind !== 'blizzard'; },
      hint: 'A snowball fight on the green!', loop: { name: 'swish', every: 1.2, near: 14 },
      cast: [{ sheet: 'npc-kid-a', x: 14, y: 24, f: 'right' }, { sheet: 'npc-kid-b', x: 15, y: 26, f: 'right' }, { sheet: 'npc-skier-a', x: 22, y: 24, f: 'left' }, { sheet: 'npc-kid-a', x: 21, y: 26, f: 'left', seed: 5 }],
      say: [[3, 0, 'GOT YOU!'], [20, 2, 'NO FAIR, FOUR ON TWO!'], [45, 3, 'INCOMING!']],
      talk: [{ x: 18, y: 25, label: 'SNOWBALL FIGHT', prompt: 'PRESS E TO JOIN IN', on: function (L) { snowJoin(L); } }],
      items: function (L, world, offX, offY, ts, ms, sc) { return snowballs(L, world, offX, offY, ts, ms, sc); },
      tick: function (L) { snowTick(L); },
      note: 'A snowball fight in Fellhaven'
    },
    aurora: {
      world: 'hoarfell', name: 'Everyone out for the aurora', len: 6, w: 6, at: [21, 22],
      when: function (ms, E) { return skyAt(E.worlds[0], ms).sun < 0.2 && wxAt(E.worlds[0], ms).kind === 'clear'; },
      hint: 'Everyone\'s out in the street — the aurora!',
      cast: [{ sheet: 'npc-skier-a', x: 18, y: 21, f: 'up' }, { sheet: 'npc-skier-b', x: 23, y: 23, f: 'up' }, { sheet: 'npc-kid-b', x: 20, y: 24, f: 'up' }, { sheet: 'npc-kid-a', x: 24, y: 22, f: 'up', seed: 2 }],
      gather: { x: 21, y: 22.5, r: 4, n: 10, face: [21, -6] },
      say: [[3, 'at', 'LOOK — IT\'S GREEN TONIGHT!'], [30, 2, 'THERE, OVER THE HOARSPIRE!'], [80, 1, 'IT\'S MOVING!']],
      talk: [{ x: 20, y: 20, label: 'TOVE\'S URN', prompt: 'PRESS E TO TAKE A CUP', on: function (L) {
        if (once(L, 'cocoa', function () { give('hot_cocoa', 1); })) say('TOVE\'S URN', 'TOVE\'S POURING FOR EVERYONE OUT HERE. "ON THE HOUSE, ON A NIGHT LIKE THIS."');
        else say('TOVE\'S URN', '"ONE EACH, OR THE KIDS WON\'T SLEEP."');
      } }],
      note: 'All Fellhaven out in the street for the aurora'
    },

    // ---- Sylvara ----
    lanterns: {
      world: 'sylvara', name: 'The lantern procession', len: 5, w: 4, at: [16, 18],
      when: function (ms, E) { var k = skyAt(E.worlds[0], ms); return k.dusk > 0.35 && !wxAt(E.worlds[0], ms).wet; },
      hint: 'The lantern procession — down from the Great Tree', loop: { name: 'harp', every: 6, near: 16 },
      cast: [0, 1, 2, 3, 4].map(function (i) {
        return { sheet: ['npc-elf-folk-c', 'npc-elf-folk-a', 'npc-elf-folk-b', 'npc-elf-folk-d', 'npc-elf-folk-a'][i], path: LANTERN_PATH.concat([RING[i]]), speed: 0.55,
                 from: 2 + i * 3.6, end: 'down', lantern: true, seed: i };
      }),
      talk: [{ x: 13, y: 20, label: 'THE PROCESSION', prompt: 'PRESS E TO WALK WITH THEM', on: function (L) {
        if (once(L, 'lantern', function () { give('leaf_lantern', 1); }))
          say('THE PROCESSION', 'AN ELF YOU DON\'T KNOW PRESSES A LEAF LANTERN INTO YOUR HANDS AND WALKS ON BESIDE YOU. NOBODY SPEAKS. IT\'S LOVELY.');
        else say('THE PROCESSION', 'THE LANTERNS GO ROUND THE MOONWELL, ONE BY ONE, AND HANG THERE.');
      } }],
      note: 'Walked with Elderglade\'s lantern procession'
    },
    stag: {
      world: 'sylvara', name: 'The spirit stag', len: 3, w: 2, at: [22, 15],
      when: function (ms, E) { return skyAt(E.worlds[0], ms).sun < 0.55 || wxAt(E.worlds[0], ms).kind === 'mist'; },
      hint: 'Hush — the spirit stag is crossing the glade', sfx: 'chime', react: 'look',
      items: function (L, world, offX, offY, ts, ms, sc) { return stagItems(L, world, offX, offY, ts, ms, sc); },
      talk: [{ at: function (L) { return L.stag && !L.stag.gone ? [Math.round(L.stag.x), Math.round(L.stag.y)] : null; }, label: 'THE SPIRIT STAG', prompt: 'PRESS E TO APPROACH',
               on: function (L) { stagBless(L); } }],
      note: 'The spirit stag crossed Elderglade'
    },
    bard: {
      world: 'sylvara', name: 'Thaelin plays', len: 5, w: 3, at: [17, 11], when: dry,
      hint: 'Thaelin\'s playing — they\'re sitting down to listen', loop: { name: 'harp', every: 5.5, near: 14 },
      cast: [{ sheet: 'npc-elf-folk-a', x: 15, y: 13, f: 'up' }, { sheet: 'npc-elf-folk-b', x: 19, y: 13, f: 'up' }, { sheet: 'npc-elf-folk-c', x: 16, y: 14, f: 'up' },
             { sheet: 'npc-elf-folk-d', x: 18, y: 14, f: 'up' }],
      gather: { x: 17, y: 14.5, r: 2.6, n: 5, face: [17, 11] },
      talk: [{ x: 17, y: 13, label: 'THAELIN\'S SONG', prompt: 'PRESS E TO LISTEN', on: function (L) {
        var verse = pick(VERSES, L.key);
        if (once(L, 'song', function () { if (typeof BridgeInventory !== 'undefined') BridgeInventory.restoreEnergy(25); }))
          note('Thaelin\'s song', verse);
        say('THAELIN\'S SONG', 'YOU SIT IN THE MOSS AND LISTEN.\n\n"' + verse + '"');
      } }],
      over: function (L, ctx, offX, offY, ts, ms) { notes(ctx, offX, offY, ts, ms, 17, 10.6, 2); },
      note: 'Sat and listened to Thaelin play'
    },

    // ---- Enigma (empty but for you, until it's woken) ----
    flicker: {
      world: 'enigma-ring', name: 'The lights go down the ring', len: 1, w: 2, at: null, hint: 'The lights are going down the ring — one after another',
      sfx: 'buzz', loop: { name: 'buzz', every: 3.5, near: 999 },
      over: function (L, ctx, offX, offY, ts, ms, w, h) { flicker(L, ctx, offX, offY, ts, ms, w, h); },
      note: 'The lights went down Enigma\'s ring, one after another'
    },
    door: {
      world: 'enigma-ring', name: 'A door opens by itself', len: 1, w: 2, at: [29, 11], hint: 'A pressure door hisses open — by itself', sfx: 'hiss',
      take: [{ label: 'PRESSURE DOOR', near: [29, 11], prompt: 'PRESS E TO LOOK', on: function () {
        say('PRESSURE DOOR', 'IT\'S OPEN A HAND\'S WIDTH. BEYOND: DARK, AND A BREATH OF COLD THAT SMELLS OF NOTHING. AS YOU WATCH, IT SLIDES SHUT AND THE SEAL LIGHT GOES RED AGAIN.');
      } }],
      items: function (L, world, offX, offY, ts, ms, sc) { return doorMist(L, offX, offY, ts, ms); },
      note: 'A sealed door on Enigma opened by itself, and shut again'
    },
    comms: {
      world: 'enigma', name: 'A voice on the comms', len: 1.5, w: 2, at: [9, 8], hint: 'Static — and a voice on the comms', sfx: 'crackle', loop: { name: 'crackle', every: 3.2, near: 999 },
      take: [{ label: 'ANTENNA ARRAY', prompt: 'PRESS E TO LISTEN', on: function (L) {
        var v = pick(VOICES, L.key);
        if (once(L, 'voice', function () {})) note('A voice on Enigma\'s comms', v);
        say('ANTENNA ARRAY', 'THE ARRAY IS TURNED TO SOMETHING. THROUGH THE STATIC, A VOICE:\n\n"' + v + '"');
      } }],
      say: [[2, 'at', '…IS ANYONE…'], [20, 'at', '…FORTY-SEVEN POINT THREE…'], [45, 'at', '…DON\'T ANSWER…']],
      over: function (L, ctx, offX, offY, ts, ms) { var p = 0.5 + 0.5 * Math.sin(ms / 220); glow(ctx, Math.round(offX + 9.5 * ts), Math.round(offY + 8.2 * ts), ts * (1.2 + p), '64,200,216', 0.22 + 0.2 * p); },
      note: 'Heard a voice on Enigma\'s comms'
    }
  };
  var CHANCE = { 'arcadia-sky': 0.35, 'hoarfell-slopes': 0.4, 'enigma-ring': 0.5, enigma: 0.4, 'lumar-tern': 0.55 };
  Object.keys(EV).forEach(function (id) {
    var E = EV[id];
    E.id = id;
    E.worlds = E.worlds || [E.world];
    E.stream = E.stream || E.world || E.worlds[0];
    E.len = E.len * MIN;
  });
  var STREAMS = {};
  Object.keys(EV).forEach(function (id) { var E = EV[id]; (STREAMS[E.stream] = STREAMS[E.stream] || []).push(E); });

  // the words people say
  var NULL_SAYS = ['WE SEE THE WIRES. DO YOU?', 'THE CITY IS A LOCK. WE ARE THE PICK.', 'HALCYON LIES. ASK WHAT THEY BOUGHT.', 'LOOK UP. NOW LOOK DOWN. KEEP LOOKING.', '47.3', 'NOBODY OWNS THE NIGHT.'];
  var PATROL_SAYS = ['"TWISTED KNEE ON THE COULOIR. SHE\'LL LIVE. MIND THE ICE AT THE DOG-LEG, WILL YOU?"', '"WENT OFF THE BIG KICKER IN THE PARK BACKWARDS. HE\'S FINE. HIS PRIDE ISN\'T."', '"CAUGHT OUT ON THE LAST RIDGE WHEN THE WHITE CAME IN. COLD, NOT HURT. LODGE FIRE\'LL SORT HIM."', '"CLIPPED A PYLON ON PINEWOOD. SPECTACULAR, APPARENTLY."'];
  var VERSES = ['THE WILLOW KNOWS AND WILL NOT TELL / THE MOONWELL KEEPS WHAT FELL', 'THREE HUNDRED YEARS OF SAYING NAUGHT / AND STILL HE HOLDS THE THOUGHT', 'WHERE THE LANTERNS HANG THE LONGEST / THE OLD WOOD SLEEPS THE STRONGEST', 'A LEAF FOR EVERY ONE WHO LEFT / A LIGHT FOR EVERY ONE WHO\'S KEPT', 'THE STARS COME DOWN IN THE DIMMING TIDE / AND WALK THE GLADE AT A SPIRIT\'S SIDE'];
  var VOICES = ['…IS ANYONE ON THIS BAND… WE HEAR THE STATION… FORTY-SEVEN POINT THREE… WE HEAR YOU HEARING US…',
                '…WREN TO ENIGMA… WREN TO ENIGMA… THE EDGE IS CLOSER THAN THE CHARTS… DON\'T WAIT FOR US…',
                '…DON\'T ANSWER IT. WHATEVER YOU DO. IT LEARNS THE SHAPE OF WHOEVER ANSWERS…',
                '…COUNTING… FORTY-ONE… FORTY-TWO… IT COUNTS BACK. IT ALWAYS COUNTS BACK…',
                '…THIS IS THE LISTENING POST. IF YOU CAN HEAR THIS, THE LISTENING IS DONE…'];
  var STARS = ['VEDA NOX', 'KAI SOLARIS', 'MIRA VANTA', 'ORIN SEVEN', 'LUX MARLOWE'];
  function starName(L) { return pick(STARS, L.key).split(' ').map(function (w) { return w.charAt(0) + w.slice(1).toLowerCase(); }).join(' '); }
  var LETTERS = ['A POSTCARD FROM CROWNHAVEN: THE QUAY, HAND-TINTED. "WISH YOU WERE HERE. THE FISH ARE ENORMOUS. — B."',
                 'A LETTER FOR "WHOEVER\'S FARMING EDDA\'S FIELD": "KEEP THE NORTH ROWS FOR PUMPKINS. THEY LIKE THE WALL. — E."',
                 'A FLYER FOR THE NEON ROYALE, CREASED FROM A LONG TRIP: "THE HOUSE ALWAYS WINS. COME AND SEE IT DO IT."',
                 'A NOTE IN YSOLDE\'S SQUARE HAND: "THE ICEFALL IS IN. COME AND CLIMB IT BEFORE THE THAW."',
                 'A SEED CATALOGUE FROM PENNYWORTH\'S, DOG-EARED AT THE STARFRUIT.'];
  var POST_GIFTS = ['honey_cake', 'seed_sunflower', 'posy', 'seed_strawberry'];
  var TRADER_GOODS = [['tide_charm', 110], ['heron_feather', 150], ['frost_ring', 150], ['glimmer_lantern', 100], ['lucky_horseshoe', 40],
                      ['star_pearl', 105], ['moonglass', 90], ['moonstone', 48], ['pocket_watch', 80], ['sailcloth', 34], ['gold_chip', 75], ['plan_telescope', 220]];
  var LOTS = ['bluefin', 'glowtail', 'ember_snapper', 'spore_tuna', 'sapphire_ray', 'moon_eel', 'coral_dragonet', 'starfin', 'jade_marlin'];
  var PARCELS = ['stim_pack', 'medkit', 'void_fizz', 'neon_udon', 'gold_chip', 'lucky_dice', 'royale_globe'];

  // ---- the schedule -----------------------------------------------------------------------------------------------------
  function usable(E, ms) {
    try { return !E.when || E.when(ms, E); } catch (e) { return false; }
  }
  /** What happens in a stream's slot: { E, start, end, key } or null. */
  function plan(stream, slot) {
    var list = STREAMS[stream], chance = CHANCE[stream] != null ? CHANCE[stream] : 0.7;
    for (var d = 0; list && d < list.length; d++) {                // something due in this slot (the catch auction as the boats come in)
      var due = list[d].due && list[d].due(slot);
      if (due != null) return { E: list[d], start: due, end: due + list[d].len, key: list[d].id + '@' + slot };
    }
    if (!list || H(stream + '|' + slot) >= chance) return null;
    var mid = slot * SLOT + SLOT / 2;
    var cands = list.filter(function (E) { return usable(E, mid); });
    if (!cands.length) return null;
    var tot = cands.reduce(function (a, E) { return a + (E.w || 1); }, 0), x = H(stream + '|pick|' + slot) * tot, E = cands[0];
    for (var i = 0; i < cands.length; i++) { x -= cands[i].w || 1; if (x <= 0) { E = cands[i]; break; } }
    var start = slot * SLOT + Math.floor(H(stream + '|at|' + slot) * (SLOT - E.len - MIN));
    return { E: E, start: start, end: start + E.len, key: E.id + '@' + slot };
  }
  var forced = null;                                             // the tests: { E, start, end, key }
  function liveIn(world, t) {
    var out = [];
    if (forced && forced.end > t && forced.E.worlds.indexOf(world) >= 0) out.push(forced);
    Object.keys(STREAMS).forEach(function (s) {
      if (!STREAMS[s].some(function (E) { return E.worlds.indexOf(world) >= 0; })) return;
      var p = plan(s, Math.floor(t / SLOT));
      if (p && t >= p.start && t < p.end && p.E.worlds.indexOf(world) >= 0 && !(forced && forced.key === p.key) && !festival(world)) out.push(p);
    });
    return out;
  }

  // ---- the place you're in: who's here, what's on ------------------------------------------------------------------------
  var W = null;                                                  // { id, data }
  var running = {};                                              // key -> L, live in the place you're in
  function decorate(worldId, data) {
    Object.keys(running).forEach(function (k) { stop(running[k]); });
    running = {};
    if (data && data.interactions) {                             // anything left on a cached copy from last time
      data.interactions = data.interactions.filter(function (i) { return !i.evOwn; });
      data.interactions.forEach(function (i) { if (i.evWas) { i.type = i.evWas.type; i.prompt = i.evWas.prompt; delete i.evWas; delete i.ev; } });
    }
    W = { id: worldId, data: data, at: now() };
  }
  function start(p) {
    var E = p.E, L = { E: E, key: p.key, start: p.start, end: p.end, t: now() - p.start, world: W.id, inters: [], solids: [], pos: [], here: true, said: {} };
    var D = W.data;
    (E.props || []).forEach(function (pr) {
      (pr.solid || []).forEach(function (c) { solidOn(L, c[0], c[1]); });
    });
    (E.talk || []).forEach(function (tk, i) {
      var it = { x: tk.x || 0, y: tk.y || 0, type: 'event', label: tk.label, prompt: tk.prompt, ev: L.key, evTalk: i, evOwn: true };
      L.inters.push(it);
      if (tk.x != null) D.interactions.push(it);
    });
    (E.take || []).forEach(function (tk, i) {
      var it = D.interactions.filter(function (x) { return x.label === tk.label && (!tk.near || (x.x === tk.near[0] && x.y === tk.near[1])); })[0];
      if (!it || it.evWas) return;
      it.evWas = { type: it.type, prompt: it.prompt };
      it.type = 'event'; it.prompt = tk.prompt; it.ev = L.key; it.evTake = i;
      L.taken = (L.taken || []).concat([it]);
    });
    if (E.begin) E.begin(L);
    if (E.gather && typeof BridgeCrowd !== 'undefined' && BridgeCrowd.gather) {
      try { L.crowd = BridgeCrowd.gather(W.id, { x: E.gather.x, y: E.gather.y, r: E.gather.r, n: E.gather.n, until: L.end, face: E.gather.face, id: L.key, start: L.start }); } catch (e) { L.crowd = null; }
    }
    if (E.react && typeof BridgeCrowd !== 'undefined' && BridgeCrowd.react) {
      try { BridgeCrowd.react(W.id, { x: (E.at || [0, 0])[0], y: (E.at || [0, 0])[1], r: 99, kind: E.react, ms: 4000 }); } catch (e) { /* no crowd */ }
    }
    running[L.key] = L;
    var fresh = L.t < 8000;                                      // it's only just begun (else you've walked in on it)
    if (E.sfx && fresh && (!E.at || near(E.at[0], E.at[1], E.hear || 22))) sfx(E.sfx);
    if (E.hint) bubbleAt(L, E.at, E.hint, fresh ? 5200 : 4200, true);
    if (!got(L, 'seen')) { mark(L, 'seen'); note(typeof E.note === 'function' ? E.note(L) : E.note || E.name, placeName(W.id)); }
    return L;
  }
  function stop(L) {
    var D = W && W.data;
    if (D) {
      D.interactions = D.interactions.filter(function (i) { return L.inters.indexOf(i) < 0; });
      (L.taken || []).forEach(function (it) { if (it.evWas) { it.type = it.evWas.type; it.prompt = it.evWas.prompt; delete it.evWas; delete it.ev; } });
      L.solids.forEach(function (s) { if (D.collisions[s[1]]) D.collisions[s[1]][s[0]] = s[2]; });
    }
    if (L.crowd && L.crowd.release) { try { L.crowd.release(); } catch (e) { /* gone */ } }
    if (L.E.end) L.E.end(L);
    L.solids = [];
  }
  function solidOn(L, x, y) {
    var C = W.data.collisions, p = me();
    if (!C || !C[y] || C[y][x] === 1) return;
    if (p && Math.round(p.x) === x && Math.round(p.y) === y) return;    // never on top of you
    L.solids.push([x, y, C[y][x]]);
    C[y][x] = 1;
  }
  function placeName(w) {
    var d = W && W.data;
    return (d && d.name) || String(w).replace(/^(lumar|arcadia|verdance|hoarfell|enigma)-?/, '').replace(/-/g, ' ');
  }

  // every frame (the '*' ground hook): what's live here, where everyone in it is
  var lastCheck = 0, lastSet = '';
  function tick(world) {
    if (!W || W.data !== world) return;
    var t = now();
    if (t - lastCheck > 500) {
      lastCheck = t;
      var live = liveIn(W.id, t), keys = live.map(function (p) { return p.key; });
      Object.keys(running).forEach(function (k) { if (keys.indexOf(k) < 0) { stop(running[k]); delete running[k]; } });
      live.forEach(function (p) { if (!running[p.key]) start(p); });
      var set = keys.join(',');
      if (set !== lastSet) { lastSet = set; if (typeof BridgeMenu !== 'undefined' && BridgeMenu.refresh) BridgeMenu.refresh(); }
    }
    Object.keys(running).forEach(function (k) { step(running[k], t); });
  }
  function step(L, t) {
    var E = L.E;
    L.t = t - L.start;
    L.here = true;
    // people: where each is
    (E.cast || []).forEach(function (c, i) { L.pos[i] = castAt(L, c, i); });
    // moving talk points
    (E.talk || []).forEach(function (tk, i) {
      if (!tk.at) return;
      var it = L.inters[i], at = tk.at(L), D = W.data, on = D.interactions.indexOf(it) >= 0;
      if (at) { it.x = at[0]; it.y = at[1]; if (!on) D.interactions.push(it); }
      else if (on) D.interactions.splice(D.interactions.indexOf(it), 1);
    });
    if (E.tick) E.tick(L);
    // a sound every so often while you're near
    if (E.loop) {
      var lp = E.loop, a = E.at, ok = !a || near(a[0], a[1], lp.near);
      if (ok && (!L.loopAt || t - L.loopAt > lp.every * 1000)) { L.loopAt = t; if (L.t > 1500) sfx(lp.name); }
    }
    // lines said
    (E.say || []).forEach(function (s, i) {
      if (L.said[i] || L.t < s[0] * 1000) return;
      L.said[i] = 1;
      if (L.t > s[0] * 1000 + 6000) return;                     // long gone by the time you got here
      var p = s[1] === 'at' ? (E.at && { x: E.at[0], y: E.at[1] }) : L.pos[s[1]];
      if (p && !p.hide) bubbleAt(L, [p.x, p.y], s[2], 3000, false);
    });
  }
  // where a cast member is at L.t: { x, y, f, walk, hide }
  function castAt(L, c, i) {
    var s = L.t / 1000;
    if (c.chase != null) return chaseAt(L, c, s);
    if (c.from != null && s < c.from) return { hide: true, x: -9, y: -9 };
    if (c.until != null && s > c.until) return { hide: true, x: -9, y: -9 };
    if (!c.path) {
      var o = { x: c.x, y: c.y, f: c.f, seed: c.seed || i };
      if (c.shove && !(L.mine && L.mine.calm)) {                    // two shoving: in and back, out of step
        var k = Math.sin(s * 5.2 + (c.shove > 0 ? 0 : 1.9));
        o.x += c.shove * Math.max(0, k) * 0.18;
      }
      return o;
    }
    var walked = Math.max(0, s - (c.from || 0)) * c.speed, P = c.path, d = walked, j = 0;
    while (j < P.length - 1) {
      var seg = dist(P[j], P[j + 1]);
      if (d <= seg) {
        var f = seg ? d / seg : 0, dx = P[j + 1][0] - P[j][0], dy = P[j + 1][1] - P[j][1];
        return { x: P[j][0] + dx * f, y: P[j][1] + dy * f, walk: walked, f: Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'), seed: c.seed || i };
      }
      d -= seg; j++;
    }
    return { x: P[P.length - 1][0], y: P[P.length - 1][1], f: c.end || 'down', seed: c.seed || i, done: true };
  }

  // ---- drawing hooks ----------------------------------------------------------------------------------------------------
  function hookAll(name) {
    return function (a, b, c, d, e, f, g) {
      var out = [];
      Object.keys(running).forEach(function (k) {
        var L = running[k], E = L.E;
        try {
          if (name === 'items') {
            out = out.concat(castItems(L, a, b, c, d, e, f));
            (E.props || []).forEach(function (pr) { var art2 = ART[pr.art](); out.push(thing(art2, pr.x, pr.y, a, b, c, d, e, f, { foot: pr.foot })); });
            if (E.items) out = out.concat(E.items(L, a, b, c, d, e, f) || []);
          } else if (E[name]) E[name](L, a, b, c, d, e, f, g);
        } catch (err) { if (!L.err) { L.err = 1; console.warn('[events] ' + E.id + ' ' + name + ': ' + err.message); } }
      });
      return out;
    };
  }
  function castItems(L, world, offX, offY, ts, ms, sc) {
    var out = [];
    (L.E.cast || []).forEach(function (c, i) {
      var p = L.pos[i];
      if (!p || p.hide) return;
      var o = { sheet: c.sheet, x: p.x, y: p.y, f: p.f, walk: p.walk, seed: p.seed, after: c.after ? function (ctx, cx, footY) { c.after(ctx, cx, footY, ms, L, p); } : null };
      if (c.lantern) o.after = function (ctx, cx, footY) { lanternOn(ctx, cx, footY, ms, p); };
      if (c.sled) out.push(sledItem(L, p, world, offX, offY, ts, ms, sc));
      var it = person(o, world, offX, offY, ts, ms, sc);
      if (it) out.push(it);
    });
    return out;
  }
  var ground = hookAll('ground'), items = hookAll('items'), over = hookAll('over'), behind = hookAll('behind');
  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) {
    BridgeWorld.registerSceneHooks('*', {
      behind: function (ctx, world, offX, offY, ts, nowMs) { behind(ctx, offX, offY, ts, nowMs); },
      ground: function (ctx, world, offX, offY, ts, nowMs, sc) { tick(world); ground(ctx, offX, offY, ts, nowMs); },
      items: function (world, offX, offY, ts, nowMs, sc) { return items(world, offX, offY, ts, nowMs, sc); },
      over: function (ctx, world, offX, offY, ts, nowMs) { over(ctx, offX, offY, ts, nowMs, ctx.canvas.width, ctx.canvas.height); placeBubbles(); }
    });
  }

  // ---- bubbles: a word overheard, over whoever said it — or at the screen's edge, pointing, when it's off it ------------
  var layer = null, bubbles = [];
  function bubbleAt(L, at, text, ms, hint) {
    if (!layer) { layer = document.createElement('div'); layer.id = 'ev-layer'; document.body.appendChild(layer); }
    var el = document.createElement('div');
    el.className = 'ev-bubble' + (hint ? ' hint' : '');
    el.innerHTML = '<span class="ev-arrow"></span><span class="ev-text"></span>';
    el.querySelector('.ev-text').textContent = text;
    layer.appendChild(el);
    bubbles.push({ el: el, at: at, until: performance.now() + ms, key: L.key });
    if (bubbles.length > 6) { var b0 = bubbles.shift(); b0.el.remove(); }
  }
  function placeBubbles() {
    if (!layer) return;
    var sv = typeof BridgeWorld !== 'undefined' && BridgeWorld.getScreenView ? BridgeWorld.getScreenView() : null, t = performance.now();
    var inWorld = typeof BridgeState === 'undefined' || !BridgeState.getState || BridgeState.getState() === 'world';
    bubbles = bubbles.filter(function (b) {
      if (t > b.until || !running[b.key] || !inWorld) { b.el.remove(); return false; }
      return true;
    });
    if (!sv || !sv.ts) return;
    var Wd = window.innerWidth, Ht = window.innerHeight, placed = [];
    bubbles.forEach(function (b) {
      var x, y, edge = '';
      if (b.at) { x = sv.offX + (b.at[0] + 0.5) * sv.ts; y = sv.offY + (b.at[1] - 0.6) * sv.ts; }
      else { x = Wd / 2; y = 96; }
      var m = 70;
      if (x < m) { x = m; edge = 'l'; } else if (x > Wd - m) { x = Wd - m; edge = 'r'; }
      if (y < 84) { y = 84; edge += 'u'; } else if (y > Ht - 60) { y = Ht - 60; edge += 'd'; }
      var w = b.el.offsetWidth || 120, h = b.el.offsetHeight || 24;
      for (var i = 0; i < placed.length; i++) {                    // over another: go up above it
        var q = placed[i];
        if (Math.abs(q.x - x) < (q.w + w) / 2 + 4 && y > q.y - q.h - 4 && y - h < q.y + 4) { y = q.y - q.h - 6; i = -1; }
      }
      placed.push({ x: x, y: y, w: w, h: h });
      b.el.setAttribute('data-edge', edge);
      b.el.style.transform = 'translate3d(' + Math.round(x) + 'px,' + Math.round(y) + 'px,0) translate(-50%,-100%)';
    });
  }

  // ---- interactions -----------------------------------------------------------------------------------------------------
  function use(inter) {
    var L = running[inter.ev];
    if (!L) {
      if (inter.evWas) { inter.type = inter.evWas.type; inter.prompt = inter.evWas.prompt; delete inter.evWas; BridgeInteractions.execute(inter); }
      return;
    }
    var list = inter.evTake != null ? L.E.take : L.E.talk, tk = list && list[inter.evTake != null ? inter.evTake : inter.evTalk];
    if (tk && tk.on) tk.on(L, inter);
  }
  if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.register) BridgeInteractions.register('event', use, 'Look');

  // ---- the Lumar happenings ------------------------------------------------------------------------------------------
  function traderSale(L) {
    var goods = [];
    for (var i = 0; goods.length < 3 && i < 20; i++) {
      var g = pick(TRADER_GOODS, L.key + ':g' + i);
      if (goods.indexOf(g) < 0 && typeof BridgeItems !== 'undefined' && BridgeItems.get(g[0])) goods.push(g);
    }
    choose({ title: 'The ship\'s trader', text: 'SALT-STAINED CRATES, A CHEST WITH THREE LOCKS, AND A TRADER WHO WON\'T SAY WHERE ANY OF IT CAME FROM. ONE OF EACH TO A CUSTOMER.',
      rows: goods.map(function (g) {
        var had = got(L, 'buy:' + g[0]);
        return { label: itemName(g[0]), icon: g[0], sub: had ? 'yours' : '', note: had ? '' : g[1] + ' coins', disabled: had, pick: function () {
          pay(g[1], 'trader').then(function (r) {
            if (!r || !r.ok) { say('THE SHIP\'S TRADER', '"COINS FIRST, FRIEND. THAT\'S HOW THE SEA WORKS."'); return; }
            mark(L, 'buy:' + g[0]); give(g[0], 1); sfx('coin');
            traderSale(L);
          });
        } };
      }), closeLabel: 'Leave' });
  }
  function tipFiddler(L) {
    if (got(L, 'tip')) { say('THE FIDDLER', 'HE WINKS AND PLAYS ON, FASTER.'); return; }
    pay(5, 'fiddler').then(function (r) {
      if (!r || !r.ok) { say('THE FIDDLER', 'HE NODS ANYWAY. THE MUSIC\'S FREE; THE HAT\'S OPTIONAL.'); return; }
      mark(L, 'tip');
      if (typeof BridgeInventory !== 'undefined') BridgeInventory.restoreEnergy(20);
      say('THE FIDDLER', 'FIVE COINS IN THE HAT. HE TIPS IT TO YOU AND STRIKES UP A REEL THAT PUTS A SPRING IN YOUR STEP. (+20 ENERGY)');
    });
  }
  function fiddleOn(ctx, cx, footY, ms) {                           // the fiddle on his shoulder under his chin, the bow sawing across it
    var f = ART.fiddle(), bow = Math.round(Math.sin(ms / 110) * 2) * 2;
    ctx.drawImage(f, cx - 2, footY - 28);
    ctx.fillStyle = '#e8dcc0';
    for (var i = 0; i < 5; i++) ctx.fillRect(cx - 8 + bow + i * 2, footY - 18 - i * 2, 2, 2);
  }
  // the Spires: shells bursting in pastel over the yacht at the sky docks, a few at a time, falling as sparks
  function spireFireworks(L, ctx, offX, offY, ts, ms) {
    var cols = ['#f4a8d0', '#9ad8f0', '#c8b0f8', '#a8f0d0', '#ffd890'];
    var bx = offX + 80 * ts, by = offY + 30 * ts;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var s = 0; s < 4; s++) {
      var k = Math.floor(L.t / 2400) - s, life = (L.t - k * 2400) / 2400;
      if (k < 0 || life > 1.6) continue;
      var h = Math.sin(k * 12.9898) * 43758.5453, r1 = h - Math.floor(h);
      var cx = Math.round(bx + (r1 - 0.5) * ts * 14), cy = Math.round(by - ts * (4 + r1 * 5)), col = cols[k % cols.length];
      if (life < 0.35) {                                       // the shell climbing
        ctx.fillStyle = '#fff4d0';
        ctx.fillRect(cx, Math.round(cy + (0.35 - life) * ts * 18), 1, 2);
        continue;
      }
      var p = (life - 0.35) / 1.25, R = Math.sqrt(p) * ts * 2.4;
      ctx.globalAlpha = Math.max(0, 1 - p);
      ctx.fillStyle = col;
      for (var i = 0; i < 24; i++) {
        var a = i / 24 * Math.PI * 2;
        ctx.fillRect(Math.round(cx + Math.cos(a) * R), Math.round(cy + Math.sin(a) * R + p * p * ts * 1.5), p < 0.4 ? 2 : 1, p < 0.4 ? 2 : 1);
      }
    }
    ctx.restore();
  }
  function notes(ctx, offX, offY, ts, ms, x, y, kind) {
    var n = ART.note();
    for (var i = 0; i < 3; i++) {
      var p = ((ms / 2400) + i / 3) % 1, dx = Math.round(Math.sin(p * 6 + i * 2) * 6) + (i - 1) * 6;
      ctx.globalAlpha = Math.min(1, (1 - p) * 2) * 0.9;
      ctx.drawImage(n, Math.round(offX + (x + 0.5) * ts + dx), Math.round(offY + (y - 0.6) * ts - p * ts * 1.6));
    }
    ctx.globalAlpha = 1;
  }
  function petals(L, ctx, offX, offY, ts, ms, r) {
    var cols = ['#f4c8d8', '#ffffff', '#f0a8c0', '#fff0f4'];
    for (var i = 0; i < 90; i++) {
      var sp = 2600 + H(L.key + 'p' + i) * 3000, ph = ((ms / sp) + H(L.key + 'q' + i)) % 1;
      var x = r[0] + H(L.key + 'x' + i) * (r[2] - r[0]) + Math.sin(ph * 9 + i) * 0.5, y = r[1] + ph * (r[3] - r[1]);
      ctx.fillStyle = cols[i % 4];
      ctx.globalAlpha = Math.min(1, (1 - ph) * 3) * 0.95;
      ctx.fillRect(Math.round(offX + x * ts), Math.round(offY + y * ts), Math.sin(ms / 230 + i * 1.3) > 0 ? 4 : 2, 2);
    }
    ctx.globalAlpha = 1;
  }
  // the toy boats: three round an oval in the basin, a race every minute and a half or so
  var BOATS = [['RED', '#d83a3a'], ['BLUE', '#3a6ad8'], ['GREEN', '#3aa04a']];
  function raceOf(L) { return pick([0, 1, 2], L.key + ':race'); }
  function toyBoats(L, ctx, offX, offY, ts, ms) {
    var cx = offX + 32 * ts, cy = offY + 18.4 * ts, rx = ts * 0.95, ry = ts * 0.55, win = raceOf(L), t = Math.min(L.t, 150000) / 1000;
    BOATS.forEach(function (b, i) {
      var speed = 0.28 + (i === win ? 0.035 : 0) + Math.sin(t * 0.7 + i * 2) * 0.03, a = t * speed * 2 * Math.PI / 3 + i * 2.1;
      var x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy + Math.sin(a) * ry), s = ART.boat(b[1]);
      ctx.fillStyle = 'rgba(230,245,255,0.5)'; ctx.fillRect(x - Math.round(Math.sin(a) * 6) - 2, y + 4, 4, 2);
      ctx.drawImage(s, x - 7, y - 10);
    });
  }
  function boatBet(L) {
    var t = L.t / 1000;
    if (t > 150) { say('TOY BOATS', 'THE RACE IS OVER — ' + BOATS[raceOf(L)][0] + ' WON. THE KIDS ARE ARGUING ABOUT A RE-RUN.'); return; }
    var mine = mem.got[L.key + ':bet'];
    if (mine != null) { say('TOY BOATS', 'YOU\'RE BACKING ' + BOATS[mine - 1][0] + '. COME ON, ' + BOATS[mine - 1][0] + '!'); return; }
    choose({ title: 'Toy boats', text: 'THREE BOATS, ROUND THE FOUNTAIN TILL THE BIG HAND\'S ON THE TOP. FIVE COINS ON ONE AND THE KIDS PAY YOU TRIPLE IF IT WINS.',
      rows: BOATS.map(function (b, i) {
        return { label: 'Back ' + b[0].toLowerCase(), note: '5 coins', draw: function (g, s) { g.drawImage(ART.boat(b[1]), 0, 0, 14, 14, 3, 3, s - 6, s - 6); }, pick: function () {
          pay(5, 'toyboats').then(function (r) {
            if (!r || !r.ok) { say('TOY BOATS', '"FIVE COINS. THOSE ARE THE RULES."'); return; }
            mem.got[L.key + ':bet'] = i + 1; save();
            say('TOY BOATS', 'FIVE COINS ON ' + b[0] + '. A KID SPITS IN HIS HAND AND SHAKES ON IT.');
          });
        } };
      }), closeLabel: 'Just watch' });
  }
  function boatResult(L) {
    if (L.t < 150000 || L.paid) return;
    L.paid = 1;
    var bet = mem.got[L.key + ':bet'], win = raceOf(L);
    if (!L.said.result) { L.said.result = 1; bubbleAt(L, [32, 18], BOATS[win][0] + ' WINS!', 3500, false); }
    if (bet == null || got(L, 'settled')) return;
    mark(L, 'settled');
    if (bet - 1 === win) { coins(15, 'toyboats'); sfx('coin'); toast('TOY BOATS', BOATS[win][0].charAt(0) + BOATS[win][0].slice(1).toLowerCase() + ' won!', '15 coins from the kids', false); }
  }
  // the Saints collecting: stand between them and the stall, once a happening
  function saintsStand(L) {
    var say = function (t) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say('THE SAINTS', t); };
    if (!once(L, 'stood', function () { give('roo_broth', 1); coins(20, 'saints'); sfx('slam'); }))
      return say('THEY\'VE MOVED ON, MUTTERING. THE STALLHOLDER IS STILL THANKING YOU.');
    say('YOU STEP BETWEEN THE SAINTS AND THE STALL. THE BIG ONE LOOKS AT YOU, AT YOUR HANDS, AT THE CROWD STARTING TO WATCH, AND DECIDES IT ISN\'T WORTH IT TODAY.\n\n' +
        'THE STALLHOLDER PRESSES A BOWL OF BROTH AND TWENTY COINS ON YOU. "DON\'T GO PAST THE FENCE TONIGHT," SHE SAYS. "THEY\'LL REMEMBER YOUR FACE."');
  }
  // the downpour: rain falling in sheets over the whole Warrens, thickening and thinning again
  function downpour(L, ctx, w, h) {
    var f = Math.min(1, L.t / 8000, (L.end - L.start - L.t) / 8000), now = L.t;
    if (f <= 0) return;
    ctx.save();
    ctx.fillStyle = 'rgba(150,175,210,' + (0.35 * f).toFixed(3) + ')';
    for (var i = 0; i < 260 * f; i++) {
      var x = (i * 97.13 + Math.floor(i / 7) * 13) % w, sp = 0.9 + (i % 5) * 0.12, y = ((now * sp * 0.6) + i * 53.7) % (h + 40) - 20;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 7 + (i % 3) * 3);
    }
    ctx.restore();
  }
  // the Sump stirring: wide rings going out over the basin from something under it
  function stirring(L, ctx, offX, offY, ts) {
    var cx = offX + 60.5 * ts, cy = offY + 37.5 * ts;
    ctx.save();
    for (var i = 0; i < 4; i++) {
      var k = ((L.t / 2600) + i / 4) % 1;
      ctx.strokeStyle = 'rgba(120,240,210,' + (0.45 * (1 - k)).toFixed(2) + ')'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(Math.round(cx), Math.round(cy), 6 + k * ts * 6, 2 + k * ts * 2, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  // the brawl: break it up or have a bet on it
  var BRAWLERS = ['THE SAILOR', 'THE DOCKHAND'];
  function brawlStep(L) {
    if (L.mine && L.mine.calm) { say('THE BRAWL', 'THEY\'RE SHAKING HANDS NOW, SHEEPISH, AND BLAMING THE ALE.'); return; }
    var bet = mem.got[L.key + ':bet'];
    choose({ title: 'A fight outside the tavern', text: 'A SAILOR AND A DOCKHAND, SHOVING AND SWINGING. SOMETHING ABOUT A GAME OF BONES.' + (bet ? '\n\nYOU\'VE TEN ON ' + BRAWLERS[bet - 1] + '.' : ''),
      rows: [{ label: 'Break it up', sub: 'get between them', pick: function () {
        L.mine = { calm: true }; sfx('hit');
        if (once(L, 'calm', function () { give('mug_of_ale', 1); }))
          say('THE BRAWL', 'YOU GET BETWEEN THEM. A SHOVE, A GLARE — THEN THE SAILOR LAUGHS AND BUYS YOU AN ALE FOR YOUR TROUBLE. THE CROWD DRIFTS BACK INSIDE.');
        else say('THE BRAWL', 'THEY STEP BACK. IT\'S OVER.');
      } }].concat(bet ? [] : BRAWLERS.map(function (b, i) {
        return { label: 'Ten on ' + b.toLowerCase(), note: '10 coins', pick: function () {
          pay(10, 'brawl').then(function (r) {
            if (!r || !r.ok) return;
            mem.got[L.key + ':bet'] = i + 1; save();
            say('THE BRAWL', 'SOMEONE IN THE CROWD TAKES YOUR TEN AND CHALKS IT ON THE TAVERN WALL. ' + b + ' IT IS.');
          });
        } };
      })), closeLabel: 'Stay out of it' });
  }
  function brawlEnd(L) {
    if (L.t < L.E.len - 20000 || L.over) return;
    L.over = 1;
    var bet = mem.got[L.key + ':bet'], win = Math.floor(H(L.key + ':winner') * 2);
    if (!(L.mine && L.mine.calm)) bubbleAt(L, [5.5, 7], BRAWLERS[win] + ' WINS IT!', 3500, false);
    if (!bet || got(L, 'settled')) return;
    mark(L, 'settled');
    if (bet - 1 === win) { coins(20, 'brawl'); sfx('coin'); toast('THE BRAWL', 'Your man won', '20 coins off the tavern wall', false); }
  }
  function dust(L, ms, x, y, offX, offY, ts) {
    if (Math.sin(ms / 190) < 0.2) return [];
    return [{ footRow: y + 1, draw: function (ctx) {
      for (var i = 0; i < 4; i++) {
        var a = ms / 300 + i * 1.6, r = 4 + (i % 2) * 2;
        ctx.fillStyle = i % 2 ? 'rgba(200,190,170,0.55)' : 'rgba(160,150,130,0.5)';
        ctx.fillRect(Math.round(offX + (x + 0.5) * ts + Math.cos(a) * 12) - r / 2, Math.round(offY + (y + 0.9) * ts + Math.sin(a) * 4) - r / 2, r, r);
      }
      if (Math.sin(ms / 95) > 0.85) { ctx.fillStyle = '#fff4c0'; ctx.fillRect(Math.round(offX + (x + 0.5) * ts) - 1, Math.round(offY + (y - 0.4) * ts), 3, 3); }
    } }];
  }
  // the auction: a lot a minute, bid and maybe win it
  function lotOf(L) {
    var k = Math.floor(L.t / 55000), fish = pick(LOTS, L.key + ':lot' + k), it = typeof BridgeItems !== 'undefined' && BridgeItems.get(fish);
    var val = (it && it.value) || 20, price = Math.max(4, Math.round(val * (0.55 + H(L.key + ':p' + k) * 0.35)));
    return { k: k, fish: fish, price: price, odds: val > 100 ? 0.35 : val > 40 ? 0.5 : 0.7 };
  }
  function auctionTick(L) {
    var lot = lotOf(L);
    if (lot.k === L.lotK) return;
    L.lotK = lot.k;
    if (L.t > 2500) sfx('gavel');
    bubbleAt(L, L.E.at, 'LOT ' + (lot.k + 1) + ' — ' + itemName(lot.fish).toUpperCase() + ', FROM ' + lot.price + '!', 4200, false);
  }
  function auctionBid(L) {
    var lot = lotOf(L), done = mem.got[L.key + ':lot' + lot.k];
    var text = (L.E.haul || '') + ' ON THE BLOCK NOW: ' + itemName(lot.fish).toUpperCase() + ', BIDDING FROM ' + lot.price + ' COINS.';
    if (done) { say('THE CATCH AUCTION', text + '\n\n' + (done === 1 ? 'YOU WON THIS ONE.' : 'YOU\'VE HAD YOUR BID ON THIS ONE.') + ' WAIT FOR THE NEXT LOT.'); return; }
    choose({ title: 'The catch auction', text: text, rows: [{ label: 'Bid ' + lot.price, icon: lot.fish, note: 'lot ' + (lot.k + 1), pick: function () {
      if (H(L.key + ':you:' + lot.k + ':' + (typeof BridgeState !== 'undefined' && BridgeState.getPilot && (BridgeState.getPilot() || {}).id)) > lot.odds) {
        mem.got[L.key + ':lot' + lot.k] = 2; save(); sfx('gavel');
        say('THE CATCH AUCTION', 'A HAND GOES UP AT THE BACK — THE SMOKEHOUSE MAN, HIGHER. "SOLD, TO THE SMOKEHOUSE!" NEXT LOT\'S IN A MINUTE.');
        return;
      }
      pay(lot.price, 'auction').then(function (r) {
        if (!r || !r.ok) { say('THE CATCH AUCTION', '"COINS ON THE BLOCK, FRIEND, OR HANDS DOWN."'); return; }
        mem.got[L.key + ':lot' + lot.k] = 1; save(); sfx('gavel'); give(lot.fish, 1);
        say('THE CATCH AUCTION', '"SOLD! TO THE CAPTAIN IN THE FRONT!" ' + itemName(lot.fish).toUpperCase() + ' FOR ' + lot.price + ' COINS.');
      });
    } }], closeLabel: 'Just watch' });
  }

  // ---- Arcadia ----------------------------------------------------------------------------------------------------------
  function autograph(L) {
    if (once(L, 'autograph', function () { give('autograph', 1); }))
      say(starName(L).toUpperCase(), 'A SILVER PEN, A FLOURISH, A WINK. "TO MY FAVOURITE PILOT." THE BODYGUARD STEERS THEM ON.');
    else say(starName(L).toUpperCase(), '"ONE EACH, DARLING."');
  }
  function flashes(L, ctx, offX, offY, ts, ms) {
    var s = L.t / 1000;
    if (s > 150) return;
    var k = Math.floor(ms / 110);
    for (var i = 0; i < 3; i++) {
      if (H(L.key + 'f' + k + i) > 0.42) continue;
      var x = 45.5 + H('fx' + k + i) * 11, y = 8.5 + H('fy' + k + i) * 5;
      if (x > 48.6 && x < 52.4) continue;                         // the flashes are from the crowd, behind the ropes
      var X = Math.round(offX + x * ts), Y = Math.round(offY + y * ts);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(X - 1, Y - 4, 2, 8); ctx.fillRect(X - 4, Y - 1, 8, 2);
      glow(ctx, X, Y, ts * 0.8, '255,255,240', 0.5);
    }
  }
  function parcelDrop(L) {
    var D = W.data, xs = [];
    for (var x = 3; x < 46; x++) [10, 11, 12].forEach(function (y) { if (D.collisions[y] && D.collisions[y][x] === 0) xs.push([x, y]); });
    var at = pick(xs.length ? xs : [[30, 11]], L.key + ':drop');
    return { x: at[0], y: at[1], tDrop: 34 + H(L.key + 'td') * 30, item: pick(PARCELS, L.key + ':item') };
  }
  // the drone comes in from the east, wobbling, loses the parcel over the drop and limps away west
  function droneAt(L) {
    var s = L.t / 1000, d = L.drop, x0 = 62, sp = (x0 - d.x) / d.tDrop, x = x0 - s * sp;
    if (s > d.tDrop) x = d.x - (s - d.tDrop) * sp * 1.5;
    return { x: x, y: d.y - 0.2 + Math.sin(s * 3) * 0.15, lift: 70 + Math.round(Math.sin(s * 5) * 6) };
  }
  function droneItems(L, world, offX, offY, ts, ms, sc) {
    if (!L.drop) return [];
    var s = L.t / 1000, d = L.drop, p = droneAt(L), out = [], has = s < d.tDrop;
    if (p.x > -3) out.push(thing(ART.drone(Math.floor(ms / 60) % 2, has), p.x, p.y, world, offX, offY, ts, ms, sc, { lift: p.lift, glow: true, shadow: 6, foot: 1.5 }));
    if (!has && s < d.tDrop + 1.2) {                              // falling
      var f = (s - d.tDrop) / 1.2, lift = Math.round((1 - f * f) * 70);
      out.push(thing(ART.parcel(), d.x, d.y, world, offX, offY, ts, ms, sc, { lift: lift, shadow: 4 }));
    }
    return out;
  }
  function parcelLand(L) {
    var d = L.drop;
    if (!d || L.t / 1000 < d.tDrop + 1.2 || L.landed) return;
    L.landed = 1;
    if (L.t / 1000 < d.tDrop + 3) sfx('thud');
    if (got(L, 'parcel') || typeof BridgeLoot === 'undefined') return;
    mark(L, 'parcel');
    BridgeLoot.spawn(d.x, d.y, d.item, 1);
    bubbleAt(L, [d.x, d.y], 'FINDERS KEEPERS!', 2600, false);
  }
  function brownout(L, ctx, offX, offY, ts, ms) {
    var s = L.t / 1000, D = W.data;
    for (var k = 0; k < 9; k++) {
      var a0 = k * 7, on = s - a0;
      if (on < 0 || on > 12) continue;
      var dark = on < 0.6 ? (Math.sin(on * 60) > 0 ? 0.6 : 0.1) : on > 11 ? (Math.sin(on * 50) > 0 ? 0.5 : 0) : 0.62;
      ctx.fillStyle = 'rgba(4,2,12,' + dark + ')';
      var y0 = Math.max(0, Math.round(offY - 3 * ts));
      ctx.fillRect(Math.round(offX + k * 7 * ts), y0, Math.round(7 * ts), Math.round(offY + 14.2 * ts) - y0);
    }
  }
  function chaseSky(L, ctx, ms) {
    var Wd = ctx.canvas.width, s = L.t / 1000, passes = [[0, 1, 0.22], [28, -1, 0.3], [55, 1, 0.17]];
    passes.forEach(function (p) {
      var u = (s - p[0]) / 9;
      if (u < 0 || u > 1.3) return;
      var y = Math.round(ctx.canvas.height * p[2] + Math.sin(u * 7) * 6);
      var lead = p[1] > 0 ? -60 + u * (Wd + 160) : Wd + 60 - u * (Wd + 160);
      car(ctx, Math.round(lead), y, p[1], '#c03a9a', false, ms);
      car(ctx, Math.round(lead - p[1] * 66), y + 8, p[1], '#1a1e3a', true, ms);
      car(ctx, Math.round(lead - p[1] * 120), y - 6, p[1], '#1a1e3a', true, ms + 200);
    });
  }
  function car(ctx, x, y, dir, body, cop, ms) {
    ctx.save(); ctx.translate(x, y); ctx.scale(dir < 0 ? -2 : 2, 2);
    ctx.fillStyle = '#05040a'; ctx.fillRect(-1, -1, 18, 6);
    ctx.fillStyle = body; ctx.fillRect(0, 0, 16, 4);
    ctx.fillStyle = '#8ad8f0'; ctx.fillRect(9, 0, 4, 2);
    ctx.fillStyle = cop ? '#40e0ff' : '#ff60c0'; ctx.fillRect(1, 4, 14, 1);
    if (cop) { var b = Math.floor(ms / 140) % 2; ctx.fillStyle = b ? '#ff3030' : '#3060ff'; ctx.fillRect(5, -2, 3, 2); ctx.fillStyle = b ? '#3060ff' : '#ff3030'; ctx.fillRect(8, -2, 3, 2); }
    ctx.fillStyle = 'rgba(255,240,200,0.8)'; ctx.fillRect(16, 1, 2, 2);
    ctx.restore();
    if (cop) glow(ctx, x + 16 * dir, y - 2, 26, Math.floor(ms / 140) % 2 ? '255,40,40' : '40,90,255', 0.35);
  }
  function chaseLights(L, ctx, ms) {
    var s = L.t / 1000;
    if (![0, 28, 55].some(function (p) { return s > p && s < p + 11; })) return;
    var W2 = ctx.canvas.width, H2 = ctx.canvas.height, x = (ms / 6) % (W2 * 1.4) - W2 * 0.2;
    glow(ctx, x, H2 * 0.4, W2 * 0.35, Math.floor(ms / 280) % 2 ? '255,40,60' : '40,80,255', 0.12);
  }
  function scanlines(L, ctx, ms) {
    var Hh = ctx.canvas.height, Wd = ctx.canvas.width;
    ctx.fillStyle = 'rgba(40,255,120,0.035)';
    for (var y = (Math.floor(ms / 40) % 4); y < Hh; y += 4) ctx.fillRect(0, y, Wd, 1);
    if (Math.sin(ms / 70) > 0.96) { ctx.fillStyle = 'rgba(40,255,120,0.08)'; ctx.fillRect(0, Math.round(H(ms) * Hh), Wd, 6); }
  }
  // the spaceport: a freighter lifting off from a berth past the railing, rising up through the view on her engines
  var SHIPS_OUT = ['Kestrel Run', 'Tolliver\'s Pride', 'Saltwind', 'Long Odds', 'Margery Fane', 'Ninth Wave'];
  function freighterArt() { return sprite('freighter', 30, 12, function (P) {
    P(O, [[2, 2, 24, 8], [0, 4, 3, 4], [26, 3, 4, 6], [6, 0, 6, 3], [8, 10, 3, 2], [19, 10, 3, 2]]);
    P('#8a5a3a', [[3, 3, 22, 6]]); P('#a8744a', [[3, 3, 22, 2]]); P('#5a3a2a', [[3, 8, 22, 1]]);
    P('#4a4a54', [[26, 4, 3, 4]]); P('#7ad0f0', [[1, 5, 2, 2]]); P('#5a5e68', [[7, 1, 4, 2]]);
    P('#e0b020', [[12, 6, 6, 1]]); P('#3a2a20', [[9, 9, 1, 2], [20, 9, 1, 2]]);
    P('#ff4040', [[4, 3, 1, 1]]); P('#40e080', [[24, 3, 1, 1]]);
  }); }
  function liftoff(L, ctx, offX, offY, ts, ms) {
    var s = L.t / 1000, W2 = ctx.canvas.width, H2 = ctx.canvas.height;
    var x = Math.round(offX + 36 * ts), base = H2 + 40;
    var warm = Math.min(1, s / 6);
    if (s < 10) glow(ctx, x, H2, 140, '255,180,90', 0.35 * warm * (0.8 + 0.2 * Math.sin(ms / 60)));
    if (s < 8) return;
    var u = Math.min(1, (s - 8) / 60), y = Math.round(base - Math.pow(u, 1.5) * (H2 + 240));
    if (y < -120) return;
    var art = freighterArt(), k = 2;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    glow(ctx, x, y + 34, 70, '120,170,255', 0.55);
    ctx.fillStyle = 'rgba(200,225,255,0.85)';
    for (var i = 0; i < 3; i++) {                                   // three plumes of thrust, flickering
      var fx = x - 30 + i * 30, len = 26 + Math.round(Math.sin(ms / 45 + i) * 6);
      ctx.fillRect(fx - 3, y + 18, 6, len); ctx.fillStyle = 'rgba(120,170,255,0.6)'; ctx.fillRect(fx - 5, y + 18 + len, 10, 10);
      ctx.fillStyle = 'rgba(200,225,255,0.85)';
    }
    ctx.drawImage(art, Math.round(x - art.width * k / 2), Math.round(y - art.height * k / 2), art.width * k, art.height * k);
    ctx.restore();
  }
  // Lantern Row: paper sky lanterns let go from the roof shrine, rising and drifting up between the towers
  function skyLanternArt() { return sprite('skylantern', 4, 5, function (P) {
    P('#6a1a0a', [[0, 0, 4, 5]]); P('#e8702a', [[1, 0, 2, 4]]); P('#ffd890', [[1, 1, 2, 2]]); P('#fff4c8', [[1, 3, 2, 1]]);
  }); }
  function skyLanterns(L, ctx, offX, offY, ts, ms) {
    var s = L.t / 1000, art = skyLanternArt();
    for (var i = 0; i < 26; i++) {
      var born = 3 + i * 7 + H(L.key + 'b' + i) * 4, age = s - born;
      if (age < 0 || age > 70) continue;
      var x0 = 1.5 + H(L.key + 'x' + i) * 5.5, rise = age * (0.12 + H(L.key + 'r' + i) * 0.06);
      var x = offX + (x0 + Math.sin(age / 6 + i) * 0.6 + age * 0.03) * ts, y = offY + (5.6 - rise) * ts;
      var a = Math.min(1, age / 2) * Math.min(1, (70 - age) / 10);
      ctx.globalAlpha = a;
      glow(ctx, x + 4, y + 5, 14, '255,170,80', 0.35 * a);
      ctx.drawImage(art, Math.round(x), Math.round(y));
    }
    ctx.globalAlpha = 1;
  }
  /** What every screen in Arcadia shows while NULL has them (js/skyline.js), else null. */
  var scr = { at: 0, v: null };
  function screens() {
    var t = now();
    if (Math.abs(t - scr.at) < 500) return scr.v;
    var p = plan('arcadia-sky', Math.floor(t / SLOT));
    scr.at = t;
    scr.v = (forced && forced.E.id === 'hijack' && t >= forced.start && t < forced.end) || (p && p.E.id === 'hijack' && t >= p.start && t < p.end) ? 'null' : null;
    return scr.v;
  }

  // ---- Verdance ---------------------------------------------------------------------------------------------------------
  // the hen's dash: up the street, round the green, back by the well — between these by the open ground (a search, so
  // she never runs through a wall, a stall or a well)
  var HEN_WAY = [[33, 12], [27, 12], [22, 15], [20, 19], [25, 22], [31, 21], [35, 20], [29, 17], [22, 16], [15, 15], [11, 19], [9, 22], [14, 23], [19, 22], [22, 19]];
  function gridPath(C, a, b) {
    var h = C.length, w = C[0].length, start = a[1] * w + a[0], goal = b[1] * w + b[0], prev = new Int32Array(w * h).fill(-1), q = [start];
    prev[start] = start;
    for (var qi = 0; qi < q.length && prev[goal] < 0; qi++) {
      var c = q[qi], x = c % w, y = (c - x) / w;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var nx = x + d[0], ny = y + d[1], n = ny * w + nx;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || prev[n] >= 0 || (n !== goal && C[ny][nx] === 1)) return;
        prev[n] = c; q.push(n);
      });
    }
    if (prev[goal] < 0) return null;
    var out = [];
    for (var at = goal; at !== start; at = prev[at]) out.push([at % w, (at - at % w) / w]);
    out.push(a);
    return out.reverse();
  }
  function henWay(C) {
    var out = [];
    for (var i = 0; i < HEN_WAY.length - 1; i++) {
      var P = gridPath(C, HEN_WAY[i], HEN_WAY[i + 1]);
      if (!P) return null;
      out = out.concat(i ? P.slice(1) : P);
    }
    return out.filter(function (p, i) {                          // corners only: a straight run is one leg
      var a = out[i - 1], b = out[i + 1];
      return !a || !b || (p[0] - a[0]) * (b[1] - p[1]) !== (p[1] - a[1]) * (b[0] - p[0]);
    });
  }
  // she dashes five seconds and stops to peck for a second and a half; how far along her way she's got
  function henRun(s) { var k = Math.floor(s / 6.5), r = s - k * 6.5; return { d: (k * 5 + Math.min(r, 5)) * 1.6, peck: r > 5 }; }
  // where she is d tiles along her way (there and back again)
  function henAt(L, d) {
    var P = L.henPath || HEN_WAY, total = 0, segs = [];
    for (var i = 0; i < P.length - 1; i++) { var sg = dist(P[i], P[i + 1]); segs.push(sg); total += sg; }
    var d2 = ((Math.max(0, d) % (total * 2)) + total * 2) % (total * 2), back = d2 > total;
    if (back) d2 = total * 2 - d2;
    for (var j = 0; j < segs.length; j++) {
      if (d2 <= segs[j]) {
        var f = segs[j] ? d2 / segs[j] : 0, dx = (P[j + 1][0] - P[j][0]) * (back ? -1 : 1), dy = (P[j + 1][1] - P[j][1]) * (back ? -1 : 1);
        return { x: P[j][0] + (P[j + 1][0] - P[j][0]) * f, y: P[j][1] + (P[j + 1][1] - P[j][1]) * f, flip: dx < 0, dx: dx, dy: dy };
      }
      d2 -= segs[j];
    }
    return { x: P[0][0], y: P[0][1], flip: false, dx: 1, dy: 0 };
  }
  // the people after her: a little way behind her along the same way
  function chaseAt(L, c, s) {
    if (L.caught) return { hide: true, x: -9, y: -9 };
    var r = henRun(s), h = henAt(L, r.d - c.chase);
    return { x: h.x, y: h.y, walk: r.peck ? null : r.d, f: Math.abs(h.dx) > Math.abs(h.dy) ? (h.dx > 0 ? 'right' : 'left') : (h.dy > 0 ? 'down' : 'up'), seed: c.chase | 0 };
  }
  function henItems(L, world, offX, offY, ts, ms, sc) {
    if (L.caught) return [];
    var r = henRun(L.t / 1000), h = L.hen = henAt(L, r.d);
    h.peck = r.peck;
    return [thing(ART.hen(h.peck ? 0 : Math.floor(ms / 120) % 2, h.flip), h.x, h.y, world, offX, offY, ts, ms, sc, { shadow: 4, foot: 0.9 })];
  }
  function catchHen(L) {
    var h = L.hen, p = me();
    if (!h || !p || dist([p.x, p.y], [h.x, h.y]) > 1.6) { say('THE HEN', 'SHE\'S TOO QUICK — GET CLOSER!'); return; }
    L.caught = true; sfx('cluck');
    if (once(L, 'hen', function () { give('egg', 2); coins(10, 'hen'); }))
      say('THE HEN', 'YOU SCOOP HER UP, INDIGNANT AND FLAPPING. THE FARMER PUFFS UP, RED-FACED. "HENRIETTA! THANK YOU — HERE, TWO OF HER BEST, AND SOMETHING FOR YOUR TROUBLE." (+10 COINS)');
    else say('THE HEN', 'BACK SHE GOES IN THE FARMER\'S ARMS.');
  }
  // the mail coach: in from Meadow Lane, a stop by the green, off up the street
  var COACH = [[10.5, 34], [10.5, 27], [11, 21], [20, 21], [30, 21], [38, 20], [44, 19], [48, 19]];
  function coachAt(L) {
    var s = L.t / 1000, P = COACH, sp = 1.8, stopAt = 3, stopLen = 110;
    var segs = [], acc = [0];
    for (var i = 0; i < P.length - 1; i++) { segs.push(dist(P[i], P[i + 1])); acc.push(acc[i] + segs[i]); }
    var d = s * sp, inStop = false, leaving = false;
    if (d > acc[stopAt]) { var after = s - acc[stopAt] / sp; if (after < stopLen) { d = acc[stopAt]; inStop = true; } else { d = acc[stopAt] + (after - stopLen) * sp; leaving = true; } }
    for (var j = 0; j < segs.length; j++) {
      if (d <= acc[j + 1] || j === segs.length - 1) {
        var f = segs[j] ? Math.min(1, (d - acc[j]) / segs[j]) : 0, dx = P[j + 1][0] - P[j][0];
        return { x: P[j][0] + dx * f, y: P[j][1] + (P[j + 1][1] - P[j][1]) * f, flip: dx < 0, stopped: inStop, leaving: leaving, gone: d >= acc[acc.length - 1], moving: !inStop };
      }
    }
    return { gone: true };
  }
  function coachItems(L, world, offX, offY, ts, ms, sc) {
    var c = L.coach = coachAt(L);
    if (c.gone) return [];
    return [thing(ART.coach(c.moving ? Math.floor(ms / 160) % 2 : 0, c.flip), c.x, c.y, world, offX, offY, ts, ms, sc, { shadow: 22, foot: 0.95 })];
  }
  function post(L) {
    if (!once(L, 'post', function () {})) { say('THE MAIL COACH', '"THAT\'S ALL FOR YOU TODAY. SAME TIME NEXT WEEK, LIKE AS NOT."'); return; }
    var letter = pick(LETTERS, L.key + ':letter'), gift = H(L.key + ':gift') < 0.45 ? pick(POST_GIFTS, L.key + ':g') : null;
    if (gift) give(gift, 1);
    note('Post from the mail coach', letter);
    say('THE MAIL COACH', 'THE COACHMAN RIFFLES THROUGH A SACK AND HANDS SOMETHING DOWN.\n\n' + letter + (gift ? '\n\nAND A PARCEL: ' + itemName(gift).toUpperCase() + '.' : ''));
  }
  function balloon(L, ctx, offX, offY, ts, ms, shadow) {
    var s = L.t / 1000, len = L.E.len / 1000, u = s / len, D = W.data;
    var x = -4 + u * ((D.width || 46) + 8), y = (D.height || 34) * 0.62 - u * 8 + Math.sin(s / 7) * 0.6;
    var a = Math.min(1, s / 6, (len - s) / 6);
    if (shadow) {
      ctx.fillStyle = 'rgba(0,0,0,' + (0.18 * a).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(Math.round(offX + (x + 2) * ts), Math.round(offY + (y + 3) * ts), ts * 0.8, ts * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      return;
    }
    var b = ART.balloon();
    ctx.globalAlpha = a;
    ctx.drawImage(b, Math.round(offX + x * ts - b.width / 2), Math.round(offY + (y - 5) * ts - b.height + Math.sin(s * 1.3) * 2));
    ctx.globalAlpha = 1;
  }
  function kites(L, ctx, offX, offY, ts, ms) {
    var cols = ['#d83a3a', '#f0c040', '#3a8ad8'];
    (L.E.cast || []).forEach(function (c, i) {
      var p = L.pos[i];
      if (!p) return;
      var hx = Math.round(offX + (p.x + 0.5) * ts + 4), hy = Math.round(offY + (p.y + 0.2) * ts);
      var kx = hx + Math.round(Math.sin(ms / 1300 + i * 2) * ts * 0.9) + (i - 1) * 10, ky = hy - Math.round(ts * (4.2 + Math.sin(ms / 900 + i) * 0.4 + i * 0.5));
      ctx.strokeStyle = 'rgba(240,240,230,0.6)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo((hx + kx) / 2 + 10, (hy + ky) / 2 + 12, kx + 11, ky + 24); ctx.stroke();
      for (var t = 0; t < 6; t++) { ctx.fillStyle = t % 2 ? '#ffffff' : cols[i % 3]; ctx.fillRect(kx + 10 + Math.round(Math.sin(ms / 200 + t + i) * 4), ky + 26 + t * 5, 4, 2); }
      ctx.drawImage(ART.kite(cols[i % 3]), kx, ky);
    });
  }
  function rainbow(L, ctx) {
    var s = L.t / 1000, len = L.E.len / 1000, a = Math.min(1, s / 20, (len - s) / 20) * 0.22;
    if (a <= 0) return;
    var Wd = ctx.canvas.width, Hh = ctx.canvas.height, cx = Wd * 0.55, cy = Hh * 1.05, R = Wd * 0.75;
    var bands = ['255,60,60', '255,150,40', '255,230,60', '80,210,90', '60,140,255', '120,80,220'];
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    bands.forEach(function (b, i) {
      ctx.strokeStyle = 'rgba(' + b + ',' + a + ')'; ctx.lineWidth = Math.max(4, Math.round(Wd * 0.012));
      ctx.beginPath(); ctx.arc(cx, cy, R - i * ctx.lineWidth, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    });
    ctx.restore();
  }

  // ---- Hoarfell ---------------------------------------------------------------------------------------------------------
  function blastTick(L) {
    var s = L.t / 1000;
    [6, 32, 58].forEach(function (b, i) {
      if (s < b || L.said['blast' + i]) return;
      L.said['blast' + i] = 1;
      if (s < b + 4) { sfx('blast'); if (typeof BridgeWorld !== 'undefined' && BridgeWorld.kick) BridgeWorld.kick(0, 1, 2); }
    });
  }
  function blastPuffs(L, ctx, offX, offY, ts, ms) {
    var s = L.t / 1000, D = W.data;
    [6, 32, 58].forEach(function (b, i) {
      var e = s - b;
      if (e < 0 || e > 16) return;
      // high on the slopes at the top of the place
      var x = offX + (D.width || 46) * ts * (0.12 + H(L.key + 'bx' + i) * 0.76), y = offY + ts * (1.5 + H(L.key + 'by' + i) * 2.5);
      var a = Math.min(1, e * 2) * Math.max(0, 1 - e / 16);
      for (var j = 0; j < 9; j++) {
        var r = (6 + e * 3.2) * (0.6 + H(L.key + 'r' + i + j) * 0.7), ang = j / 9 * Math.PI - Math.PI;
        var px2 = x + Math.cos(ang) * e * 4 * (0.5 + H('d' + j)), py2 = y + Math.sin(ang) * e * 2.2 + e * 1.4;
        ctx.fillStyle = 'rgba(' + (j % 3 ? '236,242,250' : '206,214,232') + ',' + (0.75 * a).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(Math.round(px2), Math.round(py2), Math.round(r), 0, Math.PI * 2); ctx.fill();
      }
    });
  }
  function sledItem(L, p, world, offX, offY, ts, ms, sc) {
    var back = p.f === 'left' ? 1.1 : p.f === 'right' ? -1.1 : 0;
    return thing(ART.sled(), p.x + back, p.y + (back ? 0.1 : -0.6), world, offX, offY, ts, ms, sc, { foot: 0.6, shadow: 10 });
  }
  // a vehicle along a straight run: [[x0, y], [x1, y]] at `speed` tiles a second, after `from` s
  function vehicle(L, kind, run, speed, from, world, offX, offY, ts, ms, sc) {
    var s = L.t / 1000 - from;
    if (s < 0) return [];
    var len = dist(run[0], run[1]), d = s * speed;
    if (d > len) return [];
    var f = d / len, x = run[0][0] + (run[1][0] - run[0][0]) * f, y = run[0][1] + (run[1][1] - run[0][1]) * f;
    var c = ART[kind](Math.floor(ms / 160) % 2, run[1][0] < run[0][0]);
    return [thing(c, x, y, world, offX, offY, ts, ms, sc, { shadow: 20, after: kind === 'sleigh' ? function (ctx, dx, dy) {
      glow(ctx, dx + (run[1][0] < run[0][0] ? c.width - 45 : 45), dy + 6, 16, '255,210,130', 0.4);
    } : null })];
  }
  // the snowball fight: two sides, balls arcing across; join in and they turn on you
  function throwsAt(L, s) {
    var out = [], P = L.pos, k = Math.floor(s / 0.7);
    for (var i = Math.max(0, k - 2); i <= k; i++) {
      var from = Math.floor(H(L.key + 'from' + i) * 4), to = from < 2 ? 2 + Math.floor(H(L.key + 'to' + i) * 2) : Math.floor(H(L.key + 'to' + i) * 2);
      var A = P[from], B = P[to], t0 = i * 0.7, f = (s - t0) / 1.0;
      if (!A || !B || A.hide || f < 0 || f > 1) continue;
      out.push({ a: A, b: L.joined && H(L.key + 'me' + i) < 0.5 ? (L.joined.at) : B, f: f, i: i });
    }
    return out;
  }
  function snowballs(L, world, offX, offY, ts, ms, sc) {
    var s = L.t / 1000, out = [], ball = ART.snowball();
    throwsAt(L, s).forEach(function (t) {
      var x = t.a.x + (t.b.x - t.a.x) * t.f, y = t.a.y + (t.b.y - t.a.y) * t.f, lift = Math.round(Math.sin(t.f * Math.PI) * 26) + 18;
      out.push({ footRow: y + 0.95, draw: function (ctx) { ctx.drawImage(ball, Math.round(offX + (x + 0.5) * ts) - 3, Math.round(offY + (y + 1) * ts) - lift); } });
    });
    if (L.joined) (L.joined.marks || []).forEach(function (m) {
      if (s > m.t) return;
      out.push({ footRow: m.y + 0.1, draw: function (ctx) {            // where it'll land: a ring closing in on the snow
        var k = Math.max(0, (m.t - s) / 0.9), cx = offX + (m.x + 0.5) * ts, cy = offY + (m.y + 0.8) * ts;
        if (typeof BridgeFX === 'undefined' || !BridgeFX.ring) return;
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; BridgeFX.ring(ctx, cx, cy, ts * (0.25 + 0.3 * k), 0.45);
        ctx.fillStyle = 'rgba(160,200,255,0.5)'; BridgeFX.ring(ctx, cx, cy, ts * 0.25, 0.45);
      } });
    });
    return out;
  }
  function snowJoin(L) {
    if (L.joined) { snowThrow(L); return; }
    if (got(L, 'snow')) { say('SNOWBALL FIGHT', 'THEY\'VE HAD ENOUGH OF YOU FOR ONE DAY. (YOU WON\'T BE FORGOTTEN.)'); return; }
    var p = me();
    L.joined = { since: L.t / 1000, hits: 0, taken: 0, marks: [], at: { x: p.x, y: p.y } };
    L.inters[0].prompt = 'PRESS E TO THROW';
    say('SNOWBALL FIGHT', 'YOU\'RE IN! E TO THROW AT WHOEVER\'S NEAREST. WATCH THE GROUND — A WHITE SQUARE MEANS ONE\'S COMING AT YOU. FORTY SECONDS.');
  }
  function snowThrow(L) {
    var p = me(), best = null, bd = 99;
    if (!p) return;
    L.pos.forEach(function (q) { if (q && !q.hide) { var d = dist([p.x, p.y], [q.x, q.y]); if (d < bd) { bd = d; best = q; } } });
    if (!best) return;
    sfx('swish');
    if (H(L.key + 'mine' + Math.floor(L.t / 300)) < Math.max(0.25, 1 - bd / 9)) { L.joined.hits++; bubbleAt(L, [best.x, best.y], 'OOF!', 900, false); sfx('splat'); }
  }
  function snowTick(L) {
    var j = L.joined;
    if (!j) return;
    var s = L.t / 1000, p = me();
    if (p) j.at = { x: p.x, y: p.y };
    if (s - j.since > 40) {
      L.joined = null; L.inters[0].prompt = 'PRESS E TO JOIN IN'; mark(L, 'snow');
      var won = j.hits > j.taken;
      if (won) give('hot_cocoa', 1);
      say('SNOWBALL FIGHT', 'TIME! YOU HIT ' + j.hits + ', AND TOOK ' + j.taken + '. ' + (won ? 'THE KIDS DECLARE YOU CHAMPION AND SPLIT A FLASK OF COCOA WITH YOU.' : 'THE KIDS ARE MERCILESS IN VICTORY.'));
      return;
    }
    // a ball at you every couple of seconds: its mark first, then it lands
    var k = Math.floor(s / 2.2);
    if (k !== j.k && p) { j.k = k; j.marks.push({ x: Math.round(p.x), y: Math.round(p.y), t: s + 0.9 }); }
    j.marks = j.marks.filter(function (m) {
      if (s < m.t) return true;
      if (p && Math.round(p.x) === m.x && Math.round(p.y) === m.y) { j.taken++; sfx('splat'); if (typeof BridgeWorld !== 'undefined' && BridgeWorld.kick) BridgeWorld.kick(0, 1, 1); }
      return false;
    });
  }

  // ---- Sylvara ----------------------------------------------------------------------------------------------------------
  function lanternOn(ctx, cx, footY, ms, p) {
    var l = ART.lantern(), sway = Math.round(Math.sin(ms / 400 + (p.seed || 0)) * 1);
    ctx.drawImage(l, cx + 4 + sway, footY - 26);
    glow(ctx, cx + 8 + sway, footY - 20, 20, '255,210,130', 0.35 + 0.08 * Math.sin(ms / 130 + (p.seed || 0)));
  }
  var STAG = [[1, 14], [16, 14], [22, 14.5], [22, 14.5], [32, 14], [40, 13.5]];
  function stagAt(L) {
    var s = L.t / 1000, p = me(), d = 0;
    if (L.stagHold == null) L.stagHold = 0;
    var segs = [], acc = [0];
    for (var i = 0; i < STAG.length - 1; i++) { segs.push(dist(STAG[i], STAG[i + 1])); acc.push(acc[i] + segs[i]); }
    var sp = 0.55, pauseAt = acc[2], pauseLen = 25;
    d = (s - L.stagHold) * sp;
    var paused = false;
    if (d > pauseAt) { var after = (s - L.stagHold) - pauseAt / sp; if (after < pauseLen) { d = pauseAt; paused = true; } else d = pauseAt + (after - pauseLen) * sp; }
    var x = STAG[0][0], y = STAG[0][1], flip = false;
    for (var j = 0; j < segs.length; j++) {
      if (d <= acc[j + 1] || j === segs.length - 1) {
        var f = segs[j] ? Math.min(1, (d - acc[j]) / segs[j]) : 0;
        x = STAG[j][0] + (STAG[j + 1][0] - STAG[j][0]) * f; y = STAG[j][1] + (STAG[j + 1][1] - STAG[j][1]) * f;
        flip = STAG[j + 1][0] < STAG[j][0];
        break;
      }
    }
    var close = p && dist([p.x, p.y], [x, y]) < 3;                 // it stops for you, and looks
    if (close && !paused) { L.stagHold += 1 / 60; }
    if (close) flip = p.x < x;
    return { x: x, y: y, flip: flip, still: close || paused, gone: d >= acc[acc.length - 1], left: (acc[acc.length - 1] - d) / sp };
  }
  function stagItems(L, world, offX, offY, ts, ms, sc) {
    var g = L.stag = stagAt(L);
    if (g.gone) return [];
    var c = ART.stag(g.still ? 0 : Math.floor(ms / 220) % 4, !g.flip);
    var fade = Math.min(1, L.t / 4000, g.left != null ? g.left / 4 : 1);
    var out = [thing(c, g.x, g.y, world, offX, offY, ts, ms, sc, { glow: true, foot: 0.95, alpha: 0.92 * fade, after: function (ctx, dx, dy) {
      glow(ctx, dx + c.width / 2, dy + c.height / 2, ts * 1.6, '160,240,220', 0.28 + 0.06 * Math.sin(ms / 300));
    } })];
    out.push({ footRow: g.y + 1, draw: function (ctx) {
      for (var i = 0; i < 6; i++) {
        var ph = ((ms / 1800) + i / 6) % 1;
        ctx.fillStyle = 'rgba(200,255,240,' + (0.8 * (1 - ph)).toFixed(3) + ')';
        ctx.fillRect(Math.round(offX + (g.x + 0.5) * ts + Math.sin(i * 2.3 + ph * 4) * 14), Math.round(offY + (g.y + 0.6) * ts - ph * ts * 1.4), 2, 2);
      }
    } });
    return out;
  }
  function stagBless(L) {
    var g = L.stag, p = me();
    if (!g || !p || dist([p.x, p.y], [g.x, g.y]) > 2.2) { say('THE SPIRIT STAG', 'IT TURNS ITS HEAD TOWARD YOU. CLOSER. SLOWLY.'); return; }
    if (once(L, 'bless', function () {
      if (typeof BridgeInventory !== 'undefined') { BridgeInventory.restoreEnergy(999); BridgeInventory.restoreHP(999); }
    })) {
      sfx('chime');
      note('The spirit stag', 'It lowered its head to you, and the tiredness went out of you like a breath.');
      say('THE SPIRIT STAG', 'IT LOWERS ITS GREAT HEAD UNTIL THE ANTLERS ALMOST TOUCH YOU. FOR A MOMENT THE WHOLE GLADE IS SILVER. YOU FEEL RESTED, THROUGH AND THROUGH.');
    } else say('THE SPIRIT STAG', 'IT REGARDS YOU, CALM, AND WALKS ON.');
  }

  // ---- Enigma -----------------------------------------------------------------------------------------------------------
  function flicker(L, ctx, offX, offY, ts, ms, Wd, Hh) {
    var s = L.t / 1000, len = L.E.len / 1000;
    if (s > len - 3) return;
    var band = ((s % 3.5) / 3.5) * 30 + 2, dark = 0.6;
    if (Math.sin(ms / 37) > 0.93) dark = 0.85;
    ctx.fillStyle = 'rgba(2,6,10,' + dark + ')';
    var bx = Math.round(offX + band * ts);
    ctx.fillRect(0, 0, Math.max(0, bx - ts * 2), Hh);
    ctx.fillRect(bx + ts * 2, 0, Wd, Hh);
    ctx.fillStyle = 'rgba(2,6,10,' + (dark * 0.4) + ')';
    ctx.fillRect(bx - ts * 2, 0, ts * 4, Hh);
    glow(ctx, bx, Math.round(offY + 8 * ts), ts * 2.4, '120,220,240', 0.18);
  }
  function doorMist(L, offX, offY, ts, ms) {
    var s = L.t / 1000;
    if (s > 50) return [];
    return [{ footRow: 12, draw: function (ctx) {
      var x = Math.round(offX + 29.5 * ts), y = Math.round(offY + 11.4 * ts);
      if (s < 40) { ctx.fillStyle = 'rgba(160,230,255,0.5)'; ctx.fillRect(x - 1, y - 30, 2, 30); }
      for (var i = 0; i < 10; i++) {
        var ph = ((ms / 2200) + i / 10) % 1, a = (1 - ph) * Math.max(0, 1 - s / 50) * 0.5;
        ctx.fillStyle = 'rgba(210,235,250,' + a.toFixed(3) + ')';
        var r = 3 + ph * 8;
        ctx.beginPath(); ctx.arc(x - ph * 26 + Math.sin(i * 1.7) * 4, y - 6 + Math.sin(i * 2.9) * 10 + ph * 6, r, 0, Math.PI * 2); ctx.fill();
      }
    } }];
  }

  // ---- new things to own -------------------------------------------------------------------------------------------------
  var NEW = {
    wedding_cake: { name: 'Wedding Cake', desc: 'A slice of the cake from St Brendan\'s steps, in a napkin. For luck.', type: 'food', effects: { hp: 20, energy: 20 }, value: 5,
      draw: function (ctx, x, y, s) { var u = s / 16; px(ctx, x, y, u, O, [[2, 6, 12, 8]]); px(ctx, x, y, u, '#f4ecd8', [[3, 7, 10, 6]]); px(ctx, x, y, u, '#ffffff', [[3, 7, 10, 2]]); px(ctx, x, y, u, '#f0a8c0', [[5, 9, 2, 1], [9, 9, 2, 1]]); px(ctx, x, y, u, '#c8a040', [[3, 11, 10, 1]]); } },
    autograph: { name: 'Autograph', desc: 'Signed in silver ink, outside the Neon Royale: "To my favourite pilot." Worth something to the right collector.', type: 'trophy', value: 40,
      draw: function (ctx, x, y, s) { var u = s / 16; px(ctx, x, y, u, O, [[2, 3, 12, 11]]); px(ctx, x, y, u, '#f4f0e8', [[3, 4, 10, 9]]); px(ctx, x, y, u, '#9a9ab8', [[4, 7, 3, 1], [6, 8, 4, 1], [9, 7, 2, 1], [10, 6, 2, 1]]); px(ctx, x, y, u, '#e870c0', [[11, 11, 1, 1]]); } },
    leaf_lantern: { name: 'Leaf Lantern', desc: 'Pressed on you by an elf in the lantern procession. It doesn\'t need oil and it doesn\'t go out.', type: 'trophy', value: 25,
      draw: function (ctx, x, y, s) { var u = s / 16; px(ctx, x, y, u, O, [[6, 2, 4, 1], [5, 3, 6, 10]]); px(ctx, x, y, u, '#3e6e34', [[5, 3, 6, 2]]); px(ctx, x, y, u, '#e0a040', [[6, 5, 4, 7]]); px(ctx, x, y, u, '#fff0b8', [[7, 7, 2, 3]]); } }
  };
  function addItems() {
    if (typeof BridgeItems === 'undefined' || !BridgeItems.all) return;
    var all = BridgeItems.all();
    Object.keys(NEW).forEach(function (id) {
      if (all[id]) return;
      var it = Object.assign({ id: id, stackable: true }, NEW[id]);
      if (it.effects && !it.onUse) it.onUse = function () {
        var e = this.effects;
        if (e.hp) BridgeInventory.restoreHP(e.hp);
        if (e.energy) BridgeInventory.restoreEnergy(e.energy);
        return true;
      };
      all[id] = it;
    });
  }
  addItems();

  // ---- the tests ---------------------------------------------------------------------------------------------------------
  /** Start a happening now (or `s` seconds into it), in its own place. */
  function force(id, s) {
    var E = EV[id];
    if (!E) return null;
    var t = now();
    forced = { E: E, start: t - (s || 0) * 1000, end: t - (s || 0) * 1000 + E.len, key: id + '@forced' + Math.floor(t / 1000) };
    lastCheck = 0; scr.at = 0;
    return { world: E.worlds[0], key: forced.key };
  }
  /** What's coming in a place over the next hours: [{ id, start, end }]. */
  function schedule(worldId, hours) {
    var t = now(), out = [];
    for (var sl = Math.floor(t / SLOT); sl * SLOT < t + (hours || 3) * 3600000; sl++) {
      Object.keys(STREAMS).forEach(function (s) {
        if (!STREAMS[s].some(function (E) { return E.worlds.indexOf(worldId) >= 0; })) return;
        var p = plan(s, sl);
        if (p && p.E.worlds.indexOf(worldId) >= 0) out.push({ id: p.E.id, start: p.start, end: p.end });
      });
    }
    return out;
  }
  /** Every event's people, things and talk on open ground in its place (and its walks clear of walls). */
  function check() {
    var out = [], worlds = {};
    Object.keys(EV).forEach(function (id) { EV[id].worlds.forEach(function (w) { worlds[w] = 1; }); });
    return Promise.all(Object.keys(worlds).map(function (w) {
      return fetch('/bridge/assets/worlds/' + w + '.json').then(function (r) { return r.json(); }).then(function (d) { worlds[w] = d; });
    })).then(function () {
      Object.keys(EV).forEach(function (id) {
        var E = EV[id], d = worlds[E.worlds[0]], C = d.collisions;
        var open = function (x, y) { x = Math.round(x); y = Math.round(y); return C[y] && C[y][x] === 0; };
        (E.cast || []).forEach(function (c, i) {
          if (c.x != null && !open(c.x, c.y)) out.push(id + ': cast ' + i + ' (' + c.sheet + ') stands on a solid tile at ' + c.x + ',' + c.y);
          if (c.path) for (var j = 0; j < c.path.length - 1; j++) {
            var a = c.path[j], b = c.path[j + 1], n = Math.ceil(dist(a, b) * 3);
            for (var k = 1; k < n; k++) { var x = a[0] + (b[0] - a[0]) * k / n, y = a[1] + (b[1] - a[1]) * k / n; if (!open(x, y)) { out.push(id + ': cast ' + i + ' walks through a wall near ' + Math.round(x) + ',' + Math.round(y)); break; } }
          }
        });
        (E.talk || []).forEach(function (tk) {
          if (tk.x != null && !open(tk.x, tk.y) && !(E.props || []).some(function (p) { return (p.solid || []).some(function (s) { return s[0] === tk.x && s[1] === tk.y; }); })) out.push(id + ': ' + tk.label + ' is on a solid tile');
        });
        (E.take || []).forEach(function (tk) { if (!(d.interactions || []).some(function (i) { return i.label === tk.label; })) out.push(id + ': no ' + tk.label + ' in ' + E.worlds[0]); });
        (E.props || []).forEach(function (pr) { (pr.solid || []).forEach(function (s) { if (!open(s[0], s[1])) out.push(id + ': ' + pr.art + ' on a solid tile at ' + s); }); });
      });
      if (!henWay(worlds['verdance-village'].collisions)) out.push('hen: no way round Brambleford between her points');
      [['mailcoach', COACH.slice(1, -1), 'verdance-village'], ['stag', STAG, 'sylvara']].forEach(function (r) {
        var C = worlds[r[2]].collisions, P = r[1];
        for (var j = 0; j < P.length - 1; j++) {
          var a = P[j], b = P[j + 1], n = Math.ceil(dist(a, b) * 3);
          for (var k = 0; k <= n; k++) { var x = Math.round(a[0] + (b[0] - a[0]) * k / n), y = Math.round(a[1] + (b[1] - a[1]) * k / n); if (C[y] && C[y][x] === 1) { out.push(r[0] + ': its way crosses a solid tile at ' + x + ',' + y); break; } }
        }
      });
      return out;
    });
  }

  return {
    decorate: decorate, screens: screens,
    live: function (worldId) { return liveIn(worldId || wid(), now()).map(function (p) { return { id: p.E.id, name: p.E.name, start: p.start, end: p.end }; }); },
    EV: EV, _force: force, _schedule: schedule, _check: check, _running: function () { return Object.keys(running); },
    _clear: function () { forced = null; lastCheck = 0; }
  };
})();
