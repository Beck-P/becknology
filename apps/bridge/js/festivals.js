/**
 * BridgeFestivals — a festival a season, on each planet's own calendar (assets/festivals.json).
 *
 * Beck: festivals. A planet keeps one a season, on the weekend (Saturday and Sunday, Eastern time) of that season's
 * last week: Verdance's seasons are a week long, so it has one every weekend; Lumar's are two, so every other. For
 * those two days the place dresses up (props put up, solid while they stand; on Lumar, lanterns on the water after
 * dark), its people gather there through the festival's hours (js/routines.js asks for their day, reworked), a stall
 * sells what's only to be had then, and there's a contest:
 *
 *   show    the Harvest Fair: hand the judge produce from your pack; each is scored for its kind and how fine it is,
 *           against the village's own entries (the same for everyone that day). Your best counts.
 *   derby   Lantern Tide: the biggest fish you land on Lumar while it's on, against the old hands' catches.
 *
 * A placing pays once (better placings pay the difference): coins and a rosette. Landing on the planet says what's
 * on, and in the three days before, what's coming. A paper lantern from the Lantern Tide stall, used at the water,
 * goes out on the tide with the rest.
 *
 * BridgeFestivals.on(planet?) → [{ id, name, … }] on now · next(id) → ms until it next begins (0 if on)
 * timetable(id, day, planet) → someone's day with the festival's hours worked in, or null (js/routines.js)
 * crowd(worldId) → ids of people who gather in that place today · caught(fishId, cm) (js/fishing.js)
 */
var BridgeFestivals = (function () {
  var F = {}, KEY = 'bridge_festivals', DAY = 86400000, H = 3600000;
  var mem = {};
  try { mem = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { mem = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* private mode */ } }
  fetch('/bridge/assets/festivals.json?v=' + Date.now()).then(function (r) { return r.json(); })
    .then(function (d) { F = d; delete F._doc; }).catch(function () { F = {}; });

  var Cl = function () { return typeof BridgeClock !== 'undefined' ? BridgeClock : null; };
  function now() { var C = Cl(); return C && C.now ? C.now() : Date.now(); }

  // ---- the calendar -------------------------------------------------------------------------------------------------
  // the planet's season at a moment, as js/clock.js counts it: { id, week (into it), weeks }
  function seasonAt(planet, ms) {
    var C = Cl(), P = C && C.PLANETS[planet];
    if (!P || !P.year || P.year === 'moon') return null;
    var weekF = (C.etAt(ms) / DAY + 3) / 7;                      // weeks since a Monday
    var len = P.year.reduce(function (a, s) { return a + s[1]; }, 0);
    var pos = (((weekF + (P.offset || 0)) % len) + len) % len, at = 0;
    for (var i = 0; i < P.year.length; i++) {
      var s = P.year[i];
      if (pos < at + s[1] || i === P.year.length - 1) return { id: s[0], week: Math.floor(pos - at), weeks: s[1] };
      at += s[1];
    }
    return null;
  }
  function dow(ms) { return (new Date(Cl().etAt(ms)).getUTCDay() + 6) % 7; }           // Monday 0 … Sunday 6
  function isOn(f, ms) {
    if (!Cl()) return false;
    var S = seasonAt(f.planet, ms);
    return !!S && S.id === f.season && S.week === S.weeks - 1 && dow(ms) >= 5;
  }
  /** The festivals on now (on a planet, or anywhere). */
  function on(planet) {
    var t = now();
    return Object.keys(F).filter(function (id) { return (!planet || F[id].planet === planet) && isOn(F[id], t); })
      .map(function (id) { return Object.assign({ id: id }, F[id]); });
  }
  /** ms until a festival next begins (0 while it's on), looking up to sixteen weeks ahead. */
  function next(id) {
    var f = F[id], t = now();
    if (!f || !Cl()) return null;
    if (isOn(f, t)) return 0;
    var startOfDay = t - (Cl().etAt(t) % DAY + DAY) % DAY;
    for (var d = 1; d < 112; d++) if (isOn(f, startOfDay + d * DAY + H)) return startOfDay + d * DAY - t;
    return null;
  }
  // this weekend's festival, by the Saturday it began (what's won is kept per festival weekend)
  function occurrence(id) {
    var t = now(), et = Cl().etAt(t), sat = Math.floor(et / DAY) - (dow(t) - 5);
    return id + '@' + sat;
  }
  // whether it's open this hour of the planet's day (its hours, by the anchors)
  function hoursOf(f) {
    var A = BridgeHours.anchors(f.planet), a = A[f.hours[0]], b = A[f.hours[1]];
    return { from: a, to: b, len: A.len };
  }
  function openNow(f) {
    if (!isOn(f, now()) || typeof BridgeHours === 'undefined') return false;
    var h = hoursOf(f), T = Cl().time(f.planet).hours;
    return h.from <= h.to ? (T >= h.from && T < h.to) : (T >= h.from || T < h.to);
  }

  // ---- people: their day, worked round the festival ------------------------------------------------------------------
  /** Who gathers in a place while a festival there is on today: [id]. */
  function crowd(worldId) {
    var out = [];
    on().forEach(function (f) { if (f.world === worldId && f.crowd) out = out.concat(Object.keys(f.crowd)); });
    return out;
  }
  /** Someone's day (js/routines.js: [[anchor, where, opts], …]) with the festival's hours given to it, or null. */
  function timetable(id, day, planet) {
    var f = on(planet).filter(function (x) { return x.crowd && x.crowd[id]; })[0];
    if (!f || typeof BridgeHours === 'undefined') return null;
    var A = BridgeHours.anchors(planet), h = hoursOf(f), c = f.crowd[id];
    var spot = { world: f.world, x: c[0], y: c[1], facing: c[2] || 'down', pose: c[3] };
    var inside = function (t) { return h.from <= h.to ? (t >= h.from && t < h.to) : (t >= h.from || t < h.to); };
    var times = (day || []).map(function (e) { return { t: typeof e[0] === 'number' ? e[0] * A.len : A[e[0]], e: e }; })
      .sort(function (a, b) { return a.t - b.t; });
    var at = function (t) {                                      // the stop they'd be at, at hour t, without the festival
      var best = null;
      times.forEach(function (x) { if (x.t <= t) best = x.e; });
      return best || (times.length ? times[times.length - 1].e : [0, 'home']);
    };
    var out = times.filter(function (x) { return !inside(x.t); }).map(function (x) { return [x.t / A.len, x.e[1], x.e[2]]; });
    var after = at(h.to);
    out.push([h.from / A.len, spot], [h.to / A.len, after[1], after[2]]);
    return out.sort(function (a, b) { return a[0] - b[0]; });
  }

  // ---- the place: props, contest and stall, put up as it loads -------------------------------------------------------
  var here = null;                                                // { f, world }
  function decorate(worldId, data) {
    here = null;
    var f = on(Cl() ? Cl().planet(worldId) : null).filter(function (x) { return x.world === worldId; })[0];
    if (f && data.interactions) {
      here = { f: f, data: data };
      (f.props || []).forEach(function (p) { if (data.collisions && data.collisions[p[2]]) data.collisions[p[2]][p[1]] = 1; });
      if (f.contest) data.interactions.push({ x: f.contest.at[0], y: f.contest.at[1], type: 'fest_' + f.contest.kind, label: f.contest.label, festival: f.id, prompt: 'PRESS E' });
      if (f.stall) data.interactions.push({ x: f.stall.at[0], y: f.stall.at[1], type: 'vendor', label: f.stall.label, prompt: 'PRESS E TO BUY', items: f.stall.items, festival: f.id });
    }
    tell(worldId);
  }
  // landing on a planet: what's on, or coming (once a day each), after the place's own arrival notes have had their turn
  function tell(worldId) { setTimeout(function () { telling(worldId); }, 4600); }
  function telling(worldId) {
    var C = Cl(), planet = C && C.planet(worldId), t = now();
    if (!planet || typeof BridgeQuests === 'undefined' || !BridgeQuests.toast) return;
    var today = Math.floor(C.etAt(t) / DAY);
    mem.told = mem.told || {};
    Object.keys(F).forEach(function (id) {
      var f = F[id];
      if (f.planet !== planet || mem.told[id] === today) return;
      if (isOn(f, t)) {
        mem.told[id] = today; save();
        BridgeQuests.toast(f.name.toUpperCase(), f.line, (dow(t) === 5 ? 'Today and tomorrow' : 'Today, its last day') + ' · ' + f.place, false);
      } else {
        var n = next(id);
        if (n != null && n < 3 * DAY) {
          mem.told[id] = today; save();
          var d = Math.ceil(n / DAY);
          BridgeQuests.toast('COMING UP', f.name, (d <= 1 ? 'Tomorrow' : 'In ' + d + ' days') + ', this weekend · ' + f.place, false);
        }
      }
    });
  }

  // ---- contests ------------------------------------------------------------------------------------------------------
  function rnd(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; }
  function rec(f) { var k = occurrence(f.id); mem[k] = mem[k] || { best: 0, what: null, paid: 0, n: 0 }; return mem[k]; }
  function itemName(id) { var it = typeof BridgeItems !== 'undefined' && BridgeItems.get(id); return it ? it.name : id.replace(/_/g, ' '); }
  function standings(f) {
    var k = occurrence(f.id), c = f.contest, R = rec(f);
    var field = c.rivals.map(function (r, i) {
      var q = rnd(k + ':' + i);
      return c.kind === 'show' ? { who: r[0], what: itemName(r[1]), score: Math.round(c.entries[r[1]] * (0.7 + 0.6 * q) * 10) / 10 }
                               : { who: r[0], what: itemName(r[1]), score: Math.round(r[2] + q * (r[3] - r[2])) };
    });
    if (R.best) field.push({ who: 'You', what: R.what, score: R.best, you: true });
    field.sort(function (a, b) { return b.score - a.score; });
    return field;
  }
  function rankOf(f) { var s = standings(f); for (var i = 0; i < s.length; i++) if (s[i].you) return i + 1; return 0; }
  function board(f) {
    var unit = f.contest.kind === 'show' ? ' pts' : ' cm';
    return standings(f).map(function (s, i) { return '• ' + ['1ST', '2ND', '3RD', '4TH', '5TH'][i] + '  ' + (s.you ? 'YOU' : s.who.toUpperCase()) + ' — ' + s.what.toUpperCase() + ', ' + s.score + unit.toUpperCase(); }).join('\n');
  }
  // a placing pays once; a better one later pays the difference
  function pay(f) {
    var R = rec(f), r = rankOf(f), P = f.contest.prizes;
    if (!r || r > P.length || (R.paid && R.paid <= r)) return null;
    var was = R.paid ? P[R.paid - 1][0] : 0, prize = P[r - 1];
    R.paid = r; save();
    if (typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins) BridgeProgression.awardCoins(prize[0] - was, 'festival:' + f.id);
    if (typeof BridgeInventory !== 'undefined') (BridgeInventory.give || BridgeInventory.addItem)(prize[1], 1);
    if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx('coin');
    return ['FIRST', 'SECOND', 'THIRD'][r - 1] + ' PLACE: ' + (prize[0] - was) + ' COINS AND A ' + itemName(prize[1]).toUpperCase() + '.';
  }
  function festOf(inter) { var f = F[inter.festival]; return f ? Object.assign({ id: inter.festival }, f) : null; }
  function closedText(f) {
    var h = hoursOf(f), C = Cl();
    return 'IT\'S NOT OPEN JUST NOW. ' + f.name.toUpperCase() + ' RUNS ' + C.fmtHours(h.from) + '–' + C.fmtHours(h.to) + ' BY THE ' + f.planet.toUpperCase() + ' CLOCK, SATURDAY AND SUNDAY.';
  }

  function show(inter, note) {
    var f = festOf(inter);
    if (!f) return;
    var c = f.contest, I = BridgeInteractions;
    if (!openNow(f)) { I.say(c.label, closedText(f)); return; }
    var rows = Object.keys(c.entries).filter(function (id) { return BridgeInventory.getCount(id) > 0; }).map(function (id) {
      return { label: 'Enter ' + itemName(id).toLowerCase(), sub: 'you have ' + BridgeInventory.getCount(id), icon: id, pick: function () { judge(inter, f, id); } };
    });
    I.choose({ title: f.name + ' · the produce show', text: (note ? note + '\n\n' : '') + c.judge.toUpperCase() + ' WEIGHS IT, SNIFFS IT, HOLDS IT TO THE LIGHT. YOUR BEST ENTRY COUNTS.\n\n' + board(f) +
      (rows.length ? '' : '\n\nBRING PRODUCE TO ENTER: ' + Object.keys(c.entries).slice(0, 5).map(itemName).join(', ').toUpperCase() + '…'), rows: rows, closeLabel: 'Leave' });
  }
  function judge(inter, f, id) {
    var R = rec(f), c = f.contest;
    if (!BridgeInventory.removeItem(id, 1)) return show(inter);
    R.n++;
    var q = rnd(occurrence(f.id) + ':you:' + id + ':' + R.n), score = Math.round(c.entries[id] * (0.7 + 0.6 * q) * 10) / 10;
    var line = c.judge.toUpperCase() + ' TURNS YOUR ' + itemName(id).toUpperCase() + ' OVER. ' + score + ' POINTS' + (q > 0.8 ? ' - A FINE ONE.' : q < 0.25 ? ' - IT\'S SEEN BETTER DAYS.' : '.');
    if (score > R.best) { R.best = score; R.what = itemName(id); }
    save();
    var paid = pay(f);
    show(inter, line + (paid ? '\n' + paid : ''));
  }

  function derby(inter) {
    var f = festOf(inter);
    if (!f) return;
    var R = rec(f), paid = pay(f);
    BridgeInteractions.say(f.contest.label, 'THE BIGGEST FISH LANDED ON LUMAR THIS LANTERN TIDE. ' + f.contest.judge.toUpperCase() + ' CHALKS THEM UP.\n\n' + board(f) +
      (paid ? '\n\n' + paid : R.best ? '' : '\n\nFISH ANYWHERE ON LUMAR WHILE IT\'S ON. YOUR BIGGEST GOES ON THE BOARD.'));
  }
  /** A fish landed (js/fishing.js): on the board, if a derby's on where it was caught. */
  function caught(fishId, cm) {
    var C = Cl(), wid = typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId && BridgeWorld.getWorldId();
    var planet = C && C.planet(wid || 'lumar');
    on(planet).forEach(function (f) {
      if (!f.contest || f.contest.kind !== 'derby') return;
      var R = rec(f);
      if (cm <= R.best) return;
      var before = rankOf(f);
      R.best = cm; R.what = itemName(fishId); save();
      var r = rankOf(f);
      if (r && r !== before && typeof BridgeQuests !== 'undefined')
        BridgeQuests.toast(f.name.toUpperCase(), cm + ' cm - ' + (r === 1 ? 'that leads the derby!' : 'that\'s ' + ['first', 'second', 'third', 'fourth'][r - 1] + ' on the board'), 'Show it at the derby board on ' + f.place, false);
    });
  }

  // ---- festival things to buy ----------------------------------------------------------------------------------------
  function px(ctx, x, y, u, c, rs) { ctx.fillStyle = c; rs.forEach(function (r) { ctx.fillRect(x + r[0] * u, y + r[1] * u, r[2] * u, r[3] * u); }); }
  function rosette(face, dark) {
    return function (ctx, x, y, s) {
      var u = s / 16;
      px(ctx, x, y, u, dark, [[5, 10, 2, 5], [9, 10, 2, 5], [4, 3, 8, 8], [3, 4, 10, 6]]);
      px(ctx, x, y, u, face, [[5, 4, 6, 6], [4, 5, 8, 4], [6, 11, 1, 3], [9, 11, 1, 3]]);
      px(ctx, x, y, u, '#fff4d0', [[7, 6, 2, 2]]);
    };
  }
  var NEW = {
    apple_pie: { name: 'Apple Pie', desc: 'Bridget\'s, from the fair stall. Still warm through the paper.', type: 'food', effects: { hp: 25, energy: 25 }, value: 4,
      draw: function (ctx, x, y, s) { var u = s / 16; px(ctx, x, y, u, '#5a3018', [[2, 7, 12, 6]]); px(ctx, x, y, u, '#d89848', [[3, 7, 10, 5]]); px(ctx, x, y, u, '#f0c070', [[3, 7, 10, 2], [5, 10, 1, 1], [9, 10, 1, 1]]); px(ctx, x, y, u, '#a03020', [[7, 9, 2, 1]]); } },
    cider: { name: 'Cider', desc: 'Cloudy, cold and sharp. Pressed in Brambleford.', type: 'drink', effects: { energy: 30 }, value: 3,
      draw: function (ctx, x, y, s) { var u = s / 16; px(ctx, x, y, u, '#3a2410', [[5, 3, 6, 11]]); px(ctx, x, y, u, '#e0a030', [[6, 6, 4, 7]]); px(ctx, x, y, u, '#f8f0d8', [[6, 4, 4, 2]]); px(ctx, x, y, u, '#fff0a0', [[7, 7, 1, 4]]); } },
    toffee_apple: { name: 'Toffee Apple', desc: 'Glassy brown toffee on a red apple, on a stick.', type: 'food', effects: { energy: 15 }, value: 2,
      draw: function (ctx, x, y, s) { var u = s / 16; px(ctx, x, y, u, '#a07040', [[7, 2, 2, 5]]); px(ctx, x, y, u, '#5a2010', [[4, 6, 8, 8]]); px(ctx, x, y, u, '#c04020', [[5, 7, 6, 6]]); px(ctx, x, y, u, '#e0a050', [[5, 7, 6, 2]]); px(ctx, x, y, u, '#fff0c0', [[6, 8, 1, 1]]); } },
    lantern_cake: { name: 'Lantern Cake', desc: 'Honey cake with a candied orange slice on top, for Lantern Tide.', type: 'food', effects: { hp: 20, energy: 20 }, value: 4,
      draw: function (ctx, x, y, s) { var u = s / 16; px(ctx, x, y, u, '#5a3018', [[3, 7, 10, 7]]); px(ctx, x, y, u, '#d8a050', [[4, 8, 8, 5]]); px(ctx, x, y, u, '#f0d090', [[4, 8, 8, 1]]); px(ctx, x, y, u, '#f08020', [[6, 5, 4, 3]]); px(ctx, x, y, u, '#ffd060', [[7, 6, 2, 1]]); } },
    paper_lantern: { name: 'Paper Lantern', desc: 'Oiled paper on a cane frame, a stub of candle inside. Use it at the water while Lantern Tide is on and it goes out on the tide.', type: 'tool', value: 3,
      draw: function (ctx, x, y, s) { var u = s / 16; px(ctx, x, y, u, '#6a2a10', [[5, 3, 6, 11], [4, 4, 8, 9]]); px(ctx, x, y, u, '#f0a040', [[5, 4, 6, 9]]); px(ctx, x, y, u, '#ffd070', [[6, 6, 4, 5]]); px(ctx, x, y, u, '#fff4c0', [[7, 7, 2, 3]]); px(ctx, x, y, u, '#3a2010', [[6, 2, 4, 1], [6, 14, 4, 1]]); },
      onUse: function () { return release(); } },
    blue_rosette: { name: 'Blue Rosette', desc: 'First prize, pinned with a festival\'s name on the tails.', type: 'trophy', value: 60, draw: rosette('#4080e0', '#1a2a6a') },
    red_rosette: { name: 'Red Rosette', desc: 'Second prize, pinned with a festival\'s name on the tails.', type: 'trophy', value: 30, draw: rosette('#e04040', '#6a1a1a') },
    yellow_rosette: { name: 'Yellow Rosette', desc: 'Third prize, pinned with a festival\'s name on the tails.', type: 'trophy', value: 15, draw: rosette('#f0c040', '#6a4a10') }
  };
  function eat() {
    var e = this.effects || {};
    if (e.hp) BridgeInventory.restoreHP(e.hp);
    if (e.energy) BridgeInventory.restoreEnergy(e.energy);
    if (typeof BridgeFX !== 'undefined' && BridgeFX.spawnFloatingText && typeof BridgeCharacter !== 'undefined')
      BridgeFX.spawnFloatingText(BridgeCharacter.getX(), BridgeCharacter.getY() - 0.25, e.hp ? '+' + e.hp + ' HP' : '+' + e.energy + ' EN', e.hp ? '#68e890' : '#60c8ff');
    return true;
  }
  function addItems() {
    if (typeof BridgeItems === 'undefined' || !BridgeItems.all) return;
    var all = BridgeItems.all();
    Object.keys(NEW).forEach(function (id) {
      if (all[id]) return;
      var it = Object.assign({ id: id, stackable: true }, NEW[id]);
      if (it.effects && !it.onUse) it.onUse = eat;
      all[id] = it;
    });
  }
  addItems();

  // ---- lanterns on the water (Lantern Tide, after dark) --------------------------------------------------------------
  var mine = [];                                                  // lanterns you've set out tonight: { x, y, at }
  function release() {
    var f = here && here.f;
    if (!f || !f.lanterns || !openNow(f) || typeof BridgeCharacter === 'undefined') {
      if (typeof BridgeQuests !== 'undefined') BridgeQuests.toast('PAPER LANTERN', 'Keep it for Lantern Tide', 'At the water on Crownhaven quay, after dark', false);
      return false;
    }
    var x = BridgeCharacter.getX(), y = BridgeCharacter.getY(), L = f.lanterns;
    if (y < L.y[0] - 3) {
      if (typeof BridgeQuests !== 'undefined') BridgeQuests.toast('PAPER LANTERN', 'Go down to the water', 'The edge of the quay', false);
      return false;
    }
    mine.push({ x: x, y: L.y[0], at: Date.now() });
    if (typeof BridgeQuests !== 'undefined') BridgeQuests.toast('LANTERN TIDE', 'Your lantern goes out on the tide', 'For everyone the sea has kept', false);
    return true;
  }
  // a lantern, a few native px: candle-warm paper, a bright core (it glows on the card, js/gpu.js), its light on the water
  function lantern(ctx, x, y, u, a, flick) {
    ctx.globalAlpha = a * 0.35;
    px(ctx, x, y, u, '#f0a040', [[-1, 3, 4, 1], [0, 5, 2, 1]]);
    ctx.globalAlpha = a;
    px(ctx, x, y, u, '#6a2a10', [[-1, -2, 4, 4]]);
    px(ctx, x, y, u, '#f0a040', [[-1, -1, 4, 2], [0, -2, 2, 4]]);
    px(ctx, x, y, u, flick > 0.5 ? '#fff4c0' : '#ffd070', [[0, -1, 2, 2]]);
    ctx.globalAlpha = 1;
  }
  function water(ctx, world, offX, offY, ts, nowMs) {
    var f = here && here.data === world && here.f;
    if (!f || !f.lanterns || !openNow(f)) return;
    var L = f.lanterns, h = hoursOf(f), T = Cl().time(f.planet), u = ts / 16;
    var since = ((T.hours - h.from) + h.len) % h.len * H;          // ms since this evening's opening
    var out = [];
    for (var i = 0; i < L.n; i++) {
      var r = rnd(f.id + ':l' + i), r2 = rnd(f.id + ':m' + i), launched = r * 1.5 * H;           // set out over the first hour and a half
      var x = L.x[0] + r2 * (L.x[1] - L.x[0]);
      if ((L.skip || []).some(function (s) { return x >= s[0] && x <= s[1]; })) continue;
      out.push({ x: x, y: L.y[0], t: since - launched, i: i });
    }
    mine.forEach(function (m, i) { out.push({ x: m.x, y: m.y, t: Date.now() - m.at, i: 1000 + i }); });
    out.forEach(function (o) {
      if (o.t < 0) return;
      var y = o.y + o.t / 1000 * 0.0016, drift = Math.sin(o.t / 9000 + o.i) * 0.6;         // out on the tide, a tile every ten minutes
      if (y > L.y[1]) return;
      var a = Math.min(1, o.t / 4000) * Math.min(1, (L.y[1] - y) / 3);
      var bob = Math.sin(nowMs / 700 + o.i * 1.7) * u, flick = (Math.sin(nowMs / 130 + o.i * 3.1) + 1) / 2;
      lantern(ctx, Math.round(offX + (o.x + drift + 0.5) * ts), Math.round(offY + (y + 0.5) * ts + bob), u, a, flick);
    });
  }

  // ---- the props: drawn once each, then stood in the scene like anyone else (depth-tested and lit) -------------------
  var art = {};
  function prop(kind) {
    if (art[kind]) return art[kind];
    var u = 2, c = document.createElement('canvas'), w = 32, h = 48;
    c.width = w; c.height = h;
    var x = c.getContext('2d'), P = function (col, rs) { px(x, 0, 0, u, col, rs); };
    var o = '#2a1808';
    if (kind === 'show_table') {                                  // a trestle under a white cloth, a ribbon board behind
      P(o, [[0, 13, 16, 7], [1, 20, 2, 4], [13, 20, 2, 4]]);
      P('#e8e0d0', [[0, 14, 16, 4]]); P('#ffffff', [[0, 14, 16, 1]]); P('#4060c0', [[0, 17, 16, 1]]); P('#5a3a1a', [[1, 19, 14, 1], [2, 20, 1, 3], [13, 20, 1, 3]]);
      P(o, [[5, 9, 6, 6]]); P('#e07020', [[6, 10, 4, 4]]); P('#b05010', [[7, 10, 1, 4]]); P('#50a040', [[8, 9, 1, 1]]);
    } else if (kind === 'stall') {                                 // a counter under a striped awning on two poles
      P(o, [[1, 4, 1, 20], [14, 4, 1, 20], [0, 2, 16, 5], [0, 15, 16, 5]]);
      P('#f0e8d8', [[0, 3, 16, 3]]); P('#c04040', [[0, 3, 2, 3], [4, 3, 2, 3], [8, 3, 2, 3], [12, 3, 2, 3]]); P('#f0e8d8', [[1, 6, 1, 1], [5, 6, 1, 1], [9, 6, 1, 1], [13, 6, 1, 1]]);
      P('#8a5a2a', [[0, 16, 16, 3]]); P('#b07a3a', [[0, 16, 16, 1]]); P('#5a3a1a', [[1, 19, 14, 5]]);
      P('#e0a040', [[2, 14, 3, 2], [6, 14, 3, 2]]); P('#f08020', [[11, 13, 2, 3]]);
    } else if (kind === 'hay') {                                   // a bale, twine round it
      P(o, [[1, 14, 14, 10]]); P('#d8b050', [[2, 15, 12, 8]]); P('#f0d070', [[2, 15, 12, 2]]); P('#a88030', [[3, 18, 10, 1], [4, 20, 8, 1]]); P('#6a4a1a', [[5, 15, 1, 8], [10, 15, 1, 8]]);
    } else if (kind === 'pumpkins') {                              // three, a big one at the back
      P(o, [[3, 13, 10, 7], [1, 18, 7, 6], [8, 18, 7, 6]]);
      P('#e07020', [[4, 14, 8, 5], [2, 19, 5, 4], [9, 19, 5, 4]]); P('#f09040', [[4, 14, 8, 1], [2, 19, 5, 1], [9, 19, 5, 1]]);
      P('#b05010', [[7, 14, 1, 5], [4, 19, 1, 4], [11, 19, 1, 4]]); P('#50a040', [[7, 12, 2, 2], [4, 17, 1, 2], [11, 17, 1, 2]]);
    } else if (kind === 'derby_board') {                           // a chalk board on posts, a fish painted at the top
      P(o, [[2, 4, 12, 12], [3, 16, 1, 8], [12, 16, 1, 8]]); P('#2a3a2a', [[3, 5, 10, 10]]); P('#e8e8d8', [[4, 9, 6, 1], [4, 11, 7, 1], [4, 13, 5, 1]]);
      P('#80b0c0', [[5, 6, 5, 2]]); P('#5a8090', [[10, 6, 2, 2]]); P('#6a4a2a', [[3, 16, 1, 8], [12, 16, 1, 8]]);
    }
    art[kind] = c;
    return c;
  }
  function props(world, offX, offY, ts, nowMs, sc) {
    var f = here && here.data === world && here.f;
    if (!f || !sc || typeof BridgeScene === 'undefined') return [];
    return (f.props || []).map(function (p) {
      var c = prop(p[0]), footRow = p[2] + 0.95;
      return { footRow: footRow, draw: function (ctx) {
        var dx = Math.round(offX + p[1] * ts), dy = Math.round(offY + (p[2] + 1) * ts) - c.height;
        BridgeScene.drawOccluded(ctx, sc, c, 0, 0, c.width, c.height, dx, dy, footRow, offX, offY, BridgeScene.tintAt(sc, world, p[1], p[2], nowMs), null);
      } };
    });
  }

  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('*', { ground: water, items: props });
  if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.register) {
    BridgeInteractions.register('fest_show', show, 'Enter');
    BridgeInteractions.register('fest_derby', derby, 'Read');
  }

  // ---- the tests: every festival's props on open ground, and with them up, its crowd's spots and its counters
  //      still in reach of where you arrive
  function check() {
    var out = [];
    return Promise.all(Object.keys(F).map(function (id) {
      var f = F[id];
      return fetch('/bridge/assets/worlds/' + f.world + '.json').then(function (r) { return r.json(); }).then(function (d) {
        var C = d.collisions.map(function (row) { return row.slice(); }), W = d.width, Hh = d.height;
        (f.props || []).forEach(function (p) { if (C[p[2]][p[1]] === 1) out.push(id + ': ' + p[0] + ' at ' + p[1] + ',' + p[2] + ' on a solid tile'); C[p[2]][p[1]] = 1; });
        var start = (d.spawns && d.spawns.player) || [0, 0], seen = {}, q = [start];
        seen[start] = 1;
        for (var i = 0; i < q.length; i++) [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (s) {
          var n = [q[i][0] + s[0], q[i][1] + s[1]];
          if (n[0] < 0 || n[1] < 0 || n[0] >= W || n[1] >= Hh || seen[n] || C[n[1]][n[0]] === 1) return;
          seen[n] = 1; q.push(n);
        });
        var near = function (x, y) { return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (s) { return seen[[x + s[0], y + s[1]]]; }); };
        Object.keys(f.crowd || {}).forEach(function (who) {
          var c = f.crowd[who];
          if (C[c[1]][c[0]] === 1) out.push(id + ': ' + who + ' stands on a solid tile');
          else if (!seen[[c[0], c[1]]]) out.push(id + ': ' + who + '\'s spot is out of reach');
        });
        if (f.contest && !near(f.contest.at[0], f.contest.at[1])) out.push(id + ': the ' + f.contest.label.toLowerCase() + ' is out of reach');
        if (f.stall && !near(f.stall.at[0], f.stall.at[1])) out.push(id + ': the ' + f.stall.label.toLowerCase() + ' is out of reach');
      });
    })).then(function () { return out; });
  }

  return { on: on, next: next, timetable: timetable, crowd: crowd, decorate: decorate, caught: caught, open: openNow,
           all: function () { return F; }, _occurrence: occurrence, _check: check };
})();
