/**
 * BridgeFestivals — a festival a season, on each planet's own calendar (assets/festivals.json).
 *
 * Beck: festivals — "one per planet per season… the place dresses up, limited stock, contests". A planet keeps one a
 * season, on the weekend (Saturday and Sunday, Eastern time) of that season's last week: Verdance's seasons are a week
 * long, so it has one every weekend (the Blossom Show, the Strawberry Supper, the Harvest Fair, the Cellar Fair);
 * Lumar's are two, so every other (the Blessing of the Fleet, Bloom Night, Lantern Tide); Hoarfell's long winter ends in
 * the Ice Fair. Two keep other calendars (`when`): Sylvara's Moonwell's Night while the real moon is full, and Lumar's
 * Bloom Night on a spore bloom day in its summer (js/bloom.js; a summer with none keeps its last weekend). While one's on
 * the place dresses up (props put up, solid while they stand, drawn in code below; on Lantern Tide, lanterns on the water
 * after dark), its people gather there through the festival's hours (js/routines.js asks for their day, reworked), a
 * stall sells what's only to be had then, and there are contests:
 *
 *   show    hand the judge something from your pack; each is scored for its kind (`entries`) and how fine it is
 *           (±30%), against the locals' own entries (the same for everyone that festival). Your best counts.
 *   derby   the biggest fish you land on the planet while it's on, against the old hands' catches — by centimetres, or
 *           (`score: 'kind'`) against the biggest of its kind, out of 100, so a fat silverfin beats a thin tuna.
 *   times   your quickest run of a ski run on Hoarfell while it's on (js/ski.js tells us), against posted times.
 *
 * A placing pays once (better placings pay the difference): coins and a rosette. Rosettes can be pinned on the roll of
 * honour at any contest; each one pinned takes 5% off at every festival stall, up to 30%. Landing on the planet says
 * what's on, and in the three days before, what's coming; so do the Journal's Next up, the Map's Come back for, and the
 * planet's notice boards (js/boards.js reads `posters`). A paper lantern from the Lantern Tide stall, used at the water,
 * goes out on the tide with the rest.
 *
 * BridgeFestivals.on(planet?) → [{ id, name, … }] on now · next(id) → ms until it next begins (0 if on)
 * timetable(id, day, planet) → someone's day with the festival's hours worked in, or null (js/routines.js)
 * crowd(worldId) → ids of people who gather in that place today · caught(fishId, cm, min, max) (js/fishing.js)
 * timed(runId, seconds) (js/ski.js) · posters(planet) → lines for the boards · nextUp() → Journal lines
 * soon(worldId) → Come back for lines (js/map.js) · USES → what the festival things are for (js/uses.js)
 */
var BridgeFestivals = (function () {
  var F = {}, KEY = 'bridge_festivals', DAY = 86400000, H = 3600000;
  var mem = {};
  try { mem = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { mem = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* private mode */ } }
  fetch('/bridge/assets/festivals.json?v=' + Date.now()).then(function (r) { return r.json(); })
    .then(function (d) {
      delete d._doc;
      Object.keys(d).forEach(function (id) { var f = d[id]; f.contests = f.contests || (f.contest ? [f.contest] : []); f.contest = f.contests[0]; });
      F = d;
    }).catch(function () { F = {}; });

  var Cl = function () { return typeof BridgeClock !== 'undefined' ? BridgeClock : null; };
  function now() { var C = Cl(); return C && C.now ? C.now() : Date.now(); }

  // ---- the calendar -------------------------------------------------------------------------------------------------
  // the planet's season at a moment, as js/clock.js counts it: { id, week (into it), weeks, start (its first ET day) }
  function seasonAt(planet, ms) {
    var C = Cl(), P = C && C.PLANETS[planet];
    if (!P || !P.year || P.year === 'moon') return null;
    var weekF = (C.etAt(ms) / DAY + 3) / 7;                      // weeks since a Monday
    var len = P.year.reduce(function (a, s) { return a + s[1]; }, 0);
    var pos = (((weekF + (P.offset || 0)) % len) + len) % len, at = 0;
    for (var i = 0; i < P.year.length; i++) {
      var s = P.year[i];
      if (pos < at + s[1] || i === P.year.length - 1) return { id: s[0], week: Math.floor(pos - at), weeks: s[1], start: Math.round((weekF - (pos - at)) * 7 - 3) };
      at += s[1];
    }
    return null;
  }
  function dow(ms) { return (new Date(Cl().etAt(ms)).getUTCDay() + 6) % 7; }           // Monday 0 … Sunday 6
  // whether a season (from its first ET day, so many weeks) has a spore bloom day in it
  var blooms = {};
  function bloomIn(S) {
    if (typeof BridgeBloom === 'undefined' || !BridgeBloom.day) return false;
    if (blooms[S.start] == null) {
      blooms[S.start] = false;
      for (var d = S.start; d < S.start + S.weeks * 7; d++) if (BridgeBloom.day(d * DAY + 5 * H)) { blooms[S.start] = true; break; }
    }
    return blooms[S.start];
  }
  function isOn(f, ms) {
    var C = Cl();
    if (!C) return false;
    if (f.when === 'fullmoon') return !!(C.moon && C.moon(ms).full);
    var S = seasonAt(f.planet, ms);
    if (!S || S.id !== f.season) return false;
    if (f.when === 'bloom' && bloomIn(S)) return BridgeBloom.day(ms);
    return S.week === S.weeks - 1 && dow(ms) >= 5;
  }
  /** The festivals on now (on a planet, or anywhere). */
  function on(planet) {
    var t = now();
    return Object.keys(F).filter(function (id) { return (!planet || F[id].planet === planet) && isOn(F[id], t); })
      .map(function (id) { return Object.assign({ id: id }, F[id]); });
  }
  /** ms until a festival next begins (0 while it's on), looking up to sixteen weeks ahead (three-hour steps of ET). */
  var nextMemo = {};
  function next(id) {
    var f = F[id], t = now(), C = Cl();
    if (!f || !C) return null;
    if (isOn(f, t)) return 0;
    var m = nextMemo[id], et = C.etAt(t), base = t - (et % (3 * H) + 3 * H) % (3 * H);
    if (m && m.base === base) return m.at == null ? null : m.at - t;
    var at = null;
    for (var k = 1; k < 112 * 8; k++) if (isOn(f, base + k * 3 * H + 60000)) { at = base + k * 3 * H; break; }
    nextMemo[id] = { base: base, at: at };
    return at == null ? null : at - t;
  }
  // this festival's occurrence: the ET day it began (what's won is kept per occurrence; for a weekend, its Saturday)
  function occurrence(id) {
    var f = F[id], C = Cl(), t = now(), et = C.etAt(t), off = t - et, d = Math.floor(et / DAY);
    for (var k = 0; k < 6 && f && isOn(f, d * DAY - 60000 + off); k++) d--;
    return id + '@' + d;
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
  function whenText(f) {
    return f.when === 'fullmoon' ? 'WHILE THE MOON IS FULL' : f.when === 'bloom' ? 'ON A BLOOM NIGHT IN SUMMER (OR ITS LAST WEEKEND)' : 'SATURDAY AND SUNDAY';
  }

  // ---- people: their day, worked round the festival ------------------------------------------------------------------
  function absent(id) { return typeof BridgeVillage !== 'undefined' && BridgeVillage.absent && BridgeVillage.absent(id); }
  /** Who gathers in a place while a festival there is on today: [id]. */
  function crowd(worldId) {
    var out = [];
    on().forEach(function (f) { if (f.world === worldId && f.crowd) out = out.concat(Object.keys(f.crowd).filter(function (id) { return !absent(id); })); });
    return out;
  }
  /** Someone's day (js/routines.js: [[anchor, where, opts], …]) with the festival's hours given to it, or null. */
  function timetable(id, day, planet) {
    if (absent(id)) return null;                                  // (not before the village fund brings them: js/village.js)
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

  // ---- the roll of honour: rosettes pinned up, a discount at the stalls ---------------------------------------------
  var ROSETTES = ['blue_rosette', 'red_rosette', 'yellow_rosette'];
  function roll() { mem.roll = mem.roll || {}; return mem.roll; }
  function pinned() { var R = roll(); return ROSETTES.reduce(function (a, id) { return a + (R[id] || 0); }, 0); }
  function discount() { return Math.min(0.3, pinned() * 0.05); }
  function stallItems(f) {
    var d = discount();
    return (f.stall.items || []).map(function (x) { return { id: x.id, price: Math.max(1, Math.floor(x.price * (1 - d) + 1e-9)) }; });
  }
  function rollText() {
    var R = roll(), n = pinned();
    if (!n) return 'THE ROLL OF HONOUR HAS ROOM FOR YOUR ROSETTES. EVERY ONE PINNED UP TAKES 5% OFF AT THE FESTIVAL STALLS.';
    return 'ON THE ROLL OF HONOUR: ' + ROSETTES.filter(function (id) { return R[id]; }).map(function (id) { return R[id] + ' ' + itemName(id).replace(/ Rosette/, '').toUpperCase(); }).join(', ') +
      ' - ' + Math.round(discount() * 100) + '% OFF AT THE FESTIVAL STALLS' + (discount() >= 0.3 ? ' (AS FAR AS IT GOES)' : '') + '.';
  }
  function pinRows(again) {
    return ROSETTES.filter(function (id) { return typeof BridgeInventory !== 'undefined' && BridgeInventory.getCount(id) > 0; }).map(function (id) {
      return { label: 'Pin your ' + itemName(id).toLowerCase() + ' on the roll', sub: 'you have ' + BridgeInventory.getCount(id), icon: id, pick: function () {
        if (!BridgeInventory.removeItem(id, 1)) return again();
        roll()[id] = (roll()[id] || 0) + 1; save();
        if (here && here.data) (here.data.interactions || []).forEach(function (it) { if (it.type === 'vendor' && it.festival && F[it.festival]) it.items = stallItems(F[it.festival]); });
        if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx('pickup');
        again('PINNED UP WITH THE OTHERS, YOUR NAME ON THE TAILS.');
      } };
    });
  }

  // ---- the place: props, contests and stall, put up as it loads ------------------------------------------------------
  var here = null;                                                // { f, data }
  function decorate(worldId, data) {
    here = null;
    var f = on(Cl() ? Cl().planet(worldId) : null).filter(function (x) { return x.world === worldId; })[0];
    if (f && data.interactions) {
      here = { f: f, data: data };
      (f.props || []).forEach(function (p) { if (data.collisions && data.collisions[p[2]]) data.collisions[p[2]][p[1]] = 1; });
      (f.contests || []).forEach(function (c, i) {
        data.interactions.push({ x: c.at[0], y: c.at[1], type: 'fest_' + c.kind, label: c.label, festival: f.id, contest: i, prompt: 'PRESS E' });
      });
      if (f.stall) data.interactions.push({ x: f.stall.at[0], y: f.stall.at[1], type: 'vendor', label: f.stall.label, prompt: 'PRESS E TO BUY', items: stallItems(f), festival: f.id });
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
        BridgeQuests.toast(f.name.toUpperCase(), f.line, (isOn(f, t + DAY) ? 'Today and tomorrow' : 'Today, its last day') + ' · ' + f.place, false);
      } else {
        var n = next(id);
        if (n != null && n < 3 * DAY) {
          mem.told[id] = today; save();
          var d = Math.ceil(n / DAY);
          BridgeQuests.toast('COMING UP', f.name, (d <= 1 ? 'Tomorrow' : 'In ' + d + ' days') + (f.when ? '' : ', this weekend') + ' · ' + f.place, false);
        }
      }
    });
  }

  // ---- leading players to it: the boards, the Journal, the Map -------------------------------------------------------
  // what's on, or coming within three days: [{ f, on, days }]
  function upcoming(planet) {
    var out = [];
    Object.keys(F).forEach(function (id) {
      var f = F[id];
      if (planet && f.planet !== planet) return;
      var n = next(id);
      if (n === 0) out.push({ f: Object.assign({ id: id }, f), on: true, days: 0 });
      else if (n != null && n < 3 * DAY) out.push({ f: Object.assign({ id: id }, f), on: false, days: Math.max(1, Math.ceil(n / DAY)) });
    });
    return out.sort(function (a, b) { return a.days - b.days; });
  }
  /** The lines pinned on a planet's notice boards for festivals on or coming (js/boards.js). */
  function posters(planet) {
    return upcoming(planet).filter(function (u) { return u.f.poster; }).map(function (u) { return (u.on ? 'PINNED ON TOP, ON NOW: ' : 'A BILL PINNED ON TOP: ') + u.f.poster; });
  }
  /** For the Journal's Next up: a festival on now, or this weekend. */
  function nextUp() {
    return upcoming().slice(0, 2).map(function (u) {
      var c = u.f.contest;
      return { tag: 'Festival', title: u.f.name + (u.on ? ' · on now' : u.days <= 1 ? ' · tomorrow' : ' · in ' + u.days + ' days'),
               text: (c && c.bring ? c.bring + ' ' : u.f.line + '. ') + 'At ' + u.f.place + '.', world: u.f.world };
    });
  }
  /** For the Map's Come back for: a festival in this place, on now or coming. */
  function soon(worldId) {
    return upcoming().filter(function (u) { return u.f.world === worldId; }).map(function (u) {
      return u.f.name + (u.on ? ', on now' : u.f.when ? (u.days <= 1 ? ', tomorrow' : ', in ' + u.days + ' days') : ', this weekend');
    });
  }

  // ---- contests ------------------------------------------------------------------------------------------------------
  function rnd(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; }
  function ckey(f, i) { return occurrence(f.id) + (i ? '#' + i : ''); }
  function rec(f, i) { var k = ckey(f, i); mem[k] = mem[k] || { best: 0, what: null, paid: 0, n: 0 }; return mem[k]; }
  function itemName(id) { var it = typeof BridgeItems !== 'undefined' && BridgeItems.get(id); return it ? it.name : id.replace(/_/g, ' '); }
  function fmtTime(t) { var m = Math.floor(t / 60), x = t - m * 60; return m + ':' + (x < 10 ? '0' : '') + x.toFixed(1); }
  function standings(f, i) {
    var k = ckey(f, i), c = f.contests[i], R = rec(f, i);
    var field = c.rivals.map(function (r, j) {
      var q = rnd(k + ':' + j);
      if (c.kind === 'show') return { who: r[0], what: itemName(r[1]), score: Math.round(c.entries[r[1]] * (0.7 + 0.6 * q) * 10) / 10 };
      if (c.kind === 'times') return { who: r[0], what: '', score: Math.round((r[1] + q * (r[2] - r[1])) * 10) / 10 };
      return { who: r[0], what: itemName(r[1]), score: Math.round(r[2] + q * (r[3] - r[2])) };
    });
    if (R.best) field.push({ who: 'You', what: R.what || '', score: R.best, you: true });
    field.sort(function (a, b) { return c.kind === 'times' ? a.score - b.score : b.score - a.score; });
    return field;
  }
  function rankOf(f, i) { var s = standings(f, i); for (var j = 0; j < s.length; j++) if (s[j].you) return j + 1; return 0; }
  function board(f, i) {
    var c = f.contests[i];
    var fig = function (s) { return c.kind === 'times' ? fmtTime(s.score) : s.score + (c.kind === 'show' || c.score === 'kind' ? ' PTS' : ' CM'); };
    return standings(f, i).map(function (s, j) {
      return '• ' + ['1ST', '2ND', '3RD', '4TH', '5TH'][j] + '  ' + (s.you ? 'YOU' : s.who.toUpperCase()) + ' — ' + (s.what ? s.what.toUpperCase() + ', ' : '') + fig(s);
    }).join('\n');
  }
  // a placing pays once; a better one later pays the difference
  function pay(f, i) {
    var R = rec(f, i), r = rankOf(f, i), P = f.contests[i].prizes;
    if (!r || r > P.length || (R.paid && R.paid <= r)) return null;
    var was = R.paid ? P[R.paid - 1][0] : 0, prize = P[r - 1];
    R.paid = r; save();
    if (typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins) BridgeProgression.awardCoins(prize[0] - was, 'festival:' + f.id + (i ? '#' + i : ''));
    if (typeof BridgeInventory !== 'undefined') (BridgeInventory.give || BridgeInventory.addItem)(prize[1], 1);
    if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx('coin');
    return ['FIRST', 'SECOND', 'THIRD'][r - 1] + ' PLACE: ' + (prize[0] - was) + ' COINS AND A ' + itemName(prize[1]).toUpperCase() + '.';
  }
  function festOf(inter) { var f = F[inter.festival]; return f ? Object.assign({ id: inter.festival }, f) : null; }
  function closedText(f) {
    var h = hoursOf(f), C = Cl();
    return 'IT\'S NOT OPEN JUST NOW. ' + f.name.toUpperCase() + ' RUNS ' + C.fmtHours(h.from) + '–' + C.fmtHours(h.to) + ' BY THE ' + f.planet.toUpperCase() + ' CLOCK, ' + whenText(f) + '.';
  }

  function show(inter, note) {
    var f = festOf(inter);
    if (!f) return;
    var i = inter.contest || 0, c = f.contests[i], I = BridgeInteractions, again = function (n) { show(inter, n); };
    if (!openNow(f)) { I.say(c.label, closedText(f)); return; }
    var rows = Object.keys(c.entries).filter(function (id) { return BridgeInventory.getCount(id) > 0; }).map(function (id) {
      return { label: 'Enter ' + itemName(id).toLowerCase(), sub: 'you have ' + BridgeInventory.getCount(id), icon: id, pick: function () { judge(inter, f, id); } };
    });
    I.choose({ title: f.name + ' · ' + (c.title || 'the show'), text: (note ? note + '\n\n' : '') + (c.judging || c.judge.toUpperCase() + ' LOOKS IT OVER.') + ' YOUR BEST ENTRY COUNTS.\n\n' + board(f, i) +
      (rows.length ? '' : '\n\n' + (c.bring ? c.bring.toUpperCase() : 'BRING ' + Object.keys(c.entries).slice(0, 5).map(itemName).join(', ').toUpperCase() + '…')) + '\n\n' + rollText(),
      rows: rows.concat(pinRows(again)), closeLabel: 'Leave' });
  }
  function judge(inter, f, id) {
    var i = inter.contest || 0, R = rec(f, i), c = f.contests[i];
    if (!BridgeInventory.removeItem(id, 1)) return show(inter);
    R.n++;
    var q = rnd(ckey(f, i) + ':you:' + id + ':' + R.n), score = Math.round(c.entries[id] * (0.7 + 0.6 * q) * 10) / 10;
    var line = c.judge.toUpperCase() + (/ and /.test(c.judge) ? ' TURN' : ' TURNS') + ' YOUR ' + itemName(id).toUpperCase() + ' OVER. ' + score + ' POINTS' + (q > 0.8 ? ' - A FINE ONE.' : q < 0.25 ? ' - IT\'S SEEN BETTER DAYS.' : '.');
    if (score > R.best) { R.best = score; R.what = itemName(id); }
    save();
    var paid = pay(f, i);
    show(inter, line + (paid ? '\n' + paid : ''));
  }

  // a derby board or a race board: read the standings, collect a placing, pin a rosette
  function boardOf(inter, note) {
    var f = festOf(inter);
    if (!f) return;
    var i = inter.contest || 0, c = f.contests[i], R = rec(f, i), paid = pay(f, i), again = function (n) { boardOf(inter, n); };
    BridgeInteractions.choose({ title: f.name + ' · ' + (c.title || c.label.toLowerCase()), text: (note ? note + '\n\n' : '') + (c.judging || '') + '\n\n' + board(f, i) +
      (paid ? '\n\n' + paid : R.best ? '' : '\n\n' + (c.bring || '').toUpperCase()) + '\n\n' + rollText(), rows: pinRows(again), closeLabel: 'Close' });
  }
  /** A fish landed (js/fishing.js): on the board, if a derby's on where it was caught. min/max: its kind's sizes. */
  function caught(fishId, cm, min, max) {
    var C = Cl(), wid = typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId && BridgeWorld.getWorldId();
    var planet = C && C.planet(wid || 'lumar');
    on(planet).forEach(function (f) {
      f.contests.forEach(function (c, i) {
        if (c.kind !== 'derby') return;
        var kind = c.score === 'kind', s = kind && max ? Math.min(100, Math.round(100 * cm / max)) : cm;
        var R = rec(f, i);
        if (s <= R.best) return;
        var before = rankOf(f, i);
        R.best = s; R.what = itemName(fishId) + (kind ? ' ' + cm + ' cm' : ''); save();
        var r = rankOf(f, i);
        if (r && r !== before && typeof BridgeQuests !== 'undefined')
          BridgeQuests.toast(f.name.toUpperCase(), (kind ? cm + ' cm, ' + s + ' points' : cm + ' cm') + ' - ' + (r === 1 ? 'that leads the derby!' : 'that\'s ' + ['first', 'second', 'third', 'fourth'][r - 1] + ' on the board'), 'Show it at the ' + c.label.toLowerCase() + ' on ' + f.place, false);
      });
    });
  }
  /** A ski run finished (js/ski.js): on the race board, if a times contest on that run is on. */
  function timed(runId, secs) {
    on('hoarfell').forEach(function (f) {
      f.contests.forEach(function (c, i) {
        if (c.kind !== 'times' || c.run !== runId || !(secs > 0)) return;
        var R = rec(f, i);
        if (R.best && secs >= R.best) return;
        var before = rankOf(f, i);
        R.best = Math.round(secs * 10) / 10; R.what = ''; save();
        var r = rankOf(f, i);
        if (r && r !== before && typeof BridgeQuests !== 'undefined')
          BridgeQuests.toast(f.name.toUpperCase(), fmtTime(R.best) + ' - ' + (r === 1 ? 'the quickest on the board!' : 'that\'s ' + ['first', 'second', 'third', 'fourth'][r - 1] + ' on the board'), 'The ' + c.label.toLowerCase() + ' on ' + f.place, false);
      });
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
  function cup(liquid, light) {
    return function (ctx, x, y, s) { var u = s / 16; px(ctx, x, y, u, '#2a1a10', [[4, 5, 8, 9], [12, 7, 2, 4]]); px(ctx, x, y, u, '#f0ead8', [[5, 6, 6, 7], [12, 8, 1, 2]]); px(ctx, x, y, u, liquid, [[5, 6, 6, 2]]); px(ctx, x, y, u, light, [[6, 6, 2, 1]]); px(ctx, x, y, u, '#d8d0c0', [[5, 12, 6, 1]]); };
  }
  var PIN = ' Pin it on the roll of honour at any festival\'s contest: every rosette there takes 5% off at the festival stalls.';
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
    // the new fairs' stall food (Verdance, Sylvara, Lumar): each eaten or drunk for health or energy
    blossom_tea: { name: 'Blossom Tea', desc: 'Pale tea with apple blossom floating in it, from the Blossom Show\'s stall. Tastes like a spring morning, slightly.', type: 'drink', effects: { energy: 25 }, value: 3,
      draw: cup('#e8c8a0', '#f8b8c8') },
    violet_creams: { name: 'Violet Creams', desc: 'Fondant sweets with a sugared violet on each, in a paper twist. Marigold\'s gran\'s recipe; she is very firm about that.', type: 'food', effects: { energy: 20 }, value: 3,
      draw: function (ctx, x, y, s) { var u = s / 16; px(ctx, x, y, u, '#3a2030', [[3, 7, 10, 7]]); px(ctx, x, y, u, '#f0e0f0', [[4, 8, 3, 3], [8, 8, 3, 3], [6, 11, 3, 2]]); px(ctx, x, y, u, '#8a5ab8', [[5, 8, 1, 1], [9, 8, 1, 1], [7, 11, 1, 1]]); } },
    strawberries_cream: { name: 'Strawberries and Cream', desc: 'A bowl from the Strawberry Supper: this morning\'s strawberries, a great deal of cream. Bridget says the cream is the point.', type: 'food', effects: { hp: 15, energy: 25 }, value: 4,
      draw: function (ctx, x, y, s) { var u = s / 16; px(ctx, x, y, u, '#2a3a5a', [[2, 8, 12, 6]]); px(ctx, x, y, u, '#e8eef8', [[3, 8, 10, 4]]); px(ctx, x, y, u, '#fff8e8', [[4, 6, 8, 3]]); px(ctx, x, y, u, '#e02a3a', [[4, 5, 3, 3], [9, 5, 3, 3], [7, 4, 2, 2]]); px(ctx, x, y, u, '#4a8a2a', [[5, 4, 1, 1], [10, 4, 1, 1]]); } },
    elderflower_fizz: { name: 'Elderflower Fizz', desc: 'Cold, sweet and very bubbly. It goes up your nose. That\'s allowed.', type: 'drink', effects: { energy: 30 }, value: 3,
      draw: function (ctx, x, y, s) { var u = s / 16; px(ctx, x, y, u, '#2a3a20', [[5, 3, 6, 11]]); px(ctx, x, y, u, '#e8f0c0', [[6, 5, 4, 8]]); px(ctx, x, y, u, '#ffffff', [[7, 7, 1, 1], [8, 9, 1, 1], [7, 11, 1, 1]]); px(ctx, x, y, u, '#c0c0b0', [[6, 3, 4, 2]]); } },
    mulled_wine: { name: 'Mulled Wine', desc: 'Vinehallow red, hot, with orange and clove, in a cup that warms your hands at the Cellar Fair.', type: 'drink', effects: { hp: 10, energy: 30 }, value: 4,
      draw: cup('#8a1a2a', '#e06040') },
    cheese_toastie: { name: 'Cheese Toastie', desc: 'Wold cheese melted between two slices of country loaf, too hot to bite and bitten anyway.', type: 'food', effects: { hp: 25, energy: 20 }, value: 4,
      draw: function (ctx, x, y, s) { var u = s / 16; px(ctx, x, y, u, '#5a3a18', [[2, 5, 12, 9]]); px(ctx, x, y, u, '#d8a048', [[3, 6, 10, 7]]); px(ctx, x, y, u, '#f0c060', [[3, 6, 10, 1]]); px(ctx, x, y, u, '#ffe070', [[3, 9, 10, 1], [5, 10, 1, 2], [10, 10, 1, 1]]); } },
    moon_cake: { name: 'Moon Cake', desc: 'A round of almond cake with a silver moonpetal pressed in the top, baked for the Moonwell\'s night. It glows a little. Probably.', type: 'food', effects: { hp: 20, energy: 30 }, value: 5,
      draw: function (ctx, x, y, s) { var u = s / 16; px(ctx, x, y, u, '#4a3a20', [[3, 5, 10, 9]]); px(ctx, x, y, u, '#e8d8a8', [[4, 6, 8, 7]]); px(ctx, x, y, u, '#f8f0d0', [[4, 6, 8, 1]]); px(ctx, x, y, u, '#c8e8e0', [[6, 8, 4, 3]]); px(ctx, x, y, u, '#ffffff', [[7, 9, 2, 1]]); } },
    saffron_bun: { name: 'Saffron Bun', desc: 'A golden bun with currants, baked for the Blessing of the Fleet. Every crew aboard gets one for luck; you get one for four coins.', type: 'food', effects: { hp: 15, energy: 25 }, value: 3,
      draw: function (ctx, x, y, s) { var u = s / 16; px(ctx, x, y, u, '#5a3410', [[3, 6, 10, 8]]); px(ctx, x, y, u, '#f0b030', [[4, 7, 8, 6]]); px(ctx, x, y, u, '#ffd860', [[5, 7, 5, 2]]); px(ctx, x, y, u, '#3a1a10', [[6, 10, 1, 1], [9, 9, 1, 1], [8, 12, 1, 1]]); } },
    spore_sherbet: { name: 'Spore Sherbet', desc: 'Lemon sherbet with a pinch of something from the bloom stirred in. It fizzes green on your tongue. Rose Cove swears it\'s safe.', type: 'food', effects: { energy: 30 }, value: 3,
      draw: function (ctx, x, y, s) { var u = s / 16; px(ctx, x, y, u, '#3a2a20', [[5, 9, 6, 5]]); px(ctx, x, y, u, '#d8a060', [[6, 9, 4, 4]]); px(ctx, x, y, u, '#2a4a30', [[4, 4, 8, 6]]); px(ctx, x, y, u, '#9af0b0', [[5, 5, 6, 4]]); px(ctx, x, y, u, '#e8fff0', [[6, 5, 2, 1], [9, 7, 1, 1]]); } },
    blue_rosette: { name: 'Blue Rosette', desc: 'First prize, pinned with a festival\'s name on the tails.' + PIN, type: 'trophy', value: 60, draw: rosette('#4080e0', '#1a2a6a') },
    red_rosette: { name: 'Red Rosette', desc: 'Second prize, pinned with a festival\'s name on the tails.' + PIN, type: 'trophy', value: 30, draw: rosette('#e04040', '#6a1a1a') },
    yellow_rosette: { name: 'Yellow Rosette', desc: 'Third prize, pinned with a festival\'s name on the tails.' + PIN, type: 'trophy', value: 15, draw: rosette('#f0c040', '#6a4a10') }
  };
  /** What the festival things are for, beyond eating them (js/uses.js): [{ id, t, p }]. */
  var USES = ROSETTES.map(function (id) { return { id: id, p: 6, t: '<b>Pin it up</b> on the roll of honour at any festival\'s contest: 5% off at every festival stall for each one there' }; });
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
    } else if (kind === 'table') {                                 // the same trestle and cloth, a rosette pinned on a card behind
      P(o, [[0, 13, 16, 7], [1, 20, 2, 4], [13, 20, 2, 4]]);
      P('#e8e0d0', [[0, 14, 16, 4]]); P('#ffffff', [[0, 14, 16, 1]]); P('#4060c0', [[0, 17, 16, 1]]); P('#5a3a1a', [[1, 19, 14, 1], [2, 20, 1, 3], [13, 20, 1, 3]]);
      P(o, [[5, 6, 6, 8]]); P('#f0e8d8', [[6, 7, 4, 6]]); P('#4080e0', [[7, 8, 2, 2]]); P('#1a2a6a', [[7, 10, 1, 2], [8, 10, 1, 2]]);
    } else if (kind === 'stall') {                              // a counter under a striped awning on two poles
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
    } else if (kind === 'flowers') {                               // a half-barrel tub heaped with blooms
      P(o, [[2, 10, 12, 8], [2, 17, 12, 7]]);
      P('#3a7a2a', [[3, 11, 10, 7]]); P('#5a9a3a', [[4, 11, 8, 2]]);
      P('#f070a0', [[4, 12, 2, 2], [10, 13, 2, 2]]); P('#f8e060', [[7, 11, 2, 2], [5, 15, 2, 2]]); P('#ffffff', [[9, 15, 2, 2], [11, 11, 1, 1]]); P('#a070e0', [[3, 15, 1, 2], [12, 16, 1, 1]]);
      P('#8a5a2a', [[3, 18, 10, 5]]); P('#b07a3a', [[3, 18, 10, 1]]); P('#3a3a40', [[3, 20, 10, 1]]);
    } else if (kind === 'berries') {                               // two crates of strawberries, one on the other
      P(o, [[2, 12, 12, 12]]);
      P('#a0763a', [[3, 13, 10, 4], [3, 19, 10, 4]]); P('#c89850', [[3, 13, 10, 1], [3, 19, 10, 1]]);
      P('#e02a3a', [[4, 12, 2, 2], [7, 11, 2, 2], [10, 12, 2, 2], [5, 18, 2, 1], [9, 18, 2, 1]]); P('#ff6a6a', [[4, 12, 1, 1], [7, 11, 1, 1], [10, 12, 1, 1]]); P('#4a8a2a', [[6, 12, 1, 1], [9, 11, 1, 1]]);
    } else if (kind === 'casks') {                                 // two casks on a cradle, a third on top, chalked names
      P(o, [[1, 14, 7, 9], [8, 14, 7, 9], [4, 8, 8, 7]]);
      P('#7a4e22', [[2, 15, 5, 7], [9, 15, 5, 7], [5, 9, 6, 5]]); P('#9a6a32', [[2, 15, 5, 2], [9, 15, 5, 2], [5, 9, 6, 1]]);
      P('#3a3a40', [[3, 15, 1, 7], [5, 15, 1, 7], [10, 15, 1, 7], [12, 15, 1, 7], [6, 9, 1, 5], [9, 9, 1, 5]]); P('#e8e8d8', [[3, 18, 3, 1], [10, 18, 3, 1]]);
      P('#4a2e14', [[1, 22, 14, 2]]);
    } else if (kind === 'brazier') {                               // an iron fire basket on three legs, flames in it
      P(o, [[3, 10, 10, 6], [4, 16, 1, 8], [11, 16, 1, 8], [7, 16, 2, 8]]);
      P('#3a3a44', [[4, 11, 8, 4]]); P('#5a5a66', [[4, 11, 8, 1]]);
      P('#c03010', [[4, 7, 8, 4]]); P('#f08020', [[5, 5, 6, 5]]); P('#ffd060', [[6, 6, 4, 3]]); P('#fff4c0', [[7, 7, 2, 1]]);
    } else if (kind === 'leaf_lantern') {                          // a bark pole with a leaf lantern hung from its crook
      P(o, [[7, 3, 2, 21], [7, 3, 6, 2], [10, 5, 5, 7]]);
      P('#5a4232', [[7, 4, 1, 20], [8, 4, 4, 1]]);
      P('#3e6e34', [[10, 6, 5, 5]]); P('#ffd890', [[11, 7, 3, 3]]); P('#fff0c8', [[12, 8, 1, 1]]); P('#d0a040', [[11, 11, 3, 1]]);
      P('#3a2a20', [[5, 22, 6, 2]]);
    } else if (kind === 'floats') {                                // glass floats in a net hung on a frame
      P(o, [[1, 6, 14, 2], [2, 6, 1, 18], [13, 6, 1, 18]]);
      P('#5a3a1a', [[1, 6, 14, 1]]);
      P('#1a3a6a', [[4, 9, 4, 4], [8, 12, 4, 4], [4, 15, 4, 4]]); P('#60a8f0', [[5, 10, 2, 2], [9, 13, 2, 2]]); P('#f08cc8', [[5, 16, 2, 2]]); P('#e8f4ff', [[5, 10, 1, 1], [9, 13, 1, 1], [5, 16, 1, 1]]);
      P('#9a8458', [[3, 8, 10, 1], [3, 14, 10, 1], [3, 20, 10, 1]]);
    } else if (kind === 'flags') {                                 // a pole with a string of pennants off it
      P(o, [[7, 1, 2, 23]]); P('#c8c0b0', [[7, 2, 1, 21]]);
      P('#d83a2e', [[9, 3, 4, 2], [9, 4, 2, 2]]); P('#e0b040', [[9, 7, 4, 2], [9, 8, 2, 2]]); P('#2a6ae0', [[9, 11, 4, 2], [9, 12, 2, 2]]); P('#f0f0e8', [[9, 15, 4, 2], [9, 16, 2, 2]]);
      P('#4a3a2a', [[5, 22, 6, 2]]);
    }
    art[kind] = c;
    // what gives off light (a lantern's glass, a brazier's fire) again on a canvas of its own, drawn untinted over the
    // prop: the scene's tint at its foot darkens everything at night, and a lit lantern drawn dark reads as unlit
    var LIT = { leaf_lantern: [['#ffd890', [[11, 7, 3, 3]]], ['#fff0c8', [[12, 8, 1, 1]]]],
                brazier: [['#c03010', [[4, 7, 8, 4]]], ['#f08020', [[5, 5, 6, 5]]], ['#ffd060', [[6, 6, 4, 3]]], ['#fff4c0', [[7, 7, 2, 1]]]] }[kind];
    if (LIT) {
      var lc = document.createElement('canvas'); lc.width = w; lc.height = h;
      LIT.forEach(function (l) { px(lc.getContext('2d'), 0, 0, u, l[0], l[1]); });
      art[kind + ':lit'] = lc;
    }
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
        var lit = art[p[0] + ':lit'];
        if (lit) BridgeScene.drawOccluded(ctx, sc, lit, 0, 0, lit.width, lit.height, dx, dy, footRow, offX, offY, null, null);
      } };
    });
  }

  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('*', { ground: water, items: props });
  if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.register) {
    BridgeInteractions.register('fest_show', show, 'Enter');
    BridgeInteractions.register('fest_derby', boardOf, 'Read');
    BridgeInteractions.register('fest_times', boardOf, 'Read');
  }

  // ---- the tests: every festival's props on open ground, and with them up, its crowd's spots and its counters
  //      still in reach of where you arrive
  function check() {
    var out = [];
    return Promise.all(Object.keys(F).map(function (id) {
      var f = F[id];
      return fetch('/bridge/assets/worlds/' + f.world + '.json').then(function (r) { return r.json(); }).then(function (d) {
        var C = d.collisions.map(function (row) { return row.slice(); }), W = d.width, Hh = d.height;
        (f.props || []).forEach(function (p) {
          if (C[p[2]][p[1]] === 1) out.push(id + ': ' + p[0] + ' at ' + p[1] + ',' + p[2] + ' on a solid tile');
          if (!prop(p[0])) out.push(id + ': no drawing for ' + p[0]);
          C[p[2]][p[1]] = 1;
        });
        Object.keys(f.crowd || {}).forEach(function (who) { var c = f.crowd[who]; if (C[c[1]][c[0]] !== 1) C[c[1]][c[0]] = 2; });   // (people stand there: solid to walk through)
        var start = (d.spawns && d.spawns.player) || [0, 0], seen = {}, q = [start];
        seen[start] = 1;
        for (var i = 0; i < q.length; i++) [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (s) {
          var n = [q[i][0] + s[0], q[i][1] + s[1]];
          if (n[0] < 0 || n[1] < 0 || n[0] >= W || n[1] >= Hh || seen[n] || C[n[1]][n[0]] === 1 || C[n[1]][n[0]] === 2) return;
          seen[n] = 1; q.push(n);
        });
        var near = function (x, y) { return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (s) { return seen[[x + s[0], y + s[1]]]; }); };
        Object.keys(f.crowd || {}).forEach(function (who) {
          var c = f.crowd[who];
          if (C[c[1]][c[0]] === 1) out.push(id + ': ' + who + ' stands on a solid tile');
          else if (!near(c[0], c[1])) out.push(id + ': ' + who + '\'s spot is out of reach');
          if (typeof BridgePeople !== 'undefined' && BridgePeople.all && !BridgePeople.all()[who]) out.push(id + ': nobody called ' + who);
        });
        (f.contests || []).forEach(function (c) {
          if (!near(c.at[0], c.at[1])) out.push(id + ': the ' + c.label.toLowerCase() + ' is out of reach');
          if (c.kind === 'show') Object.keys(c.entries).concat(c.rivals.map(function (r) { return r[1]; })).forEach(function (it) {
            if (typeof BridgeItems !== 'undefined' && !BridgeItems.get(it)) out.push(id + ': no item ' + it);
          });
        });
        if (f.stall) {
          if (!near(f.stall.at[0], f.stall.at[1])) out.push(id + ': the ' + f.stall.label.toLowerCase() + ' is out of reach');
          f.stall.items.forEach(function (x) { if (typeof BridgeItems !== 'undefined' && !BridgeItems.get(x.id)) out.push(id + ': no item ' + x.id + ' at the stall'); });
        }
      });
    })).then(function () { return out; });
  }

  return { on: on, next: next, timetable: timetable, crowd: crowd, decorate: decorate, caught: caught, timed: timed, open: openNow,
           posters: posters, nextUp: nextUp, soon: soon, USES: USES, pinned: pinned, discount: discount,
           all: function () { return F; }, _occurrence: occurrence, _check: check, _rank: function (id, i) { return F[id] ? rankOf(Object.assign({ id: id }, F[id]), i || 0) : 0; } };
})();
