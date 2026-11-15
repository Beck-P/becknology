/**
 * BridgeVillage — Brambleford grows with you (Verdance; Beck: "I like the idea that you grow the village… that's fun").
 *
 * Station Road, the village's east end (world verdance-east, scenes/verdance_east.py), is a quiet end when you first
 * walk it: the tea rooms boarded up, the dairy to let, two building plots in the nettles, the halt closed, the old
 * bridge over the river fallen in. The village fund — the board on the green — takes your coins for five projects; when
 * one's paid for, the village gets to work, and an hour later it's done:
 *
 *   bridge   mend the old bridge            the road south over it to the Downs (js/countryside.js)
 *   cafe     open the tea rooms as a café   Juniper Lowe's Kettle & Crumb: the village's living room, cooking what you grow
 *   dairy    bring in a cheesemaker         Hester Wold's Wold Dairy: cheeses, and your own milk aged into cheese
 *   homes    build two cottages             the Ashdowns move in, and more people about
 *   station  reopen the halt                Mr Pike, and the branch line to Thistlecombe on the river
 *
 * Each is a scene variant on Station Road (shut / open), so the place visibly fills up; and every project done brings
 * more people out on Brambleford's street and Station Road (BridgeCrowd.more). Kept in localStorage `bridge_village`.
 *
 * As a world loads (js/world.js decorate): Station Road's layers, who's there, what you can do at each place, the
 * bridge's tiles walkable or not; Brambleford's way east at the end of the main street.
 */
var BridgeVillage = (function () {
  var KEY = 'bridge_village', WID = 'verdance-east', TOWN = 'verdance-village';
  var BUILD = 60 * 60000;                                      // from paid for to done
  var PROJECTS = [
    { id: 'bridge', name: 'Mend the old bridge', cost: 1200, layer: ['broken', 'mended'], who: 'Wat and the Ashby boys',
      what: 'THE OLD BRIDGE FELL IN THE WINTER FLOOD. MEND IT AND THE ROAD SOUTH IS OPEN AGAIN - OVER THE DOWNS TO THISTLECOMBE ON THE RIVER.',
      done: 'THE BRIDGE IS WHOLE AGAIN, NEW SETTS ON THE DECK AND A LAMP AT EACH END. THE ROAD SOUTH IS OPEN.' },
    { id: 'cafe', name: 'Open the tea rooms as a café', cost: 2000, layer: ['shut', 'open'], who: 'Juniper Lowe',
      what: 'THE OLD TEA ROOMS HAVE BEEN SHUT SINCE MRS ARDEN RETIRED. JUNIPER LOWE, BRIDGET\'S NIECE, WOULD RUN THEM AS A CAFE - "A PROPER ONE. WITH WHAT GROWS HERE ON THE MENU."',
      done: 'THE KETTLE & CRUMB IS OPEN: TABLES OUT ON THE PAVEMENT, LIGHTS ALONG THE FRONT, AND JUNIPER BEHIND THE COUNTER.' },
    { id: 'dairy', name: 'Bring in a cheesemaker', cost: 2500, layer: ['empty', 'open'], who: 'Hester Wold',
      what: 'THE OLD DAIRY IS TO LET. HESTER WOLD MAKES CHEESE OVER IN THE WOLDS AND WANTS A PLACE NEARER THE MILK. FIT IT OUT AND SHE\'LL COME.',
      done: 'THE WOLD DAIRY IS OPEN: ROUNDS OF CHEESE ON THE RACK OUTSIDE, CHURNS ON THE STAND. HESTER WILL AGE YOUR OWN MILK INTO CHEESE.' },
    { id: 'homes', name: 'Build two cottages', cost: 4000, layer: ['plots', 'built'], who: 'the Ashdowns',
      what: 'TWO PLOTS ON STATION ROAD, PEGGED OUT YEARS AGO. BUILD ON THEM AND FAMILIES CAN MOVE IN - THE ASHDOWNS ARE WAITING ON ONE ALREADY.',
      done: 'TWO NEW COTTAGES ON STATION ROAD, SMOKE FROM BOTH CHIMNEYS. THE ASHDOWNS HAVE MOVED IN, AND THE VILLAGE IS BUSIER FOR IT.' },
    { id: 'station', name: 'Reopen the halt', cost: 6000, layer: ['closed', 'open'], who: 'Mr Pike',
      what: 'BRAMBLEFORD HALT CLOSED WHEN THE BRANCH LINE STOPPED PAYING. REOPEN IT AND THE LITTLE TRAIN RUNS AGAIN - TO THISTLECOMBE ON THE RIVER IN A FEW MINUTES.',
      done: 'THE HALT IS OPEN: PAINTED, LAMPS LIT, MR PIKE ON THE PLATFORM WITH HIS WATCH. THE BRANCH LINE RUNS TO THISTLECOMBE.' }
  ];
  var SITE = { cafe: [9, 11], homes: [15, 10], dairy: [24, 11], station: [32, 11], bridge: [19, 23] };
  var BRIDGE_TILES = [[18, 24], [19, 24], [18, 25], [19, 25], [18, 26], [19, 26], [18, 27], [19, 27], [18, 28], [19, 28]];
  var PEOPLE = { cafe: 'JUNIPER', dairy: 'HESTER', station: 'MR PIKE' };
  var CHEESE_DAYS = 1, CHEESE_MILK = 4;                       // four pails of your milk → a farmhouse cheese, a day on the shelf

  // the second ring (spec-deeper-worlds V4): once the five are done, a small want a week — coins and something of yours,
  // done the day it's paid for, stood on Station Road as a prop drawn in code (`ring` below), a line on the green
  var WANTS = [
    { id: 'bench', name: 'A bench by the duck pond', cost: 300, needs: { sunflower: 4 }, at: [9, 20], kind: 'bench',
      what: 'THE VICAR WANTS A BENCH ON THE POND\'S BANK, FOR WATCHING THE DUCKS. WAT WILL MAKE IT FOR 300 COINS - AND FOUR OF YOUR SUNFLOWERS TO PLANT ROUND IT.',
      line: 'A NEW BENCH ON THE POND\'S BANK, SUNFLOWERS ROUND IT. SOMEBODY HAS ALREADY CARVED THEIR INITIALS IN IT.' },
    { id: 'ducks', name: 'A house for the ducks', cost: 250, needs: { wheat: 6 }, at: [6, 18], kind: 'duck_house',
      what: 'THE DUCKS NEST IN THE REEDS AND THE FOX KNOWS IT. A LITTLE HOUSE ON A POST IN THE POND, 250 COINS - AND SIX SHEAVES OF YOUR WHEAT, FOR THE STRAW.',
      line: 'A DUCK HOUSE ON A POST IN THE POND, A RAMP DOWN TO THE WATER. THE DUCKS PRETEND THEY DON\'T CARE FOR IT.' },
    { id: 'tubs', name: 'Tubs of flowers by the fund board', cost: 300, needs: { moonflower: 4 }, at: [[14, 14], [16, 14]], kind: 'tub',
      what: 'TWO HALF-BARRELS EITHER SIDE OF THIS BOARD, FULL OF FLOWERS. 300 COINS - AND FOUR OF YOUR MOONFLOWERS, SO THE GREEN GLOWS AFTER DARK.',
      line: 'TUBS OF FLOWERS EITHER SIDE OF THE FUND BOARD, YOUR MOONFLOWERS IN THEM. THEY OPEN AT DUSK.' },
    { id: 'lamp', name: 'A lamp by the pond bench', cost: 450, needs: { beeswax_candles: 1 }, at: [8, 20], kind: 'lamp', after: 'bench',
      what: 'A LAMP BESIDE THE NEW BENCH, SO FOLK CAN SIT OUT OF AN EVENING. 450 COINS - AND A BUNDLE OF BEESWAX CANDLES. NO PARAFFIN ON THE GREEN, THE VICAR SAYS.',
      line: 'A LAMP BY THE POND BENCH, LIT WITH YOUR CANDLES. IT SMELLS OF HONEY WHEN IT\'S BURNING.' },
    { id: 'birds', name: 'A bird table under the oak', cost: 200, needs: { seed_sunflower: 6 }, at: [12, 18], kind: 'bird_table',
      what: 'THE SCHOOL WANTS A BIRD TABLE ON THE GREEN, BY THE OLD OAK, TO COUNT WHAT COMES. 200 COINS - AND SIX OF YOUR SUNFLOWER SEEDS TO START IT OFF.',
      line: 'A BIRD TABLE UNDER THE OLD OAK, SUNFLOWER SEED ON IT. THE CHILDREN HAVE COUNTED FOURTEEN KINDS. THEY ARGUE ABOUT TWO.' }
  ];
  var JUDGE_DAY = 5;                                           // Friday of a Verdance season (its week): the county's judge comes round

  var s = load();
  function load() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    d = d || {};
    return { fund: d.fund || {}, paid: d.paid || {}, larder: d.larder || {}, shelf: d.shelf || [], given: d.given || 0, seen: d.seen || {},
             wants: d.wants || {}, judged: d.judged || {} };
  }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private mode */ } }
  function say(t, x) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(t, x); }
  function choose(spec) { if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.choose) BridgeInteractions.choose(spec); }
  function toast(a, b, c) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(a, b, c); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function count(id) { return typeof BridgeInventory !== 'undefined' ? BridgeInventory.getCount(id) : 0; }
  function nameOf(id) { var i = typeof BridgeItems !== 'undefined' && BridgeItems.get(id); return i ? i.name : id; }
  function charge(n, why) {
    return typeof BridgeProgression !== 'undefined' && BridgeProgression.wagerCoins
      ? BridgeProgression.wagerCoins(n, why).then(function (r) { return r || { ok: false }; }, function () { return { ok: false }; })
      : Promise.resolve({ ok: false, reason: 'offline' });
  }
  function pay(n, why) {
    return typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins ? BridgeProgression.awardCoins(n, why) : Promise.resolve(null);
  }
  function why(r) { var x = r && r.reason; return x === 'offline' || x === 'no_client' || x === 'no_pilot' || x === 'error' ? 'NO WAY TO MOVE COINS RIGHT NOW.' : 'NOT ENOUGH COINS.'; }
  function here() { return typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId ? BridgeWorld.getWorldId() : null; }
  function project(id) { return PROJECTS.filter(function (p) { return p.id === id; })[0]; }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  // ---- where a project stands -------------------------------------------------------------------------------------
  /** 'open' (still taking coins), 'building' (paid for, the village at work), 'done'. */
  function state(id) {
    var t = s.paid[id];
    if (!t) return 'open';
    return Date.now() >= t + BUILD ? 'done' : 'building';
  }
  function done(id) { return state(id) === 'done'; }
  function stage() { return PROJECTS.filter(function (p) { return done(p.id); }).length; }
  function left(id) { var p = project(id); return Math.max(0, p.cost - (s.fund[id] || 0)); }
  // the Downs: the bridge mended opens the road south (until the Downs are built it's a pleasant dead end)
  function roadSouth() { return done('bridge'); }

  // ---- the second ring: a small want a week once the five are done -------------------------------------------------
  function etNow() { return typeof BridgeClock !== 'undefined' && BridgeClock.etNow ? BridgeClock.etNow() : Date.now(); }
  function weekOf(et) { return Math.floor((Math.floor(et / 86400000) + 3) / 7); }      // weeks start on a Monday (js/seasons.js)
  function ringOpen() { return stage() >= PROJECTS.length; }
  function wantDone(id) { return !!s.wants[id]; }
  function wantsDone() { return WANTS.filter(function (w) { return wantDone(w.id); }); }
  function want(id) { return WANTS.filter(function (w) { return w.id === id; })[0]; }
  /** This week's want: the first not done — once the five are done, and a week (a Verdance season) after the last. */
  function wantNow() {
    if (!ringOpen()) return null;
    var last = 0;
    WANTS.forEach(function (w) { if (s.wants[w.id]) last = Math.max(last, s.wants[w.id]); });
    if (last && weekOf(etNow()) <= weekOf(last)) return null;   // one a week (when each was done: Eastern time, as the seasons go)
    return WANTS.filter(function (w) { return !wantDone(w.id); })[0] || null;
  }
  function needsText(w) { return Object.keys(w.needs).map(function (k) { return w.needs[k] + ' ' + nameOf(k).toLowerCase(); }).join(', '); }
  function short(w) { return Object.keys(w.needs).filter(function (k) { return count(k) < w.needs[k]; }); }
  function wantDetail(w) {
    var lack = short(w);
    choose({
      title: w.name,
      text: w.what + '\n\n' + (lack.length ? 'YOU\'RE SHORT: ' + lack.map(function (k) { return (w.needs[k] - count(k)) + ' ' + nameOf(k).toUpperCase(); }).join(', ') + '.' : 'YOU HAVE WHAT IT NEEDS.'),
      rows: [{ label: 'Pay for it', sub: fmt(w.cost) + ' coins and ' + needsText(w), note: lack.length ? 'not yet' : '', disabled: !!lack.length, pick: function () { payWant(w); } }],
      closeLabel: 'Back'
    });
  }
  function payWant(w) {
    if (short(w).length || wantDone(w.id)) return;
    charge(w.cost, 'village:want:' + w.id).then(function (r) {
      if (!r.ok) { say('THE VILLAGE FUND', why(r)); return; }
      if (short(w).length) { pay(w.cost, 'village:want:refund'); return say('THE VILLAGE FUND', 'SOMETHING\'S GONE FROM YOUR PACK.'); }
      Object.keys(w.needs).forEach(function (k) { BridgeInventory.removeItem(k, w.needs[k]); });
      s.wants[w.id] = etNow(); s.given += w.cost; store();
      sfx('coin');
      toast('Brambleford', w.name + ' - done', 'the village thanks ' + farmName());
      say(w.name.toUpperCase(), 'DONE BY THE AFTERNOON. ' + w.line + '\n\nTHE NEXT LITTLE WANT GOES ON THE BOARD NEXT WEEK.');
      later();
    });
  }

  // Best Kept Village: once a season (a Verdance week), from its Friday, the county's judge reads what you've done
  function judgeWeek() { return weekOf(etNow()); }
  function judging() {
    if (!ringOpen() || !wantsDone().length) return false;
    var d = (Math.floor(etNow() / 86400000) + 3) % 7 + 1;                // 1 Monday … 7 Sunday
    return d >= JUDGE_DAY && !s.judged[judgeWeek()];
  }
  var PLACES = [[5, 'FIRST', 400, 'blue_rosette'], [3, 'SECOND', 200, 'red_rosette'], [1, 'HIGHLY COMMENDED', 100, 'yellow_rosette']];
  function verdict() {
    var n = wantsDone().length, P = PLACES.filter(function (p) { return n >= p[0]; })[0];
    return { n: n, place: P[1], coins: P[2], rosette: P[3] };
  }
  function bestKept() {
    var v = verdict(), done = wantsDone();
    var season = typeof BridgeSeasons !== 'undefined' && BridgeSeasons.now ? BridgeSeasons.now().name.toUpperCase() : 'THIS SEASON\'S';
    var read = 'BEST KEPT VILLAGE - THE ' + season + ' JUDGING. MRS PRIDDY FROM THE COUNTY, IN A HAT, WITH A CLIPBOARD:\n\n' +
      '"A MENDED BRIDGE, A CAFE, A DAIRY, TWO NEW COTTAGES AND A HALT THAT RUNS. ' +
      done.map(function (w) { return w.name.replace(/^A /, 'A ').toUpperCase(); }).join('. ') + '. ' +
      (v.n >= 5 ? 'I HAVE NOTHING TO ADD. I HAVE NEVER HAD NOTHING TO ADD."' : v.n >= 3 ? 'VERY NEARLY THERE."' : 'A START. A GOOD START."') +
      '\n\nBRAMBLEFORD: ' + v.place + '. THE VICAR SAYS IT\'S YOURS AS MUCH AS ANYONE\'S.';
    s.judged[judgeWeek()] = Date.now(); store();
    pay(v.coins, 'village:bestkept').then(function () {
      if (typeof BridgeInventory !== 'undefined') (BridgeInventory.give || BridgeInventory.addItem)(v.rosette, 1);
      toast('Best Kept Village', 'Brambleford: ' + v.place.toLowerCase(), '+' + v.coins + ' coins and a rosette');
    });
    say('BEST KEPT VILLAGE', read);
  }

  // ---- the fund board -----------------------------------------------------------------------------------------------
  function fund() {
    tick();
    var n = stage();
    choose({
      title: 'The village fund',
      text: 'A BOARD ON THE GREEN, A TIN WITH A SLOT, AND A LIST IN THE VICAR\'S HAND: WHAT THE VILLAGE COULD DO WITH A LITTLE HELP. ' +
            (n ? n + ' OF ' + PROJECTS.length + ' DONE SO FAR' + (s.given ? ' - YOU\'VE PUT IN ' + fmt(s.given) + ' COINS.' : '.') : 'NOTHING DONE YET.'),
      art: drawTally,
      rows: ringRows().concat(PROJECTS.map(function (p) {
        var st = state(p.id);
        return { label: p.name, sub: st === 'done' ? 'done' : st === 'building' ? 'being built: ' + mins(s.paid[p.id] + BUILD - Date.now()) :
                 fmt(s.fund[p.id] || 0) + ' / ' + fmt(p.cost), note: st === 'open' ? fmt(left(p.id)) + ' to go' : '', draw: tallyIcon(p.id),
                 disabled: st === 'done', pick: function () { detail(p.id); } };
      }))
    });
  }
  // the second ring on the board, above the five: the judge's report when it's in, this week's want, what's been done
  function ringRows() {
    if (!ringOpen()) return [];
    var rows = [], w = wantNow();
    if (judging()) rows.push({ label: 'Best Kept Village: the judge\'s report', sub: 'pinned on top, this week', note: 'read it', icon: verdict().rosette, pick: bestKept });
    if (w) rows.push({ label: 'This week: ' + w.name.replace(/^A /, 'a ').replace(/^Tubs/, 'tubs'), sub: fmt(w.cost) + ' coins and ' + needsText(w), note: short(w).length ? 'you\'re short - ' + (document.documentElement.classList.contains('touch') ? 'tap' : 'pick it') + ' to see' : 'you can pay for it now', draw: ringIcon(w.kind), pick: function () { wantDetail(w); } });
    else if (wantsDone().length < WANTS.length) rows.push({ label: 'Next week\'s little want', sub: 'goes up on Monday', disabled: true });
    wantsDone().forEach(function (d) { rows.push({ label: d.name, sub: 'done', draw: ringIcon(d.kind), disabled: true }); });
    return rows;
  }
  function mins(ms) { var m = Math.max(1, Math.ceil(ms / 60000)); return m >= 60 ? 'an hour' : m + (m === 1 ? ' minute' : ' minutes'); }
  function detail(id) {
    var p = project(id), st = state(id), need = left(id);
    if (st !== 'open') return say(p.name.toUpperCase(), st === 'done' ? p.done : 'PAID FOR. ' + p.who.toUpperCase() + ' ARE AT IT - DONE IN ' + mins(s.paid[id] + BUILD - Date.now()).toUpperCase() + '.');
    var steps = [100, 500, 1000].filter(function (v) { return v < need; });
    choose({
      title: p.name,
      text: p.what + '\n\n' + fmt(s.fund[id] || 0) + ' OF ' + fmt(p.cost) + ' COINS IN THE TIN.',
      rows: steps.map(function (v) { return { label: 'Put in ' + fmt(v), note: v + ' coins', pick: function () { give(id, v); } }; })
        .concat([{ label: 'Pay the rest', note: fmt(need) + ' coins', pick: function () { give(id, need); } }]),
      closeLabel: 'Back'
    });
  }
  function give(id, n) {
    n = Math.min(n, left(id));
    if (n <= 0) return;
    charge(n, 'village:' + id).then(function (r) {
      if (!r.ok) { say('THE VILLAGE FUND', why(r)); return; }
      s.fund[id] = (s.fund[id] || 0) + n; s.given += n;
      sfx('coin');
      if (left(id) <= 0 && !s.paid[id]) {
        s.paid[id] = Date.now(); store();
        var p = project(id);
        toast('The village', p.name + ': paid for', p.who + ' start today');
        say(p.name.toUpperCase(), 'THE TIN\'S FULL. ' + p.who.toUpperCase() + ' WILL START TODAY - IT\'LL BE DONE WITHIN THE HOUR.');
        return;
      }
      store();
      detail(id);
    });
  }
  // a little board of the five, ticked off
  function drawTally(cv) {
    cv.width = 220; cv.height = 46;
    var g = cv.getContext('2d');
    g.fillStyle = '#3a5a32'; g.fillRect(0, 0, 220, 46);
    g.fillStyle = '#d8c890'; g.fillRect(0, 0, 220, 2); g.fillRect(0, 44, 220, 2);
    PROJECTS.forEach(function (p, i) {
      var x = 10 + i * 42, st = state(p.id), f = Math.min(1, (s.fund[p.id] || 0) / p.cost);
      g.fillStyle = '#24361e'; g.fillRect(x, 8, 32, 30);
      g.fillStyle = st === 'done' ? '#f0d060' : st === 'building' ? '#e0a040' : '#8aa870';
      g.fillRect(x + 2, 8 + 28 - Math.round(26 * f), 28, Math.round(26 * f));
      tallyIcon(p.id)(g, 24, x + 4, 11);
    });
  }
  function tallyIcon(id) {
    return function (g, size, ox, oy) {
      var u = size / 16; ox = ox || 0; oy = oy || 0;
      function r(c, a, b, w, h) { g.fillStyle = c; g.fillRect(ox + a * u, oy + b * u, w * u, h * u); }
      if (id === 'bridge') { r('#a89c88', 1, 8, 14, 3); r('#5a5048', 4, 11, 8, 3); r('#2a5a6a', 1, 13, 14, 2); }
      else if (id === 'cafe') { r('#f4f0e8', 4, 6, 7, 7); r('#2a1608', 11, 7, 2, 4); r('#a8744a', 4, 6, 7, 2); }
      else if (id === 'dairy') { r('#c89a40', 2, 6, 12, 6); r('#f0d070', 2, 6, 12, 2); r('#2a1608', 10, 6, 3, 2); }
      else if (id === 'homes') { r('#c4a25a', 2, 4, 12, 4); r('#f0e6cc', 3, 8, 10, 6); r('#5a3e22', 7, 10, 2, 4); }
      else { r('#2e4a3a', 1, 5, 14, 7); r('#f0d050', 3, 7, 3, 2); r('#2a2a2a', 3, 12, 3, 3); r('#2a2a2a', 10, 12, 3, 3); }
    };
  }

  // ---- the second ring's things, drawn in code on the 16-grid (as the fairs' props are, js/festivals.js) and stood in
  //      the scene like anyone else: depth-tested against the render and lit by its light
  var art = {};
  function ringArt(kind, lit) {
    var key = kind + (lit ? ':lit' : '');
    if (art[key]) return art[key];
    var c = document.createElement('canvas'); c.width = 32; c.height = 48;
    var x = c.getContext('2d'), P = function (col, rs) { col && rs.forEach(function (r) { x.fillStyle = col; x.fillRect(r[0] * 2, r[1] * 2, r[2] * 2, r[3] * 2); }); };
    var o = '#2a1808';
    if (kind === 'bench') {                                        // seen from behind, looking at the pond: back rail, seat, legs
      P(o, [[0, 13, 16, 6], [1, 19, 2, 5], [13, 19, 2, 5]]);
      P('#8a5a2e', [[1, 14, 14, 2], [1, 17, 14, 1]]); P('#b07a3e', [[1, 14, 14, 1]]); P('#6a4422', [[2, 16, 1, 1], [13, 16, 1, 1], [2, 20, 1, 3], [13, 20, 1, 3]]);
      P('#f8c820', [[0, 21, 2, 2], [14, 21, 2, 2]]); P('#7a4e10', [[0, 21, 1, 1], [15, 21, 1, 1]]); P('#4a8a2a', [[1, 23, 1, 1], [14, 23, 1, 1]]);
    } else if (kind === 'duck_house') {                            // a little house on a post, a ramp to the water
      P(o, [[3, 6, 10, 9], [7, 15, 2, 8], [10, 14, 5, 2]]);
      P('#a04a30', [[3, 6, 10, 2], [4, 5, 8, 1]]); P('#c06040', [[4, 6, 8, 1]]);
      P('#efe2c6', [[4, 8, 8, 6]]); P('#2a1808', [[7, 10, 2, 3]]); P('#d8c8a8', [[4, 13, 8, 1]]);
      P('#6a4a2a', [[7, 15, 2, 7], [11, 15, 3, 1]]); P('#f0f0e8', [[12, 18, 2, 1]]); P('#e0a020', [[14, 18, 1, 1]]);
      P('#9ab8c8', [[5, 22, 6, 1]]);
    } else if (kind === 'tub') {                                   // a half-barrel of moonflowers (open and glowing after dark)
      P(o, [[2, 12, 12, 12]]);
      P('#3a7a2a', [[3, 13, 10, 5]]); P('#5a9a3a', [[4, 13, 8, 1]]);
      if (lit) { P('#e8f0ff', [[4, 13, 2, 2], [8, 12, 2, 2], [10, 15, 2, 2], [5, 16, 2, 1]]); P('#ffffff', [[4, 13, 1, 1], [8, 12, 1, 1], [10, 15, 1, 1]]); }
      else P('#c8d8b0', [[5, 14, 1, 2], [9, 13, 1, 2], [11, 15, 1, 2]]);
      P('#8a5a2a', [[3, 18, 10, 5]]); P('#b07a3a', [[3, 18, 10, 1]]); P('#3a3a40', [[3, 20, 10, 1]]);
    } else if (kind === 'lamp') {                                  // an iron post, a lantern with your candles in it
      P(o, [[7, 3, 2, 21], [5, 2, 6, 6], [5, 22, 6, 2]]);
      P('#3a3a44', [[7, 8, 1, 14], [5, 2, 6, 1], [5, 7, 6, 1]]); P('#5a5a66', [[8, 8, 1, 14]]);
      P(lit ? '#ffd870' : '#c8b890', [[6, 3, 4, 4]]); P(lit ? '#fff4c0' : '#f0e8d0', [[7, 4, 2, 2]]);
    } else if (kind === 'bird_table') {                            // a post, a tray with a little roof, seed on it, a robin
      P(o, [[2, 7, 12, 3], [3, 10, 10, 4], [7, 14, 2, 10], [5, 22, 6, 2]]);
      P('#a04a30', [[2, 7, 12, 2]]); P('#c06040', [[3, 7, 10, 1]]);
      P('#6a4a2a', [[3, 10, 1, 3], [12, 10, 1, 3], [7, 14, 1, 9]]); P('#8a5a2e', [[3, 13, 10, 1]]);
      P('#d8c070', [[5, 12, 5, 1]]); P('#6a3a1a', [[9, 11, 2, 2]]); P('#d84a20', [[10, 12, 1, 1]]);
    }
    art[key] = c;
    return c;
  }
  function ringIcon(kind) {
    return function (g, size, ox, oy) {
      var c = ringArt(kind, false);
      g.imageSmoothingEnabled = false;
      g.drawImage(c, 0, 8, 32, 40, ox || 0, (oy || 0), size * 0.8, size);
    };
  }
  function spots(w) { return typeof w.at[0] === 'number' ? [w.at] : w.at; }
  function dark(sc) {                                            // the hour the place is lit for (the live light's, so _force moves it), else the clock
    var Lt = typeof BridgeLit !== 'undefined' && BridgeLit.light ? BridgeLit.light((sc && sc.id) || WID) : null;
    var n = Lt ? (Lt.night != null ? Lt.night : Lt.P && Lt.P.night) : null;
    if (n != null) return n > 0.45;
    var k = typeof BridgeClock !== 'undefined' && BridgeClock.sky ? BridgeClock.sky(WID) : null; return !!k && k.sun < 0.35;
  }
  function ring(world, offX, offY, ts, nowMs, sc) {
    if (!sc || typeof BridgeScene === 'undefined' || here() !== WID || !ringOpen()) return [];
    var out = [], lit = dark(sc);
    wantsDone().forEach(function (w) {
      spots(w).forEach(function (p) {
        var c = ringArt(w.kind, lit && (w.kind === 'lamp' || w.kind === 'tub')), footRow = p[1] + 0.95;
        out.push({ footRow: footRow, draw: function (ctx) {
          var dx = Math.round(offX + p[0] * ts), dy = Math.round(offY + (p[1] + 1) * ts) - c.height;
          BridgeScene.drawOccluded(ctx, sc, c, 0, 0, c.width, c.height, dx, dy, footRow, offX, offY, BridgeScene.tintAt(sc, world, p[0], p[1], nowMs), null);
          if (lit && w.kind === 'lamp') {                          // the candle's light on the ground round it
            ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#c86a28';
            var cx = dx + 16, cy = dy + 46;
            [36, 26, 16].forEach(function (rx) {                     // three flat rings, as the lamp posts' pools are
              ctx.globalAlpha = 0.16 + 0.02 * Math.sin(nowMs / 170);
              for (var yy = -rx / 2; yy < rx / 2; yy += 2) { var hw = Math.round(rx * Math.sqrt(1 - Math.pow(yy / (rx / 2), 2)) / 2) * 2; ctx.fillRect(cx - hw, cy + yy, hw * 2, 2); }
            });
            ctx.globalAlpha = 0.25; ctx.fillStyle = '#ffb860'; ctx.fillRect(dx + 8, dy + 2, 16, 14);
            ctx.restore();
          }
        } });
      });
    });
    return out;
  }
  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('*', { items: ring });

  // ---- the places along Station Road -------------------------------------------------------------------------------
  function site(inter) {
    var p = project(inter.site), st = state(inter.site);
    if (st === 'building') return say(inter.label, 'SCAFFOLD, SAWDUST, ' + p.who.toUpperCase() + ' WHISTLING. "DONE IN ' + mins(s.paid[p.id] + BUILD - Date.now()).toUpperCase() + '," SOMEONE CALLS DOWN.');
    if (st === 'open') return say(inter.label, p.what + '\n\nTHE VILLAGE FUND ON THE GREEN HAS ' + fmt(s.fund[p.id] || 0) + ' OF ' + fmt(p.cost) + ' COINS TOWARD IT.');
    if (inter.site === 'cafe') return cafe();
    if (inter.site === 'dairy') return dairy();
    if (inter.site === 'station') return station();
    if (inter.site === 'homes') return say('THE NEW COTTAGES', 'TWO NEW COTTAGES, PAINT STILL FRESH. A CHILD\'S BICYCLE ON ITS SIDE IN ONE GARDEN, A ROW OF LETTUCES ALREADY IN THE OTHER. THE ASHDOWNS WAVE FROM THE WINDOW.');
    return say(p.name.toUpperCase(), p.done);
  }

  // the Kettle & Crumb: the menu, and what's on special from your own crops (what you've sold Juniper's larder)
  var MENU = [{ id: 'pot_of_tea', price: 5 }, { id: 'flat_white', price: 7 }, { id: 'scone_jam', price: 9 }, { id: 'carrot_cake', price: 11 }];
  var SPECIALS = [   // a special is on while the larder has what it's made from; each one sold uses one
    { id: 'granola', price: 16, from: ['apple', 'honey'], line: 'the very local granola' },
    { id: 'pumpkin_soup', price: 14, from: ['pumpkin'], line: 'pumpkin soup' },
    { id: 'scone_jam', price: 7, from: ['strawberry'], line: 'scones with your strawberry jam' },
    { id: 'carrot_cake', price: 9, from: ['carrot'], line: 'carrot cake from your carrots' }
  ];
  var BUYS = { strawberry: 18, pumpkin: 110, carrot: 24, apple: 7, honey: 30, milk: 34, egg: 12, turnip: 14, flour: 22, coffee_beans: 24 };
  function farmName() { return typeof BridgeHomestead !== 'undefined' && BridgeHomestead.name ? BridgeHomestead.name() : 'your farm'; }
  function specials() { return SPECIALS.filter(function (sp) { return sp.from.every(function (c) { return (s.larder[c] || 0) > 0; }); }); }
  function cafe() {
    var sp = specials();
    choose({
      title: 'The Kettle & Crumb',
      text: 'JUNIPER\'S CAFE: MISMATCHED CHAIRS, A WOOD STOVE, THE WHOLE VILLAGE IN AND OUT ALL DAY. ON THE BOARD: ' +
            (sp.length ? sp.map(function (x) { return x.line.toUpperCase(); }).join(', ') + ' - "WITH THANKS TO ' + farmName().toUpperCase() + '".' :
             'THE USUAL, AND A NOTE: "LOCAL PRODUCE WANTED - ASK JUNIPER."'),
      rows: MENU.concat(sp.map(function (x) { return { id: x.id, price: x.price, special: x }; })).map(function (m) {
        return { label: (m.special ? 'Special: ' : '') + nameOf(m.id), icon: m.id, note: m.price + ' coins', pick: function () { buy(m); } };
      }).concat([{ label: 'Sell Juniper produce for the menu', sub: 'she pays a little over Marlo', pick: larder },
                 { label: 'Sit a while', sub: 'a table out front', pick: sit }])
    });
  }
  function buy(m) {
    charge(m.price, 'cafe:' + m.id).then(function (r) {
      if (!r.ok) return say('THE KETTLE & CRUMB', why(r));
      if (!BridgeInventory.addItem(m.id, 1)) { pay(m.price, 'cafe:refund'); return say('THE KETTLE & CRUMB', 'NO ROOM IN YOUR PACK.'); }
      if (m.special) { m.special.from.forEach(function (c) { s.larder[c] = Math.max(0, (s.larder[c] || 0) - 1); }); store(); }
      sfx('coin'); cafe();
    });
  }
  function larder() {
    var have = Object.keys(BUYS).filter(function (k) { return count(k) > 0; });
    choose({
      title: 'Juniper\'s larder',
      text: have.length ? '"WHATEVER\'S GOOD. IT GOES ON THE BOARD WITH YOUR NAME ON IT."' : '"NOTHING ON YOU? BRING ME STRAWBERRIES, PUMPKINS, CARROTS, APPLES, HONEY, MILK - I\'LL COOK IT AND SAY WHERE IT CAME FROM."',
      rows: have.map(function (k) {
        return { label: nameOf(k), icon: k, sub: 'you have ' + count(k) + ' · in the larder ' + (s.larder[k] || 0), note: BUYS[k] + ' ea', pick: function () {
          var n = Math.min(count(k), 12);
          BridgeInventory.removeItem(k, n);
          s.larder[k] = (s.larder[k] || 0) + n; store();
          pay(BUYS[k] * n, 'cafe:larder').then(function () { sfx('coin'); toast('The Kettle & Crumb', '+' + BUYS[k] * n + ' coins', n + ' ' + nameOf(k).toLowerCase()); larder(); });
        } };
      }),
      closeLabel: 'Back'
    });
  }
  function sit() {
    say('THE KETTLE & CRUMB', 'YOU TAKE THE TABLE BY THE WINDOW. THE STOVE TICKS. SOMEBODY\'S DOG ASLEEP ON YOUR FOOT. A WHILE GOES BY, VERY PLEASANTLY.');
    if (typeof BridgeInventory !== 'undefined' && BridgeInventory.restoreEnergy) BridgeInventory.restoreEnergy(20);
  }

  // the Wold Dairy: Hester's cheeses for sale, and your milk on her shelves
  var CHEESES = [{ id: 'wold_cheese', price: 30 }, { id: 'wold_blue', price: 45 }];
  function dairy() {
    var ready = s.shelf.filter(function (c) { return c.ready <= Date.now(); }).length, ageing = s.shelf.length - ready;
    var rows = CHEESES.map(function (m) {
      return { label: nameOf(m.id), icon: m.id, note: m.price + ' coins', pick: function () {
        charge(m.price, 'dairy:' + m.id).then(function (r) {
          if (!r.ok) return say('WOLD DAIRY', why(r));
          if (!BridgeInventory.addItem(m.id, 1)) { pay(m.price, 'dairy:refund'); return say('WOLD DAIRY', 'NO ROOM IN YOUR PACK.'); }
          sfx('coin'); dairy();
        });
      } };
    });
    rows.push({ label: 'Leave milk to make cheese', sub: CHEESE_MILK + ' milk a round · you have ' + count('milk'), note: 'a day on the shelf', disabled: count('milk') < CHEESE_MILK,
                pick: function () {
                  BridgeInventory.removeItem('milk', CHEESE_MILK);
                  s.shelf.push({ ready: Date.now() + CHEESE_DAYS * 86400000 }); store(); sfx('pickup');
                  say('WOLD DAIRY', '"FOUR GOOD PAILS. I\'LL SET IT TONIGHT, PRESS IT, SALT IT AND TURN IT. COME BACK TOMORROW FOR A ROUND WITH YOUR NAME ON IT."');
                } });
    if (ready) rows.push({ label: 'Collect your cheese', sub: ready + ' ready', icon: 'farm_cheese', pick: function () {
      var n = 0;
      s.shelf = s.shelf.filter(function (c) { if (c.ready <= Date.now() && BridgeInventory.addItem('farm_cheese', 1)) { n++; return false; } return true; });
      store(); sfx('pickup');
      toast('Wold Dairy', n + ' farmhouse cheese' + (n > 1 ? 's' : ''), 'from your own milk');
      dairy();
    } });
    choose({
      title: 'Wold Dairy',
      text: 'COOL STONE INSIDE, RACKS OF ROUNDS TO THE CEILING, HESTER TURNING THEM ONE BY ONE.' + (ageing ? ' ' + ageing + ' OF YOURS ON THE SHELF, AGEING.' : ''),
      rows: rows
    });
  }

  // the halt: the timetable, and the train (js/countryside.js runs it once Thistlecombe is there)
  function station() {
    if (typeof BridgeCountryside !== 'undefined' && BridgeCountryside.train) return BridgeCountryside.train('verdance-east');
    say('BRAMBLEFORD HALT', 'MR PIKE HAS THE PLATFORM SWEPT AND THE LAMPS TRIMMED. "FIRST TRAIN RUNS WHEN THE LINE\'S INSPECTED. ANY DAY NOW."');
  }

  function livery(inter) {
    if (typeof BridgeCountryside !== 'undefined' && BridgeCountryside.livery) return BridgeCountryside.livery(inter);
    say("HOBB'S LIVERY", 'FOUR STALLS, THREE HORSES, ONE OPINIONATED GOAT. HOBB SAYS HE\'LL HAVE A HORSE FOR YOU WHEN THE ROAD SOUTH IS OPEN - "NO SENSE A HORSE WITH NOWHERE TO GO."');
  }

  // ---- as the places load --------------------------------------------------------------------------------------------
  function decorate(worldId, data) {
    tick();
    if (worldId === TOWN && data) return town(data);
    if (worldId !== WID || !data) return;
    var layers = {};
    PROJECTS.forEach(function (p) { layers[p.id] = done(p.id) ? p.layer[1] : p.layer[0]; });
    if (data.scene) {
      data.scene.layers = layers;
      var sm = (data.scene.smoke || []).slice(), when = data.scene.smokeWhen || {};
      Object.keys(when).forEach(function (k) { if (done(k)) sm = sm.concat(when[k]); });
      data.scene.smoke = sm;
      // who's there: the people a project brings stand at their doors only once it's done
      data.scene.actors = (data.scene.actors || []).filter(function (a) {
        if (!a.when || done(a.when)) return true;
        if (data.collisions[a.y]) data.collisions[a.y][a.x] = 0;
        return false;
      });
    }
    var gone = Object.keys(PEOPLE).filter(function (k) { return !done(k); }).map(function (k) { return PEOPLE[k]; });
    data.interactions = (data.interactions || []).filter(function (it) { return gone.indexOf(it.label) < 0; });
    data.interactions.forEach(function (it) {
      if (it.type !== 'village_site' || !done(it.site)) return;
      if (it.site === 'cafe') { it.label = 'THE KETTLE & CRUMB'; it.prompt = 'PRESS E TO GO IN'; }
      if (it.site === 'dairy') { it.label = 'WOLD DAIRY'; it.prompt = 'PRESS E TO GO IN'; }
      if (it.site === 'station') { it.label = 'BRAMBLEFORD HALT'; it.prompt = 'PRESS E FOR THE TRAIN'; }
      if (it.site === 'homes') { it.label = 'THE NEW COTTAGES'; }
      if (it.site === 'bridge') { it.label = 'THE BRIDGE'; }
    });
    // the second ring: each want done stands where it was asked for (solid while it's there), with a line of its own
    wantsDone().forEach(function (w) {
      spots(w).forEach(function (p) {
        if (data.collisions[p[1]]) data.collisions[p[1]][p[0]] = 1;
        if (w.kind === 'bench' || w.kind === 'lamp' || w.kind === 'bird_table')
          data.interactions.push({ x: p[0], y: p[1], type: 'dialog', label: w.name.replace(/^A /, '').replace(/ (by|under) .*$/, '').toUpperCase(), prompt: 'PRESS E TO LOOK', dialog: w.line });
      });
      data.interactions.forEach(function (it) {                  // and a line on the green where it is
        if (w.id === 'ducks' && it.label === 'DUCK POND' && typeof it.dialog === 'string') it.dialog += ' ' + w.line;
        if (w.id === 'birds' && it.label === 'THE OLD OAK' && typeof it.dialog === 'string') it.dialog += ' UNDER IT, A BIRD TABLE: THE SCHOOL\'S.';
      });
    });
    if (gate) data.interactions.forEach(function (it) { if (it.target === TOWN) it.spawn = gate.slice(); });
    // the bridge: across it once it's mended, the river in the way till then
    BRIDGE_TILES.forEach(function (t) { if (data.collisions[t[1]]) data.collisions[t[1]][t[0]] = done('bridge') ? 0 : 1; });
    // over it, the road south to the Downs (js/makers.js PLACES: once the Downs are there)
    if (done('bridge') && typeof BridgeMakers !== 'undefined' && BridgeMakers.PLACES.indexOf('verdance-downs') >= 0)
      [18, 19].forEach(function (x) {
        data.interactions.push({ x: x, y: data.height - 1, type: 'enter_world', label: 'THE DOWNS', prompt: 'PRESS E TO TAKE THE ROAD SOUTH', target: 'verdance-downs', spawn: [19, 1] });
      });
    if (typeof BridgeCrowd !== 'undefined' && BridgeCrowd.more) BridgeCrowd.more(WID, 1 + 0.25 * stage());
  }
  var gate = null;                                          // where you come back into Brambleford (its east edge)
  // Brambleford: its way east at the end of the main street, and busier for every project done
  function town(data) {
    var ins = data.interactions = data.interactions || [];
    if (!ins.some(function (it) { return it.target === WID; })) {
      // the open run of the east edge nearest the street (row 11), wherever Brambleford's own render leaves it open
      // (Brambleford's own last column is solid, so the way on is the street's last open tiles, a column or two in)
      var c = data.collisions || [], x = data.width - 1, best = null;
      for (; x > data.width - 4 && best === null; x--)
        for (var d = 0; d < 6 && best === null; d++) [11 - d, 11 + d].forEach(function (y) {
          if (best === null && c[y] && c[y][x] === 0 && c[y][x - 1] === 0) best = y;
        });
      if (best === null) x = data.width - 1; else x++;
      var y0 = best === null ? 11 : best;
      gate = [x - 1, y0];
      [y0 - 1, y0, y0 + 1].forEach(function (y) {
        if (y === y0 || (c[y] && c[y][x] === 0))
          ins.push({ x: x, y: y, type: 'enter_world', label: 'STATION ROAD', prompt: 'PRESS E TO WALK ON EAST', target: WID, spawn: [1, 11] });
      });
    }
    if (typeof BridgeCrowd !== 'undefined' && BridgeCrowd.more) BridgeCrowd.more(TOWN, 1 + 0.2 * stage());
  }

  // a project finishing while you're out and about: say so once
  function tick() {
    PROJECTS.forEach(function (p) {
      if (done(p.id) && !s.seen[p.id]) {
        s.seen[p.id] = Date.now(); store();
        toast('Brambleford', p.name + ' - done', p.who + (p.id === 'homes' ? ' have moved in' : ''));
        if (here() === WID) reload();
      }
    });
  }
  setInterval(tick, 20000);
  // once the dialog that said so is closed: Station Road again with it there
  function later() {
    var t = setInterval(function () {
      if (document.querySelector('#world-overlay .world-dialog')) return;
      clearInterval(t);
      if (here() === WID) reload();
    }, 400);
  }
  // reload Station Road so what's finished shows (and its walls stand), keeping you where you are
  function reload() {
    var x = BridgeCharacter.getX(), y = BridgeCharacter.getY();
    BridgeWorld.load(WID, function () {
      BridgeState.transition('world', { worldId: WID, spawn: { x: x, y: y } });
      var w = BridgeWorld.getWorld();
      if (w.collisions[y] && w.collisions[y][x]) BridgeCharacter.init(w.spawns.player[0], w.spawns.player[1]);
    });
  }

  if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.register) {
    BridgeInteractions.register('village_fund', fund, 'Read');
    BridgeInteractions.register('village_site', site, 'Look');
    BridgeInteractions.register('village_livery', livery, 'Look in');
  }

  function journal() {
    return { stage: stage(), of: PROJECTS.length, given: s.given, projects: PROJECTS.map(function (p) { return { id: p.id, name: p.name, state: state(p.id), fund: s.fund[p.id] || 0, cost: p.cost }; }) };
  }

  // someone who keeps a day (assets/routines.json) but hasn't moved in yet: not about till their project's done
  var WHO = { juniper: 'cafe', hester: 'dairy', pike: 'station' };
  function absent(id) { return !!WHO[id] && !done(WHO[id]); }

  // leading players to it: the Journal's Next up and the Map's Come back for (js/quests.js, js/map.js read these lists),
  // and Juniper's topic on the fund (people.json `when: 'gate:village-wants'`, js/quests.js `has`)
  function nextUp() {
    if (!ringOpen()) return [];
    var w = wantNow(), out = [];
    if (judging()) out.push({ tag: 'Village', title: 'Best Kept Village', text: 'The judge\'s report is pinned on the fund board on Station Road.', world: WID });
    if (w) out.push({ tag: 'Village', title: w.name, text: 'This week\'s want on Brambleford\'s fund board: ' + fmt(w.cost) + ' coins and ' + needsText(w) + '.', world: WID });
    return out;
  }
  function comeBack(wid) {
    if (wid !== WID || !ringOpen()) return [];
    return (judging() ? ['Best Kept Village: the judge\'s report'] : []).concat(wantsDone().length < WANTS.length ? ['the fund\'s little want, a new one each week'] : ['Best Kept Village, judged every Friday']);
  }
  (function reg() { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.gate) BridgeQuests.gate('village-wants', ringOpen); else setTimeout(reg, 100); })();   // (quests.js loads after this)
  window.BRIDGE_NEXTUP = (window.BRIDGE_NEXTUP || []).concat([function () { return nextUp(); }]);
  window.BRIDGE_COMEBACK = (window.BRIDGE_COMEBACK || []).concat([comeBack]);
  // what the wants take, on each thing's card (js/uses.js `own`)
  var USES = [];
  WANTS.forEach(function (w) { Object.keys(w.needs).forEach(function (id) {
    USES.push({ id: id, p: 3, t: '<b>Brambleford\'s fund</b> asks ' + w.needs[id] + ' for ' + w.name.replace(/^A /, 'a ').replace(/^Tubs/, 'tubs') + ', once its five projects are done' });
  }); });
  USES.push({ id: 'blue_rosette', p: 2, t: '<b>Best Kept Village</b>: Brambleford wins one when every little want on its fund board is done' });

  return { decorate: decorate, done: done, state: state, stage: stage, absent: absent, roadSouth: roadSouth, journal: journal, PROJECTS: PROJECTS,
           WANTS: WANTS, wantNow: wantNow, wantDone: wantDone, judging: judging, verdict: verdict, nextUp: nextUp, comeBack: comeBack, USES: USES,
           MAKES: [{ in: 'milk', n: CHEESE_MILK, out: 'farm_cheese', where: 'Hester\'s Wold Dairy' }],   // what someone here makes of yours (js/uses.js)
           reload: function () { s = load(); }, _s: function () { return s; }, _finish: function (id) { s.fund[id] = project(id).cost; s.paid[id] = Date.now() - BUILD - 1; store(); },
           _want: function (id, et) { s.wants[id] = et || etNow(); store(); }, _unjudge: function () { s.judged = {}; store(); } };
})();
