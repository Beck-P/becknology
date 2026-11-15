/**
 * BridgeLumarDeep — Lumar, deeper (spec-deeper-worlds L4–L7, L9): the capital's empty yards, Cinder Key's wanted board,
 * the dragon's room and the Old Bridge's booths given something to come back for. Each lives on what's already drawn and
 * who's already there; nothing here is a new person or new art beyond what's drawn in code.
 *
 *   L7  The Sovereign II: the Arsenal office's ledger (THE ARSENAL) of what the galleon on the stocks still wants — things
 *       the Workshop makes (`NEEDS`). Your share, put in from your pack (and the holds of your ships lying at Crownhaven),
 *       is entered; once it's all in she goes down the ways at the next Friday regatta — a happening at the Arsenal
 *       (js/events.js `sovereign`, `launchDue`), you knock out the last shore — your name goes in the Arsenal's book,
 *       600 coins and a plan the yard teaches (`PLANS`, the first you don't know).
 *   L6  Cinder Key's bounties: the WANTED board's three a week (Sunday to Saturday, Eastern; `bounties(ms)`, seeded by the
 *       week so two pilots chase the same three) — a black-sailed raider on the Crimson, a privateer gone bad on the
 *       Emerald lanes, a Crimson cutter. Once you've read the board they come looking for you (js/seafight.js `hunting`:
 *       a fight on their sea is likelier, and is them more often than not); sink one and Scarlet Dee pays the bounty and a
 *       piece of plunder Vesper buys (her *The bounties* topic, `claim`).
 *   L5  The dragon's riddle: once a Lumar day, the dragon in the cave under Crimson Reach asks a riddle whose answer is a
 *       thing on Lumar's islands (`RIDDLES`, the same for everyone that day); answer right and she lets you take one coin
 *       from the hoard (a heron coin). One answer a day.
 *   L4  The Old Bridge's booths open (`BOOTHS`): the tackle booth's silk line (used from your pack, the rare fish come up a
 *       little more for a Lumar day — js/fishing.js asks `lineOn`), the flower booth's posies, the sweet booth's toffee
 *       ships (a gift children love). The booths are matched by their labels as the bridge loads, so a re-render that
 *       keeps them moves them with it.
 *
 * Kept in localStorage `bridge_lumar_deep` (a `bridge_*` key: js/cloud.js carries it). Two pilots each keep their own:
 * the same needs, bounties and riddle, each one's share, sinkings, coins and answers their own.
 *
 *   BridgeLumarDeep.decorate(worldId, data)   (js/world.js, as a world loads)
 *   BridgeLumarDeep.nextUp(worldId), comeBack(worldId)   the Journal's Next up, the Map's Come back for
 *   BridgeLumarDeep.launchDue(slot), hunting(seas), beaten(id), lineOn()   asked by js/events.js, js/seafight.js, js/fishing.js
 */
var BridgeLumarDeep = (function () {
  var KEY = 'bridge_lumar_deep', DAY = 86400000, HOUR = 3600000, MIN = 60000;
  function has(n) { return typeof window[n] !== 'undefined'; }
  function load() {
    var s;
    try { s = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { s = {}; }
    s.sov = s.sov || {}; s.sov.given = s.sov.given || {};
    s.bounty = s.bounty || {}; s.bounty.beaten = s.bounty.beaten || {}; s.bounty.claimed = s.bounty.claimed || {};
    s.riddle = s.riddle || {};
    return s;
  }
  var st = load();
  function store() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode: this session only */ } }
  function now() { return has('BridgeClock') && BridgeClock.now ? BridgeClock.now() : Date.now(); }
  function etAt(ms) { return has('BridgeClock') && BridgeClock.etAt ? BridgeClock.etAt(ms) : ms - 5 * HOUR; }
  function say(who, t) { BridgeInteractions.say(who, t); }
  function sfx(n) { if (has('BridgeAudio') && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function toast(a, b, c) { if (has('BridgeQuests') && BridgeQuests.toast) BridgeQuests.toast(a, b, c); }
  function note(a, b, c) { if (has('BridgeQuests') && BridgeQuests.note) BridgeQuests.note(a, b, c); }
  function award(n, why) { if (has('BridgeProgression') && BridgeProgression.awardCoins) BridgeProgression.awardCoins(n, why); }
  function pay(n, why) {
    if (!has('BridgeProgression') || !BridgeProgression.wagerCoins) return Promise.resolve({ ok: false });
    return BridgeProgression.wagerCoins(n, why).then(function (r) { return r || { ok: false }; }, function () { return { ok: false }; });
  }
  function give(id, n) { if (has('BridgeInventory')) (BridgeInventory.give || BridgeInventory.addItem)(id, n || 1); }
  function count(id) { return has('BridgeInventory') && BridgeInventory.getCount ? BridgeInventory.getCount(id) : 0; }
  function iname(id) { var it = has('BridgeItems') && BridgeItems.get(id); return it ? it.name : String(id).replace(/_/g, ' '); }
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000003) / 1000003; }
  function pilotName() { var p = has('BridgeState') && BridgeState.getPilot ? BridgeState.getPilot() : null; return p && p.name ? String(p.name).toUpperCase() : 'YOU'; }
  function wid() { return has('BridgeWorld') && BridgeWorld.getWorldId ? BridgeWorld.getWorldId() || '' : ''; }
  function date(t) { var d = new Date(etAt(t)); return d.getUTCDate() + ' ' + ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][d.getUTCMonth()]; }
  /** Lumar's day (js/boards.js: 8 hours, from the Eastern date): the riddle's and the line's. */
  function lumarDay(ms) {
    if (has('BridgeBoards') && BridgeBoards.dayKey) return BridgeBoards.dayKey('lumar', ms);
    var et = etAt(ms == null ? now() : ms);
    return Math.floor(et / DAY) + '/' + Math.floor((((et % DAY) + DAY) % DAY) / (8 * HOUR));
  }

  // ==== L7 · The Sovereign II ==========================================================================================
  // your share of what the yard is short of: all things the Workshop makes (js/workshop.js RECIPES)
  var NEEDS = [['oak_plank', 12], ['iron_bar', 8], ['rope', 10], ['pitch', 6], ['sailcloth', 4]];
  var PAY = 600;
  var PLANS = ['long_nine', 'chaser', 'sheathing', 'carronade'];           // the yard teaches the first you don't know
  // the others in the book, before you (the Crown's friends: guilds and houses already in the capital)
  var BOOK = ['ASHGROVE & VANE, MERCHANTS', 'THE WORSHIPFUL GUILD OF SAILMAKERS (W. RIGG)', 'O. BRASSWORTH, INSTRUMENTS', 'THE CROWN & ANCHOR (H. MARSH), ONE BARREL'];
  function given(id) { return st.sov.given[id] || 0; }
  function wanted() { return NEEDS.reduce(function (a, n) { return a + n[1]; }, 0); }
  function entered() { return NEEDS.reduce(function (a, n) { return a + Math.min(n[1], given(n[0])); }, 0); }
  function sovDone() { return !!st.sov.done; }
  function launched() { return !!st.sov.launched; }
  // your ships lying at Crownhaven (the Arsenal's lighters fetch from them)
  function shipsHere() { return has('BridgeFleet') && BridgeFleet.all ? BridgeFleet.all().filter(function (s) { return s.type !== 'sloop' && !s.away && s.at === 'lumar-crown'; }) : []; }
  function inHolds(id) { return shipsHere().reduce(function (n, s) { return n + ((s.hold || {})[id] || 0); }, 0); }
  function haveFor(id) { return count(id) + inHolds(id); }
  function takeFor(id, n) {
    var a = Math.min(n, count(id));
    if (a > 0) { BridgeInventory.removeItem(id, a); n -= a; }
    shipsHere().forEach(function (s) {
      if (n <= 0 || !s.hold || !s.hold[id]) return;
      var b = Math.min(n, s.hold[id]); s.hold[id] -= b; if (s.hold[id] <= 0) delete s.hold[id]; n -= b;
      if (BridgeFleet.save) BridgeFleet.save();
    });
    return n <= 0;
  }
  function putIn(id) {
    var need = NEEDS.filter(function (x) { return x[0] === id; })[0];
    if (!need) return 0;
    var n = Math.min(need[1] - given(id), haveFor(id));
    if (n <= 0) return 0;
    takeFor(id, n);
    st.sov.given[id] = given(id) + n;
    if (!st.sov.begun) st.sov.begun = now();
    if (entered() >= wanted() && !st.sov.done) {
      st.sov.done = now();
      store();
      sfx('quest');
      toast('The Sovereign II', 'Your share is in', 'She goes down the ways at the Arsenal on Friday, regatta day');
      note('The Sovereign II', 'Your share is in', 'She launches at the Arsenal on the next regatta day (Fridays)');
    } else { store(); sfx('coin'); }
    return n;
  }
  function plan() {
    var W = has('BridgeWorkshop') ? BridgeWorkshop : null;
    if (st.sov.taught) return st.sov.taught;
    return PLANS.filter(function (r) { return !W || !W.known(r); })[0] || null;
  }
  // the Friday it launches: the regatta's day (js/race.js REGATTA: Fridays, noon to midnight Eastern)
  function regattaAt(ms) {
    var R = has('BridgeRace') && BridgeRace.REGATTA ? BridgeRace.REGATTA : { dow: 5, from: 12, to: 24 };
    var et = etAt(ms), d = new Date(et), h = d.getUTCHours() + d.getUTCMinutes() / 60;
    return d.getUTCDay() === R.dow && h >= R.from && h < R.to - 0.35;
  }
  function weather() { return has('BridgeWeather') && BridgeWeather.at ? BridgeWeather.at('lumar') : null; }
  /** js/events.js: is the Sovereign's launch due in this twenty-minute slot (your share in, not yet launched, a regatta
   *  Friday)? → the moment it starts, or null. Every slot of the day until you've seen her go. */
  function launchDue(slot) {
    var t = slot * 20 * MIN + MIN;
    if (st.sov.launched && st.sov.launched >= t && st.sov.launched < t + 6 * MIN) return t;   // the slot she went in: the crowd stays to cheer
    if (!st.sov.done || st.sov.launched) return null;
    if (t < st.sov.done || !regattaAt(t)) return null;
    return t;
  }
  function nextFriday() {
    var t = Math.max(now(), st.sov.done || 0);
    for (var i = 0; i < 8 * 24; i++) { var at = t + i * HOUR; if (regattaAt(at)) return at; }
    return null;
  }
  function launch(how) {
    if (st.sov.launched) return false;
    var r = plan();
    st.sov.launched = now(); st.sov.taught = r; store();
    award(PAY, 'quest:sovereign');
    if (r && has('BridgeWorkshop') && BridgeWorkshop.learn) BridgeWorkshop.learn(r, true);
    sfx('success');
    var pn = r && has('BridgeWorkshop') ? BridgeWorkshop.name(r).toLowerCase() : '';
    toast('The Sovereign II', 'Launched', '+' + PAY + ' coins' + (pn ? ' · the yard\'s plan for ' + (/^[aeiou]/.test(pn) ? 'an ' : 'a ') + pn : ''));
    note('The Sovereign II', 'Saw her go down the ways', how === 'shore' ? 'you knocked out the last shore' : 'from the Arsenal quay');
    return { plan: r, name: pn };
  }
  function sovLaunchText(r) {
    return 'AGNES ROOK PUTS THE MAUL IN YOUR HANDS. "YOUR TIMBER. YOUR BLOW." ONE SWING AND THE LAST DOG-SHORE JUMPS CLEAR. FOR A HEARTBEAT NOTHING HAPPENS. THEN THE SOVEREIGN II SHIVERS, CREAKS, AND GOES DOWN THE WAYS IN A ROAR OF SMOKING TALLOW, AND SITS DOWN IN THE HARBOUR LIKE A DUCHESS INTO A BATH. THE WHOLE YARD CHEERS.' +
      '\n\nTHE CLERK WRITES YOUR NAME IN THE ARSENAL\'S BOOK. +' + PAY + ' COINS' + (r && r.name ? ', AND THE YARD SHOWS YOU HOW THEY CAST ' + (/^[aeiou]/.test(r.name) ? 'AN ' : 'A ') + r.name.toUpperCase() + '.' : '.');
  }
  /** The launch happening's own (js/events.js): you knock out the last shore — once. */
  function shore() {
    var r = launch('shore');
    if (r) say('THE LAUNCH', sovLaunchText(r));
    else say('THE LAUNCH', 'SHE\'S AFLOAT. THE YARD IS ALREADY ARGUING ABOUT WHO GETS TO PAINT HER NAME ON.');
  }
  /** It ran its course with you there: she's launched, if you didn't swing the maul yourself. */
  function watched() { var r = launch('watched'); if (r) say('THE SOVEREIGN II', 'NOBODY WAITS FOR YOU TO SWING: A SHIPWRIGHT KNOCKS OUT THE LAST SHORE AND SHE GOES DOWN THE WAYS TO A ROAR FROM THE QUAY.\n\nTHE CLERK WRITES YOUR NAME IN THE ARSENAL\'S BOOK ALL THE SAME. +' + PAY + ' COINS' + (r.name ? ', AND THE PLAN FOR ' + (/^[aeiou]/.test(r.name) ? 'AN ' : 'A ') + r.name.toUpperCase() + '.' : '.')); }

  function ledger() {
    var rows, text, name = pilotName();
    if (launched()) {
      text = 'THE ARSENAL\'S BOOK, OPEN AT THE SOVEREIGN II: LAUNCHED ' + date(st.sov.launched) + ' BEFORE THE REGATTA, BUILT WITH THE HELP OF THE CROWN\'S FRIENDS. THE CLERK TURNS IT SO YOU CAN READ YOUR OWN NAME.' +
             '\n\n"HER SISTER\'S ON THE STOCKS NOW. SAME LEDGER, SAME SHORTAGES. THE CROWN NEVER LEARNS."';
      rows = BOOK.map(function (b) { return { label: b, info: true }; }).concat([{ label: name, sub: NEEDS.map(function (n) { return n[1] + ' ' + iname(n[0]).toLowerCase(); }).join(', '), note: date(st.sov.done), info: true }]);
      return BridgeInteractions.choose({ title: 'The Arsenal\'s book', text: text, rows: rows, closeLabel: 'Close the book' });
    }
    if (sovDone()) {
      var f = nextFriday();
      text = 'THE CLERK OF THE CHEQUE BLOTS THE LAST LINE. "THAT\'S HER, THEN. EVERY NAIL. SHE GOES DOWN THE WAYS ON REGATTA DAY - ' +
             (f && regattaAt(now()) ? 'TODAY, AT THE TOP OF ANY HOUR OR TWENTY PAST OR FORTY PAST, WHEN AGNES ROOK SAYS SO. BE ON THE QUAY.' : 'FRIDAY, NOON ONWARD. BE ON THE QUAY BY THE STOCKS.') +
             ' THE ONE WHOSE TIMBER IT WAS KNOCKS OUT THE LAST SHORE. THAT\'S YOU."';
      rows = NEEDS.map(function (n) { return { label: iname(n[0]), icon: n[0], sub: 'all ' + n[1] + ' entered', note: '✓', info: true }; });
      return BridgeInteractions.choose({ title: 'The Sovereign II', text: text, rows: rows, closeLabel: 'Good' });
    }
    text = (st.sov.begun ? 'THE CLERK FINDS YOUR PAGE WITHOUT LOOKING. "' + entered() + ' OF ' + wanted() + ' ENTERED. THE SHIPWRIGHTS SAY TWO YEARS. I SAY ROPE."'
      : 'THE ARSENAL OFFICE. THE CLERK OF THE CHEQUE LOOKS UP FROM A LEDGER AS THICK AS A DOOR. "THE SOVEREIGN II. THE QUEEN-REGENT WANTS HER IN THE WATER FOR A REGATTA, AND THE YARD IS SHORT OF EVERYTHING. THE CROWN\'S FRIENDS PUT IN WHAT THEY CAN, AND I WRITE THEM IN THE BOOK. MADE STUFF, MIND. YOUR OWN WORKSHOP\'S, OR BOUGHT. NOT LOGS."') +
      '\n\nWHAT SHE STILL WANTS FROM YOU:';
    rows = NEEDS.map(function (n) {
      var id = n[0], left = n[1] - given(id), h = haveFor(id), W = has('BridgeWorkshop') ? BridgeWorkshop : null;
      if (left <= 0) return { label: iname(id), icon: id, sub: 'all ' + n[1] + ' entered', note: '✓', info: true };
      var where = h > 0 ? 'you have ' + h + (inHolds(id) ? ' (some in your hold here)' : '') : 'you have none - ' + ((W && W.FROM && W.FROM[id]) || 'your workshop makes it');
      return { label: iname(id), icon: id, sub: given(id) + ' of ' + n[1] + ' entered · ' + where, note: h > 0 ? 'Put in ' + Math.min(h, left) : left + ' to go', disabled: h <= 0,
               pick: function () { putIn(id); ledger(); } };
    });
    BridgeInteractions.choose({ title: 'The Sovereign II', text: text, rows: rows, closeLabel: 'Later' });
  }

  // ==== L6 · Cinder Key's bounties ====================================================================================
  // three a week, Sunday to Saturday (Eastern): a raider on the Crimson, a privateer gone bad on the Emerald lanes, a
  // Crimson cutter — the ships js/seafight.js sends at you (KINDS raider, privateer, cutter), named for the week
  var WANTED = {
    raider:    { seas: ['crimson'], pay: 450, prize: 'plunder_idol', what: 'a black-sailed raider, working the Crimson',
                 ships: ['Sea Wolf', 'Bloody Mary', 'Cutthroat Kate', 'Grin'], captains: ['BLACK TAM ORR', 'ONE-EAR ROLLO', 'GENTLEMAN JACK SALT', 'MOTHER KETTLEBY'] },
    privateer: { seas: ['emerald'], pay: 350, prize: 'plunder_rings', what: 'a privateer gone bad, on the Emerald lanes',
                 ships: ['Black Dog', 'Avenger', 'Hawk', 'Letter of Grace'], captains: ['CAPTAIN SILAS VOSS', 'LADY CORDELIA BRAND', 'CAPTAIN ARCHER CREWE', 'THE HONOURABLE P. DASH'] },
    cutter:    { seas: ['crimson'], pay: 250, prize: 'plunder_plate', what: 'a pirate cutter out of the Crimson squalls',
                 ships: ['Red Gull', 'Ember', 'Magpie', 'Little Sal'], captains: ['NAN SCULLY', 'RED MICK', 'THE WIDOW PRYCE', 'LITTLE ABEL'] }
  };
  var ORDER = ['raider', 'privateer', 'cutter'];
  function weekOf(ms) { var d = Math.floor(etAt(ms == null ? now() : ms) / DAY); return d - (((d + 4) % 7) + 7) % 7; }   // the Sunday it starts (an Eastern day number)
  /** This week's three (the same on every page): [{ id, kind, ship, captain, pay, prize, seas, what }]. */
  function bounties(ms) { return bountiesFor(weekOf(ms)); }
  function bountiesFor(wk) {
    return ORDER.map(function (k) {
      var W = WANTED[k], i = Math.floor(hash('wanted|' + wk + '|' + k) * W.ships.length), j = Math.floor(hash('captain|' + wk + '|' + k) * W.captains.length);
      return { id: 'w' + wk + '-' + k, week: wk, kind: k, ship: 'the ' + W.ships[i % W.ships.length], captain: W.captains[j % W.captains.length], pay: W.pay, prize: W.prize, seas: W.seas, what: W.what };
    });
  }
  function bountyById(id) {
    var m = /^w(-?\d+)-(\w+)$/.exec(String(id || ''));
    if (!m) return null;
    return bountiesFor(+m[1]).filter(function (b) { return b.id === id; })[0] || null;
  }
  /** js/seafight.js, planning a passage through these seas: a wanted ship that's hunting you there (once you've read
   *  this week's board), or null. */
  function hunting(seas) {
    if (st.bounty.read !== weekOf()) return null;
    var list = bounties().filter(function (b) { return !st.bounty.beaten[b.id] && b.seas.some(function (s) { return (seas || []).indexOf(s) >= 0; }); });
    return list[0] || null;
  }
  /** A wanted ship sunk (js/seafight.js `sink`, or the captain's word to the crew): yours to claim from Scarlet Dee. */
  function beaten(id) {
    var b = bountyById(id);
    if (!b || st.bounty.beaten[id]) return false;
    st.bounty.beaten[id] = now(); store();
    toast('Wanted', b.ship.replace(/^the /, 'The ') + ' sunk', 'Claim the ' + b.pay + ' from Scarlet Dee on Cinder Key');
    note('Bounties', b.ship.replace(/^the /, 'The ') + ' sunk', 'claim it from Scarlet Dee on Cinder Key');
    return true;
  }
  function unclaimed() {
    return Object.keys(st.bounty.beaten).filter(function (id) { return !st.bounty.claimed[id]; }).map(bountyById).filter(Boolean);
  }
  function wantedBoard(inter) {
    var first = st.bounty.read !== weekOf();
    st.bounty.read = weekOf(); store();
    var list = bounties();
    var text = (inter && inter.flavour ? inter.flavour + '\n\n' : '') + 'OVER THE OLD ONES, THIS WEEK\'S THREE IN SCARLET DEE\'S HAND, A SKETCH OF EACH SHIP: SINK HER, AND DEE PAYS AT THE HARBOUR BOOK. THEY\'RE CHANGED ON SUNDAY.' +
               (first ? '\n\nSOMEBODY IN THE COVE WATCHES YOU READ THEM. BY NIGHTFALL THE WORD WILL BE OUT THAT YOU\'RE HUNTING - AND THEY\'LL COME LOOKING.' : '');
    BridgeInteractions.choose({
      title: 'Wanted', text: text,
      rows: list.map(function (b) {
        var got = st.bounty.beaten[b.id], paid = st.bounty.claimed[b.id];
        return { label: b.ship.replace(/^the /, 'The ') + ' · ' + b.captain.toLowerCase().replace(/\b\w/g, function (c) { return c.toUpperCase(); }), sub: b.what + (got ? (paid ? ' · sunk and paid' : ' · sunk: claim it from Scarlet Dee') : ''),
                 note: paid ? '✓' : got ? 'claim' : b.pay + ' coins', info: true };
      }),
      closeLabel: 'Step back'
    });
  }
  function claim() {
    var due = unclaimed(), list = bounties();
    if (!due.length) {
      var open = list.filter(function (b) { return !st.bounty.beaten[b.id]; });
      return say('SCARLET DEE', open.length ? '"NOTHING TO PAY YOU YET. THE BOARD BY THE SQUARE HAS THIS WEEK\'S THREE - ' + open.map(function (b) { return b.ship.toUpperCase(); }).join(', ') + '. SINK ONE AND COME BACK. I PAY ON SIGHT OF A FLAG, NOT ON A STORY."'
        : '"ALL THREE OF THIS WEEK\'S AT THE BOTTOM, AND ALL PAID. NEW ONES GO UP ON SUNDAY. THE COVE\'S GONE VERY QUIET. I\'M NOT SURE I LIKE IT."');
    }
    var coins = 0, items = [];
    due.forEach(function (b) { st.bounty.claimed[b.id] = now(); coins += b.pay; items.push(b.prize); });
    store();
    award(coins, 'quest:bounty');
    items.forEach(function (id) { give(id, 1); });
    sfx('coin');
    toast('Bounty paid', coins + ' coins', items.map(iname).join(', '));
    say('SCARLET DEE', 'SHE TAKES ' + (due.length > 1 ? 'THE FLAGS' : 'THE FLAG') + ' YOU CUT DOWN, LOOKS AT ' + (due.length > 1 ? 'THEM' : 'IT') + ' A LONG TIME, AND CROSSES OUT ' + due.map(function (b) { return b.ship.toUpperCase(); }).join(' AND ') +
        ' IN THE BOOK. "' + coins + ', AS PROMISED. AND WHAT WAS IN THE CAPTAIN\'S CABIN - VESPER WILL GIVE YOU A FAIR PRICE. FOR VESPER."\n\n+' + coins + ' COINS · ' + items.map(function (i) { return iname(i).toUpperCase(); }).join(', '));
  }

  // ==== L5 · The dragon's riddle ======================================================================================
  // the answers: things on Lumar's islands (never the egg, never what she's listening for)
  var ANSWERS = ['The Sapphire light', 'St Brendan\'s bell', 'The moon pool', 'The floating market', 'Lanternfall\'s zigzag', 'The Old Bridge', 'The Rose Mine', 'Old Wick\'s stormwatch'];
  var RIDDLES = [
    'I HAVE ONE EYE AND NO FACE. I SLEEP ALL DAY AND STARE ALL NIGHT, AND THE SHIPS THANK ME WITHOUT EVER SAYING SO.',
    'I HANG IN A STONE THROAT OVER THE CAPITAL. I SPEAK ONLY WHEN I AM STRUCK, AND THEN THE WHOLE TOWN KNOWS THE HOUR, OR WHO HAS MARRIED.',
    'I AM A PIECE OF THE SKY THAT FELL INTO A HOLE IN THE ROCK. FISH ME AND I GIVE YOU STARS.',
    'I AM A TOWN THAT NEVER TOUCHES THE GROUND. MY STREETS ARE PLANKS, MY SHOPS ARE BOATS, AND WHEN THE TIDE RISES, SO DO I.',
    'FIVE HUNDRED STEPS AND SOME, AND NOBODY COUNTS ME THE SAME TWICE. THE DONKEYS KNOW ME BETTER THAN THE PEOPLE WHO BUILT ME.',
    'I HAVE FOUR LEGS IN THE WATER AND A ROW OF SHOPS ON MY BACK. THE SHIPS GO UNDER ME AND THE GOSSIP GOES OVER.',
    'THEY COME DOWN INTO ME WITH LAMPS AND PICKS AND GO UP WITH ROSES MADE OF STONE. THE DEEPER THEY GO, THE LOUDER I HUM.',
    'I AM A STONE HAT ON A SMOKING ISLAND. I HOIST BLACK CONES TO SAY WHAT THE SKY WILL DO, AND THE PIRATES BELIEVE ME, THOUGH THEY CANNOT READ.'
  ];
  /** Today's riddle (the same for everyone on a Lumar day): { day, q, answer, options: [4 names] }. */
  function riddle(ms) {
    var day = lumarDay(ms), k = Math.floor(hash('riddle|' + day) * RIDDLES.length) % RIDDLES.length;
    var others = ANSWERS.map(function (a, i) { return i; }).filter(function (i) { return i !== k; })
      .sort(function (a, b) { return hash('opt|' + day + '|' + a) - hash('opt|' + day + '|' + b); }).slice(0, 3);
    var opts = others.concat([k]).sort(function (a, b) { return hash('ord|' + day + '|' + a) - hash('ord|' + day + '|' + b); });
    return { day: day, q: RIDDLES[k], answer: ANSWERS[k], options: opts.map(function (i) { return ANSWERS[i]; }) };
  }
  function answered() { return st.riddle.day === lumarDay(); }
  function dragon(inter) {
    var R = riddle(), open = (inter && inter.flavour && !st.riddle.tries ? inter.flavour.replace(/\\n/g, '\n') + '\n\n' : '');   // (her old greeting, the first time)
    if (answered()) {
      return say('DRAGON', open + (st.riddle.ok ? 'SHE IS COUNTING HER HOARD AGAIN, ONE COIN SHORT, AND LOOKS AT YOU AS IF YOU MIGHT KNOW WHY. "TOMORROW, LITTLE PILOT. ANOTHER."'
        : 'ONE GOLD EYE, HALF OPEN. "YOU HAD YOUR GUESS. THE ISLANDS WILL STILL BE THERE TOMORROW. SO WILL I."'));
    }
    BridgeInteractions.choose({
      title: 'The dragon', text: open + 'THE GREAT HEAD COMES DOWN UNTIL ONE EYE IS LEVEL WITH YOU. HER VOICE IS A WARM WIND THROUGH THE ROCK.\n\n"A RIDDLE, LITTLE PILOT. GUESS IT AND YOU MAY TAKE ONE COIN FROM MY HOARD. ONE. I COUNT THEM.\n\n' + R.q + '"',
      rows: R.options.map(function (a) { return { label: a, pick: function () { answer(R, a); } }; }),
      closeLabel: 'Back away slowly'
    });
  }
  function answer(R, a) {
    if (answered()) return;
    var ok = a === R.answer;
    st.riddle = { day: R.day, ok: ok, n: (st.riddle.n || 0) + (ok ? 1 : 0), tries: (st.riddle.tries || 0) + 1 };
    store();
    if (ok) {
      give('heron_coin', 1); sfx('coin');
      if (st.riddle.n === 1) note('The dragon\'s riddle', 'Guessed it: ' + R.answer.toLowerCase(), 'a coin from the hoard');
      say('DRAGON', 'A SOUND LIKE A FORGE BEING PLEASED. "' + R.answer.toUpperCase() + '. YES." A CLAW AS LONG AS YOUR ARM NUDGES ONE SILVER COIN OUT OF THE PILE TOWARD YOU. IT HAS A HERON ON IT.\n\n"COME BACK TOMORROW. I HAVE A GREAT MANY RIDDLES AND NOBODY TO TELL THEM TO."\n\n(+1 HERON COIN)');
    } else {
      sfx('error');
      say('DRAGON', 'SMOKE CURLS FROM ONE NOSTRIL. "NO." A LONG PAUSE. "IT WAS ' + R.answer.toUpperCase() + '. GO AND LOOK AT IT, AND COME BACK TOMORROW FOR ANOTHER."');
    }
  }

  // ==== L4 · The Old Bridge's booths ==================================================================================
  var LINE_MS = 8 * HOUR;                                 // a Lumar day
  var BOOTHS = {
    'TACKLE BOOTH': { title: 'The tackle booth', keep: 'AN OLD MAN IN A FISHERMAN\'S JUMPER, WHIPPING A HOOK WITH HIS TEETH. "SILK LINE. FINER THAN A HAIR, STRONGER THAN A PROMISE. THE BIG ONES NEVER SEE IT COMING."',
                      goods: [['silk_line', 30]] },
    'FLOWER BOOTH': { title: 'The flower booth', keep: 'A GIRL WITH A PENCIL BEHIND HER EAR TIES A POSY WITHOUT LOOKING. "SEA PINKS, THRIFT, AND SOMETHING BLUE FROM THE SAPPHIRE ISLES. NOBODY EVER MINDED BEING GIVEN ONE."',
                      goods: [['posy', 10]] },
    'SWEET BOOTH':  { title: 'The sweet booth', keep: 'A ROUND WOMAN IN A STRIPED APRON, SPINNING SUGAR. "TOFFEE SHIPS! EVERY HOUSE\'S COLOURS. THE CHILDREN ON THE QUAY WOULD SELL THEIR GRANNIES FOR ONE."',
                      goods: [['toffee_ship', 6]] }
  };
  function lineOn() { return (st.line || 0) > now(); }
  function booth(inter) {
    var B = BOOTHS[inter.label];
    if (!B) return;
    var text = (inter.flavour ? inter.flavour + '\n\n' : '') + B.keep;
    if (inter.label === 'TACKLE BOOTH' && lineOn()) text += '\n\n"YOU\'VE A SILK LINE ON ALREADY, I SEE. GOOD FOR THE REST OF THE DAY."';
    BridgeInteractions.choose({
      title: B.title, text: text,
      rows: B.goods.map(function (g) {
        return { label: iname(g[0]), icon: g[0], sub: g[0] === 'silk_line' ? 'use it from your pack: the rare fish come up more, for a Lumar day' : g[0] === 'toffee_ship' ? 'a gift children love; or eat it' : 'a gift; plenty of people love one',
                 note: g[1] + ' coins', pick: function () { buy(inter, g[0], g[1]); } };
      }),
      closeLabel: 'Walk on'
    });
  }
  function buy(inter, id, price) {
    pay(price, 'shop:' + id).then(function (r) {
      if (!r.ok) return say(inter.label, '"' + price + ' COINS, LOVE. COME BACK WHEN YOUR PURSE IS HEAVIER."');
      give(id, 1); sfx('coin');
      booth(inter);
    });
  }
  // the silk line, used from the pack: on for a Lumar day
  function useLine() {
    st.line = Math.max(now(), st.line || 0) + LINE_MS; store();
    toast('Silk line', 'Bent on', 'The rare fish come up a little more, for a Lumar day');
    sfx('success');
    return true;
  }
  function px(ctx, x, y, u, c, rs) { ctx.fillStyle = c; for (var i = 0; i < rs.length; i++) ctx.fillRect(x + rs[i][0] * u, y + rs[i][1] * u, rs[i][2] * u, rs[i][3] * u); }
  function lineIcon(ctx, x, y, s) {                       // a wooden spool wound with pale silk, the end trailing to a hook
    var u = s / 16;
    px(ctx, x, y, u, '#1a1008', [[3, 3, 9, 2], [3, 11, 9, 2], [4, 5, 7, 6]]);
    px(ctx, x, y, u, '#9a6a3a', [[4, 4, 7, 1], [4, 11, 7, 1]]);
    px(ctx, x, y, u, '#e8e4d8', [[5, 5, 5, 6]]); px(ctx, x, y, u, '#c8c2b2', [[5, 6, 5, 1], [5, 8, 5, 1], [5, 10, 5, 1]]);
    px(ctx, x, y, u, '#e8e4d8', [[10, 7, 2, 1], [12, 8, 1, 3]]);
    px(ctx, x, y, u, '#a0a0b0', [[12, 11, 1, 2], [11, 12, 1, 1]]);
  }
  function toffeeIcon(ctx, x, y, s) {                     // a little amber toffee ship on a stick, a sugar sail
    var u = s / 16;
    px(ctx, x, y, u, '#1a1008', [[2, 9, 12, 4], [7, 2, 1, 8]]);
    px(ctx, x, y, u, '#c87a20', [[3, 10, 10, 2]]); px(ctx, x, y, u, '#f0b040', [[3, 10, 10, 1]]); px(ctx, x, y, u, '#8a4a10', [[4, 12, 8, 1]]);
    px(ctx, x, y, u, '#f4f0e8', [[8, 3, 4, 5]]); px(ctx, x, y, u, '#e05a5a', [[8, 5, 4, 1]]);
    px(ctx, x, y, u, '#e8d8b0', [[7, 13, 1, 3]]);
  }
  if (has('BridgeItems') && BridgeItems.add) {
    BridgeItems.add({
      silk_line: { name: 'Silk Line', desc: 'A spool of line finer than a hair, from the tackle booth on the Old Bridge. Bend it on and the big ones never see it coming.',
                   type: 'tool', stackable: true, draw: lineIcon, value: 8, works: 'The rare fish come up more for a Lumar day (8 hours)', onUse: useLine },
      toffee_ship: { name: 'Toffee Ship', desc: 'A little ship of amber toffee on a stick, sails of spun sugar, in a merchant house\'s colours. From the sweet booth on the Old Bridge.',
                     type: 'gift', stackable: true, draw: toffeeIcon, value: 2, effects: { energy: 8 } }
    });
  }

  // ---- what its things are for (js/uses.js reads `USES` as a module's own lines) ---------------------------------------
  var USES = [
    { id: 'silk_line', p: 9, t: '<b>Use it</b> from your pack: the rare fish come up more often wherever you fish, for a Lumar day' },
    { id: 'heron_coin', p: 4, t: '<b>The dragon</b> under Crimson Reach gives one for a riddle guessed, once a Lumar day' },
    { id: 'plunder_idol', p: 3, t: '<b>Scarlet Dee</b> pays one with the bounty on a wanted raider' },
    { id: 'oak_plank', p: 5, t: '<b>The Sovereign II</b> at the Arsenal wants twelve, while her ledger\'s open' },
    { id: 'iron_bar', p: 5, t: '<b>The Sovereign II</b> at the Arsenal wants eight, while her ledger\'s open' },
    { id: 'rope', p: 5, t: '<b>The Sovereign II</b> at the Arsenal wants ten, while her ledger\'s open' },
    { id: 'pitch', p: 5, t: '<b>The Sovereign II</b> at the Arsenal wants six, while her ledger\'s open' },
    { id: 'sailcloth', p: 5, t: '<b>The Sovereign II</b> at the Arsenal wants four, while her ledger\'s open' }
  ];

  // ==== the Journal and the Map ======================================================================================
  function nextUp(w) {
    var out = [], lumar = /^lumar/.test(w || '');
    if (st.sov.begun && !sovDone()) out.push({ tag: 'Lumar', title: 'The Sovereign II · ' + entered() + '/' + wanted(), text: 'Bring the rest of your share to the Arsenal office in Crownhaven: ' + NEEDS.filter(function (n) { return given(n[0]) < n[1]; }).map(function (n) { return (n[1] - given(n[0])) + ' ' + iname(n[0]).toLowerCase(); }).join(', ') + '.', world: 'lumar-crown-arsenal' });
    if (sovDone() && !launched()) out.push({ tag: 'Lumar', title: 'The Sovereign II launches', text: regattaAt(now()) ? 'Today, at the Arsenal: be on the quay by the stocks. She goes at the top of the hour, twenty past or twenty to.' : 'On Friday, regatta day, at the Arsenal in Crownhaven: be on the quay by the stocks.', world: 'lumar-crown-arsenal' });
    var due = unclaimed();
    if (due.length) out.push({ tag: 'Lumar', title: 'A bounty to claim', text: due[0].ship.replace(/^the /, 'The ') + ' is sunk: Scarlet Dee on Cinder Key pays ' + due[0].pay + '.', world: 'lumar-cinder' });
    if (lumar && st.riddle.day && !answered()) out.push({ tag: 'Lumar', title: 'The dragon has a riddle', text: 'A new one today, in the cave under Crimson Reach: guess it for a coin from her hoard.', world: 'lumar-crimson-cave' });
    return out.slice(0, 2);
  }
  function comeBack(w) {
    var out = [];
    if (w === 'lumar-crimson-cave') out.push(answered() ? 'the dragon\'s riddle, a new one tomorrow' : 'the dragon\'s riddle, once a Lumar day');
    if (w === 'lumar-cinder') out.push('the WANTED board\'s three, new each Sunday');
    if (w === 'lumar-crown-arsenal' && !launched()) out.push(sovDone() ? 'the Sovereign II\'s launch, on regatta day' : 'the Sovereign II\'s ledger: your share for her launch');
    if (w === 'lumar-crown-bridge') out.push('the booths: a silk line, posies, toffee ships');
    return out;
  }
  // Harrow's gossip is moot once your share's in (js/quests.js `unless: gate:…`)
  if (has('BridgeQuests') && BridgeQuests.gate) {
    BridgeQuests.gate('sovereign-in', function () { return sovDone(); });
    BridgeQuests.gate('bounties-read', function () { return st.bounty.read === weekOf(); });
  }

  // ==== the places =================================================================================================
  function act(inter) {
    var a = inter.act;
    if (a === 'ledger') return ledger();
    if (a === 'wanted') return wantedBoard(inter);
    if (a === 'claim') return claim();
    if (a === 'riddle') return dragon(inter);
    if (a === 'booth') return booth(inter);
  }
  function init() { if (has('BridgeInteractions') && BridgeInteractions.register) BridgeInteractions.register('lumardeep', act, 'Look'); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  function own(it, a, prompt) {
    if (it.type === 'lumardeep') return;
    if (it.flavour == null) it.flavour = it.dialog || '';
    it.type = 'lumardeep'; it.act = a; it.prompt = prompt; delete it.dialog;
  }
  function decorate(worldId, data) {
    st = load();                                            // (a partner's sync or another tab may have moved it on)
    (data.interactions || []).forEach(function (it) {
      if (worldId === 'lumar-crown-arsenal') {
        if (it.label === 'THE ARSENAL') own(it, 'ledger', launched() ? 'PRESS E TO READ THE ARSENAL\'S BOOK' : 'PRESS E FOR THE SOVEREIGN\'S LEDGER');
        if (it.label === 'ON THE STOCKS' && it.type === 'dialog') {
          if (it.sovWas == null) it.sovWas = it.dialog;
          it.dialog = launched() ? 'ON THE STOCKS: THE KEEL OF THE SOVEREIGN\'S SISTER, HER RIBS ALREADY UP. THE SOVEREIGN II HERSELF LIES AT THE FITTING-OUT QUAY, AND YOUR NAME IS IN HER BOOK.'
            : sovDone() ? it.sovWas + '\n\nEVERY NAIL IS IN. THE SHIPWRIGHTS ARE GREASING THE WAYS FOR REGATTA DAY.' : it.sovWas;
        }
        if (it.label === 'FITTING OUT' && it.type === 'dialog') {
          if (it.sovWas == null) it.sovWas = it.dialog;
          it.dialog = launched() ? 'THE SOVEREIGN II, FITTING OUT ALONGSIDE: HER LOWER MASTS IN, THE RIGGERS SWARMING, A GILDER ON A PLANK AT HER STERN LETTERING HER NAME. THE BOSUN WAVES. HE KNOWS WHO YOU ARE.' : it.sovWas;
        }
      }
      if (worldId === 'lumar-cinder' && it.label === 'WANTED') own(it, 'wanted', 'PRESS E TO READ THIS WEEK\'S');
      if (worldId === 'lumar-crimson-cave' && it.label === 'DRAGON') own(it, 'riddle', 'PRESS E TO SPEAK TO HER');
      if (worldId === 'lumar-crown-bridge' && BOOTHS[it.label]) own(it, 'booth', 'PRESS E TO BROWSE');
    });
  }

  return { decorate: decorate, nextUp: nextUp, comeBack: comeBack, USES: USES, NEEDS: NEEDS, PLANS: PLANS, BOOTHS: BOOTHS,
           launchDue: launchDue, shore: shore, watched: watched, launched: launched, regattaAt: regattaAt, putIn: putIn,
           bounties: bounties, hunting: hunting, beaten: beaten, unclaimed: unclaimed, claim: claim, weekOf: weekOf,
           riddle: riddle, lineOn: lineOn, _st: function () { return st; }, reload: function () { st = load(); } };
})();
