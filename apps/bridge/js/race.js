/**
 * BridgeRace — racing: anyone who's there with you, down a run, up the face or across the water; and the Emerald Regatta.
 *
 * Beck: "make it where you can race anybody else that's in there… I want to be able to race Alyssa", and a sailing race
 * round a course of buoys and islands against the other sloops, on a set day each week, people on the quays watching.
 *
 * Racing someone is a game like any other in js/together.js — walk up to them (or find them on the players pill), *Play a
 * game…*, and where you are offers a race: `race-ski` on the pistes (and Fellhaven, the summit: you ride over to the run),
 * `race-climb` at the face (and Fellhaven's route feet), `race-sail` at any Lumar pier. Pick the run, the route or the
 * course, a stake (just for fun, or coins each), and they're asked. Each of you is taken to the start — the run's gate, the
 * route's foot, your own sloop at the pier — and it waits there till you're both in it (`rdy` over the game's own wire),
 * then 3-2-1 on one clock (each sets the gun 3.5 s after hearing the other's ready, so the two start within a heartbeat of
 * each other, and each times their own run from their own gun). You see each other as you go: the other skier or climber
 * drawn in their own suit on the same snow or the same face (js/multi.js now draws anyone skiing or climbing in their
 * pose), the other sloop on the water with her name over her. The quicker time takes it: a time goes in as a score of
 * minus its milliseconds, so js/together.js's higher-is-better settles it, its label the time itself; giving up (Esc, off
 * the wall, back ashore before the line) is DNF.
 *
 * The courses at sea (COURSES): a race to any island you know near the one you're at, first across its harbour mouth —
 * the line, a chequered post either side — and from Crownhaven the regatta's own course. Everyone races the sloop (one
 * design: it's the sailing that wins), side by side off the pier till the gun (js/sloop.js `hold`, `lane`).
 *
 * The Emerald Regatta (REGATTA): Fridays, noon till midnight Eastern time, a start every quarter of an hour off
 * Crownhaven's harbour mouth — round a mark south of Tern Holm, round a mark south of Starling Holm, back to the line.
 * Enter from any harbourmaster's book (Rowena's on the quay, if you're there): you go down to your sloop and sail out to
 * the line; the gun goes at the start's time on the Eastern clock, the same for everyone who entered it, and five of the
 * Emerald's sloops race with you (`fleet`: which five and how quick they are come from the start itself, so everyone in it
 * sees the same boats and the same times). Other pilots in the same start race too, their boats on the water and in the
 * placings. A placing pays once a regatta day (a better one pays the difference): 500, 250, 120 coins; the first win, the
 * Regatta Cup. Kept in localStorage `bridge_regatta`.
 *
 *   BridgeRace.here()                      → the races where you stand, for js/together.js's list
 *   BridgeRace.choose(row, then, back)     → pick the run, route or course; then(opts)
 *   BridgeRace.start(session) / peer(t) / gone() / stop()      js/together.js's adapter for kind 'race'
 *   BridgeRace.nextStart(ms) → { at, slot, day } · regattaDay(ms) · enter(worldId) · bookRow(worldId, back)
 *   BridgeRace.COURSES(worldId) · REGATTA · _spec(slot) (the tests)
 */
var BridgeRace = (function () {
  var KEY = 'bridge_regatta', DAY = 86400000, MIN = 60000;
  var REGATTA = {
    port: 'lumar-crown', name: 'The Emerald Regatta', dow: 5, from: 12, to: 24, every: 15,     // Fridays (Eastern), a start each quarter hour
    marks: [{ isle: 'lumar-tern', side: 'south', off: 16 }, { isle: 'lumar-holm', side: 'south', off: 16 }],
    // the Emerald's racing sloops and their pace round the course: a share of what a sloop makes in the day's wind at the gun
    // (SLOOP_V × the Emerald's breeze × the weather's), so a good passage beats most of them and a great one all; five in each start
    fleet: [['Kittiwake', 0.72], ['Saltspray', 0.78], ['Merry Moll', 0.66], ['Dauntless', 0.84], ["Brannoc's Pride", 0.75], ['Gannet', 0.88], ['Little Wren', 0.7]],
    cloth: [['#e8682a', '#c0501e', '#8a3a14'], ['#d6cfbf', '#b2ac9f', '#86828f'], ['#3a8a5a', '#2a6a44', '#1c4a30'], ['#5a7aa0', '#46607e', '#34485e'],
            ['#c89a50', '#a87a38', '#7a5a2a'], ['#b8503a', '#94402e', '#6a2c20'], ['#7a5aa0', '#5e4480', '#42305e']],
    prize: [500, 250, 120]
  };

  function N() { return typeof BridgeNet !== 'undefined' ? BridgeNet : null; }
  function T() { return typeof BridgeTogether !== 'undefined' ? BridgeTogether : null; }
  function cap(t) { return typeof BridgeMulti !== 'undefined' ? BridgeMulti.cap(t) : String(t || ''); }
  function toast(a, b, c) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(a, b, c, false); }
  function choose(spec) { if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.choose) BridgeInteractions.choose(spec); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function fmt(t) { var m = Math.floor(t / 60), x = t - m * 60; return m + ':' + (x < 10 ? '0' : '') + x.toFixed(1); }
  function nth(n) { return n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'); }
  function worldId() { return typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId ? BridgeWorld.getWorldId() : null; }
  function world() { return typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorld ? BridgeWorld.getWorld() : null; }
  function isles() { return typeof BridgeVoyage !== 'undefined' && BridgeVoyage._isles ? BridgeVoyage._isles : {}; }
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* private mode */ } }

  // ---- where a race can be had ------------------------------------------------------------------------------------
  var SKI = { 'hoarfell-piste': 1, hoarfell: 1, 'hoarfell-summit': 1 }, CLIMB = { 'hoarfell-face': 1, hoarfell: 1 };
  function sailable(w) { return !!(w && (w.interactions || []).some(function (i) { return i.type === 'go_sailing' || i.action === 'go_sailing'; })); }
  function here() {
    var id = worldId(), w = world(), out = [];
    if (!id || !w) return out;
    if (SKI[id] && typeof BridgeSki !== 'undefined') out.push({ g: 'race-ski', title: 'Ski race', d: 0, opts: { sport: 'ski' } });
    if (CLIMB[id] && typeof BridgeClimb !== 'undefined') out.push({ g: 'race-climb', title: 'Climbing race', d: 0, opts: { sport: 'climb' } });
    if (typeof BridgeSloop !== 'undefined' && BridgeSloop.knows && BridgeSloop.knows(id) && sailable(w)) out.push({ g: 'race-sail', title: 'Sailing race', d: 0, opts: { sport: 'sail' } });
    return out;
  }

  // the courses from an island: to each island you know near it (first across its harbour mouth), and from Crownhaven the
  // regatta's own course round the two holms and back
  function COURSES(fromId) {
    var P = isles(), a = P[fromId], out = [];
    if (!a) return out;
    Object.keys(P).filter(function (id) { return id !== fromId; }).map(function (id) {
      var b = P[id], d = Math.hypot((b.x - a.x) * 720, (b.y - a.y) * 518);
      return { id: id, d: d };
    }).sort(function (p, q) { return p.d - q.d; }).slice(0, 4).forEach(function (c) {
      var known = typeof BridgeChart === 'undefined' || BridgeChart.known(c.id);
      out.push({ key: 'to:' + c.id, name: 'To ' + P[c.id].name, finish: c.id, marks: [], mins: Math.round(c.d / 3 / 60 * 10) / 10,
                 sub: '~' + Math.round(c.d / 10) * 10 + ' tiles · first across its harbour mouth' + (known ? '' : ' · not on your chart') });
    });
    if (fromId === REGATTA.port) out.push({ key: 'regatta', name: 'The regatta course', finish: REGATTA.port, marks: REGATTA.marks, mins: 3,
                                            sub: 'round Tern Holm, round Starling Holm, back to the line' });
    return out;
  }
  function courseFor(fromId, key) { return COURSES(fromId).filter(function (c) { return c.key === key; })[0] || null; }

  // pick what to race: js/together.js asks before the stake
  function choose_(r, then, back) {
    var sport = r.opts.sport, rows = [];
    if (sport === 'ski') {
      Object.keys(BridgeSki.RUNS).forEach(function (id) {
        var R = BridgeSki.RUNS[id], open = BridgeSki.unlocked(id);
        rows.push({ label: cap(R.name), sub: R.mark + ' run' + (BridgeSki.best(id) ? ' · your best ' + fmt(BridgeSki.best(id)) : ''), note: open ? '' : 'after Pinewood',
                    disabled: !open, pick: function () { then({ sport: 'ski', run: id, name: cap(R.name) }); return false; } });
      });
    } else if (sport === 'climb') {
      ['staircase', 'icefall', 'hoarspire'].forEach(function (id) {
        var R = BridgeClimb.ROUTES[id];
        rows.push({ label: cap(R.name) + ' (' + R.grade + ')', sub: R.blurb, pick: function () { then({ sport: 'climb', route: id, name: cap(R.name) }); return false; } });
      });
    } else {
      COURSES(worldId()).forEach(function (c) {
        rows.push({ label: c.name, sub: c.sub, note: 'about ' + c.mins + ' min', pick: function () { then({ sport: 'sail', course: c.key, from: worldId(), name: c.name }); return false; } });
      });
    }
    choose({ title: r.title, text: sport === 'ski' ? 'WHICH RUN? THE TWO OF YOU IN THE GATE, ONE CLOCK.' : sport === 'climb' ? 'WHICH ROUTE? EACH ON YOUR OWN HOLDS, FIRST TO THE TOP.'
                                                   : 'WHICH COURSE? YOUR SLOOPS SIDE BY SIDE OFF THE PIER TILL THE GUN.',
             rows: rows, buttons: back ? [{ label: 'Back', act: function () { back(); return false; } }] : [], closeLabel: 'Never mind' });
  }

  // ---- a race with someone (js/together.js's adapter) ----------------------------------------------------------------
  var R = null;                                       // { sid, sport, peer, vs, host, lane, at, mine, theirs, done, theirsDone }
  function start(s) {
    var o = s.opts || {};
    R = { sid: s.sid, sport: o.sport, peer: s.peer, vs: s.peerName, host: s.host, lane: s.host ? 0 : 1, at: null, mine: false, theirs: false, done: false };
    var me = R;
    var hooks = {
      lane: R.lane, vs: R.vs, get at() { return me.at; },
      ready: function () { if (R !== me) return; me.mine = true; if (T()) T().send('rdy', {}); maybeGo(); },
      finish: function (t) { if (R !== me || me.done) return; me.done = true; if (T()) T().done(-Math.round(t * 1000), fmt(t)); },
      quit: function () { if (R !== me || me.done) return; me.done = true; if (T()) T().done(-1e12, 'DNF'); },
      where: function () { return whereThey(me); }
    };
    if (o.sport === 'ski' && typeof BridgeSki !== 'undefined') BridgeSki.start(o.run, { race: hooks });
    else if (o.sport === 'climb' && typeof BridgeClimb !== 'undefined') {
      if (typeof BridgeMulti !== 'undefined' && BridgeMulti.nudge) BridgeMulti.nudge(s.peer, 0.45);
      BridgeClimb.start(o.route, { race: hooks });
    } else if (o.sport === 'sail' && typeof BridgeSloop !== 'undefined') {
      var c = courseFor(o.from || worldId(), o.course);
      if (!c || !BridgeSloop.raceBoard(o.from || worldId(), {
        id: 'tg-' + s.sid, name: c.name, marks: c.marks, finish: c.finish, hold: true, lane: R.lane, waitFor: R.vs, seed: s.seed,
        onReady: hooks.ready, onFinish: function (ms) { hooks.finish(ms / 1000); }, onQuit: hooks.quit
      })) hooks.quit();
    }
  }
  function maybeGo() {
    if (!R || R.at || !R.mine || !R.theirs) return;
    R.at = Date.now() + 3500;
    if (T()) T().score(0, '…');                      // racing: the badge over your heads says so (no score till the line)
    if (R.sport === 'sail' && typeof BridgeSloop !== 'undefined') BridgeSloop.raceGun(R.at);
  }
  // where the other one is (the HUD's ahead / behind): their avatar here, as js/multi.js has it
  function whereThey(me) {
    var a = typeof BridgeMulti !== 'undefined' && BridgeMulti.others()[me.peer];
    if (!a) return me.theirsDone ? { done: true } : null;
    var foot = a.y + 1 - 3 / 32;
    return { x: a.x + 0.5, y: foot, sy: foot - ((a.lift || 0) + 31) / 32, done: !!me.theirsDone };
  }
  function peer(t) {
    if (!R || !t || !t.done) return;
    R.theirsDone = true;
    toast(R.sport === 'sail' ? 'Sailing race' : R.sport === 'climb' ? 'Climbing race' : 'Ski race',
          t.label === 'DNF' ? R.vs + ' is out of it' : R.vs + (R.sport === 'climb' ? ' is up in ' : R.sport === 'sail' ? ' is across the line in ' : ' is down in ') + t.label,
          R.done ? '' : 'keep going');
  }
  function gone() {
    if (!R) return;
    if (!R.at) { R.at = Date.now() + 1500; if (R.sport === 'sail' && typeof BridgeSloop !== 'undefined') BridgeSloop.raceGun(R.at); }   // waiting at the start: go on alone
    finishUp();
  }
  function stop() {
    var r = R;
    if (!r) return;
    if (r.sport === 'sail' && typeof BridgeSloop !== 'undefined') BridgeSloop.retire();
    else if ((r.sport === 'ski' || r.sport === 'climb') && typeof BridgeWorld !== 'undefined' && BridgeWorld.getMode && BridgeWorld.getMode()) BridgeWorld.setMode(null);
    finishUp();
  }
  function finishUp() {
    if (R && typeof BridgeMulti !== 'undefined' && BridgeMulti.nudge) BridgeMulti.nudge(R.peer, 0);
    R = null;
  }
  if (T()) T().on('rdy', function (d, s) { if (R && s && s.sid === R.sid) { R.theirs = true; maybeGo(); } });

  // ---- the Emerald Regatta ---------------------------------------------------------------------------------------------
  function et(ms) { return typeof BridgeClock !== 'undefined' && BridgeClock.etAt ? BridgeClock.etAt(ms) : ms - 4 * 3600000; }
  function now() { return typeof BridgeClock !== 'undefined' && BridgeClock.now ? BridgeClock.now() : Date.now(); }
  function dayKey(ms) { return Math.floor(et(ms) / DAY); }
  function regattaDay(ms) { return ((dayKey(ms == null ? now() : ms) + 4) % 7 + 7) % 7 === REGATTA.dow; }
  /** The next start (at least `lead` ms off): { at (Date.now ms), slot (its number since the epoch), day } — or the next Friday's first. */
  function nextStart(ms, lead) {
    ms = ms == null ? now() : ms; lead = lead == null ? 40000 : lead;
    var step = REGATTA.every * MIN;
    for (var k = 0; k < 9; k++) {
      var E = et(ms) + k * DAY, d = Math.floor(E / DAY), dow = ((d + 4) % 7 + 7) % 7;
      if (dow !== REGATTA.dow) continue;
      var dayStart = d * DAY, first = dayStart + REGATTA.from * 3600000, last = dayStart + REGATTA.to * 3600000 - step;
      var want = k ? first : Math.max(first, Math.ceil((E + lead) / step) * step);
      if (want > last) continue;
      var at = ms + (want - et(ms));
      return { at: at, slot: Math.round(want / step), day: d, et: want };
    }
    return null;
  }
  function etText(etMs) { var m = Math.floor((etMs % DAY) / MIN), h = Math.floor(m / 60), mm = m % 60; return (h % 12 || 12) + ':' + (mm < 10 ? '0' : '') + mm + (h < 12 ? 'am' : 'pm'); }
  // the fleet in a start: five of the Emerald's sloops, how quick each is today (from the start alone: the same for everyone)
  var SLOOP_V = 4.4, EMERALD = 0.92;                 // js/sloop.js: a sloop's top speed, the Emerald's breeze
  function windAt(ms) { var w = typeof BridgeWeather !== 'undefined' && BridgeWeather.sea ? BridgeWeather.sea(ms) : null; return w || { wind: 1, storm: false }; }
  function fleetFor(slot, gun) {
    var F = REGATTA.fleet.map(function (b, i) { return { b: b, i: i, k: hash(slot * 7.3 + i * 1.91) }; }).sort(function (p, q) { return p.k - q.k; }).slice(0, 5);
    var v = SLOOP_V * EMERALD * windAt(gun).wind;
    return F.map(function (f, j) { return { name: f.b[0], v: v * f.b[1] * (0.96 + hash(slot * 3.1 + f.i) * 0.08), cloth: REGATTA.cloth[f.i % REGATTA.cloth.length] }; });
  }
  function spec(S, lane) {
    return { id: 'regatta-' + S.slot, name: REGATTA.name, marks: REGATTA.marks, finish: REGATTA.port, at: Date.now() + (S.at - now()), hold: false, lane: lane || 0, seed: S.slot,
             npcs: fleetFor(S.slot, S.at),
             onFinish: function (ms, place, field) { placed(S, ms, place, field); },
             onQuit: function () { toast(REGATTA.name, 'Out of the race', 'There\'s another start every quarter hour'); } };
  }
  function laneOf() { var m = N() && N().me && N().me(); var id = String(m && m.id || 'me'), h = 0; for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997; return h % 3; }
  // entering: at Crownhaven you go down to your sloop and out to the line; anywhere else, sail there
  function enter(wid) {
    wid = wid || worldId();
    var S = nextStart();
    if (!S) return false;
    if (windAt(S.at).storm) {                          // the committee won't send boats out into a storm
      choose({ title: REGATTA.name, text: 'POSTPONED: A STORM\'S BLOWING OVER THE EMERALD, AND THE COMMITTEE WON\'T SEND BOATS OUT INTO IT. THE NEXT START AFTER IT CLEARS.', closeLabel: 'All right' });
      return false;
    }
    if (wid !== REGATTA.port) {
      choose({ title: REGATTA.name, text: 'THE REGATTA SAILS FROM CROWNHAVEN. SAIL THERE, AND ROWENA ON THE QUAY WILL PUT YOUR NAME DOWN.', closeLabel: 'All right' });
      return false;
    }
    var ok = typeof BridgeSloop !== 'undefined' && BridgeSloop.raceBoard(wid, spec(S, laneOf()));
    if (ok) {
      sfx('success');
      gather(S);
    }
    return ok;
  }
  // people on the quay to watch (js/crowd.js): the start's own crowd, gathering from six minutes before the gun, so everyone sees the same
  function gather(S) {
    if (typeof BridgeCrowd === 'undefined' || !BridgeCrowd.gather) return;
    var w = world(), dock = w && (w.interactions || []).filter(function (i) { return i.type === 'go_sailing' || i.label === 'DOCK'; })[0];
    if (!dock) return;
    try { BridgeCrowd.gather(REGATTA.port, { x: dock.x, y: dock.y - 2, r: 4, n: 10, until: S.at + 5 * MIN, face: [dock.x, dock.y + 6], id: 'regatta-' + S.slot, start: S.at - 6 * MIN }); } catch (e) { /* not ready */ }
  }
  // across the line: your placing, paid once a regatta day (a better one pays the difference), and the cup the first win
  function placed(S, ms, place, field) {
    var d = load(), key = String(S.day), prize = REGATTA.prize[place - 1] || 0;
    if (d.day !== key) { d.day = key; d.best = 0; d.paid = 0; }
    d.runs = (d.runs || 0) + 1;
    if (!d.bestMs || ms < d.bestMs) d.bestMs = Math.round(ms);
    var owed = 0;
    if (!d.best || place < d.best) { d.best = place; owed = Math.max(0, prize - (d.paid || 0)); d.paid = Math.max(d.paid || 0, prize); }
    var cup = place === 1 && !d.cup;
    if (place === 1) d.wins = (d.wins || 0) + 1;
    if (cup) d.cup = true;
    d.last = { slot: S.slot, ms: Math.round(ms), place: place, of: field.length };
    save(d);
    if (owed && typeof BridgeProgression !== 'undefined') BridgeProgression.awardCoins(owed, 'regatta:' + place);
    if (cup && typeof BridgeInventory !== 'undefined') BridgeInventory.give('regatta_cup', 1);
    if (place === 1 && typeof BridgeProgression !== 'undefined' && BridgeProgression.recordAchievement) BridgeProgression.recordAchievement('regatta_win', 0, { source: 'regatta' });
    toast(REGATTA.name, nth(place) + ' of ' + field.length + ' in ' + fmt(ms / 1000), (owed ? '+' + owed + ' coins' : place <= 3 ? 'you\'ve placed better today' : 'the gun again in a quarter hour') + (cup ? ' · the Regatta Cup' : ''));
    if (typeof BridgeQuests !== 'undefined' && BridgeQuests.note) BridgeQuests.note('The Emerald Regatta', nth(place) + ' of ' + field.length, fmt(ms / 1000));
  }
  // the harbour book's row (js/harbour.js): on a regatta day the next start, else when it sails
  function bookRow(wid, back) {
    var S = nextStart(), d = load(), today = S && regattaDay() && String(S.day) === String(dayKey(now()));
    var best = today && d.day === String(S.day) && d.best ? ' · your best today ' + nth(d.best) : '';
    if (!S) return null;
    var mins = Math.max(0, Math.round((S.at - now()) / MIN));
    return { label: REGATTA.name, sub: today ? 'next start ' + etText(S.et) + ' (in ' + mins + ' min)' + best : 'Fridays, noon till midnight, off Crownhaven',
             pick: function () {
               var lines = 'ROUND A MARK SOUTH OF TERN HOLM, ROUND A MARK SOUTH OF STARLING HOLM, AND BACK ACROSS THE LINE OFF CROWNHAVEN\'S HARBOUR MOUTH. ' +
                 'YOUR SLOOP, NO OTHER: IT\'S THE SAILING THAT WINS.\n\nPRIZES: 500, 250 AND 120 COINS, ONCE A REGATTA DAY. THE FIRST WIN TAKES THE REGATTA CUP.' +
                 (d.wins ? '\n\nYOUR WINS: ' + d.wins + '.' : '');
               if (!today) {
                 choose({ title: REGATTA.name, text: 'FRIDAYS, NOON TILL MIDNIGHT (EASTERN TIME): A START EVERY QUARTER OF AN HOUR OFF CROWNHAVEN.\n\n' + lines,
                          buttons: back ? [{ label: 'Back', act: function () { back(); return false; } }] : [], closeLabel: 'Done' });
                 return;
               }
               var fl = fleetFor(S.slot, S.at).map(function (b) { return b.name.toUpperCase(); }).join(', ');
               var bs = [];
               if (wid === REGATTA.port) bs.push({ label: 'Enter - to my sloop', act: function () { enter(wid); } });
               if (back) bs.push({ label: 'Back', act: function () { back(); return false; } });
               choose({ title: REGATTA.name, text: 'THE GUN AT ' + etText(S.et).toUpperCase() + ' (EASTERN), IN ' + mins + ' MIN, OFF THE HARBOUR MOUTH. ENTERED: ' + fl + '.\n\n' + lines +
                        (wid === REGATTA.port ? '' : '\n\nIT SAILS FROM CROWNHAVEN - ENTER THERE.'), buttons: bs, closeLabel: 'Done' });
             } };
  }
  // a regatta day: a word when you're on Lumar (once a day)
  setInterval(function () {
    var id = worldId();
    if (!id || id.indexOf('lumar') !== 0 || !regattaDay()) return;
    var d = load(), k = String(dayKey(now()));
    if (d.told === k) return;
    var S = nextStart();
    if (!S) return;
    d.told = k; save(d);
    toast(REGATTA.name, 'Today off Crownhaven', 'a start every quarter hour · enter at any harbourmaster\'s');
  }, 20000);

  return { here: here, choose: choose_, start: start, peer: peer, gone: gone, stop: stop, COURSES: COURSES, REGATTA: REGATTA,
           nextStart: nextStart, regattaDay: regattaDay, enter: enter, bookRow: bookRow, fleetFor: fleetFor,
           _spec: function (slot) { var S = nextStart(); return spec(slot != null ? { at: S.at, slot: slot, day: S.day } : S, 0); }, _r: function () { return R; } };
})();
