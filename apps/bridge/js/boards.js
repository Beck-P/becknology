/**
 * BridgeBoards — a notice board of small requests on every planet (the farm's order board, grown to the worlds).
 *
 * Each planet posts three requests a day — its own day, by js/clock.js (Lumar's 8 hours, Verdance's 6, Hoarfell's 12,
 * Sylvara's 24; Arcadia's and Enigma's by the Eastern-time date) — from people who live there, seeded by the planet and
 * the day so two pilots read the same board. A request is always for something you catch, gather, grow, make, win or
 * find (never a parcel to carry). Fill one from your pack at any of that planet's boards: it pays well over the best
 * sale (`MARKUP`× the dearest buyer, at least `FLOOR`), that person thinks the better of you (js/talk.js `nudge`), and it
 * can't be filled twice. One you can't fill is gone with the day; nothing is lost.
 *
 * The boards are the ones drawn in the places (`SPOTS`: world → label); `decorate` turns them into `notice_board`
 * interactions, keeping what they said before above the requests. Hoarfell's hang on the Snowcap Lodge's record board
 * (js/lodge.js asks `rows`). Sylvara has a table but no board yet (nothing drawn in the wood to pin them on).
 *
 * Kept in localStorage `bridge_boards` ({ planet: { day, done: [who:item] } }) — a `bridge_*` key, so js/cloud.js carries
 * it to the pilot's other devices. Each pilot fills their own.
 *
 * Also the farm's order board's daily pick and its fill (js/homestead.js asks `daily` and `fill`), unchanged.
 */
var BridgeBoards = (function () {
  var KEY = 'bridge_boards';
  var PER_DAY = 3, MARKUP = 1.6, FLOOR = 15;

  // where each planet's requests are pinned up: the boards and kiosks already drawn in its places
  var SPOTS = {
    lumar:    [['lumar-square', 'BULLETIN BOARD', 'the Market Square'], ['lumar-crown', 'NOTICE BOARD', 'Crownhaven\'s quay'],
               ['lumar-crown-oldtown', 'NOTICE BOARD', 'the Old Town'], ['lumar-crown-office', 'NOTICES', 'the Harbour Office']],
    arcadia:  [['arcadia-spaceport', 'DEPARTURES BOARD', 'the spaceport'], ['arcadia-undercity', 'HOLO KIOSK', 'the Undercity']],
    hoarfell: [['hoarfell-lodge', 'THE BOARD', 'the Snowcap Lodge', 'lodge']],          // js/lodge.js shows them under the records
    verdance: [['verdance-village', 'NOTICE BOARD', 'Brambleford\'s green']],
    enigma:   [['enigma-hydro', 'PHOTO BOARD', 'hydroponics']],
    sylvara:  []                                                                          // nothing drawn in the wood to pin them on
  };
  // what's written over the requests, in the place's voice
  var HEAD = {
    lumar: 'PINNED OVER THE OLD NOTICES, TODAY\'S REQUESTS IN THREE DIFFERENT HANDS. BRING WHAT THEY ASK FOR - THEY PAY BETTER THAN ANY TRADER, AND THEY REMEMBER WHO HELPED.',
    arcadia: 'A STRIP OF TEXT CRAWLS ALONG THE BOTTOM: TONIGHT\'S ASKS, POSTED BY PEOPLE IN THE CITY. PAID ON THE SPOT, OVER STREET PRICE.',
    hoarfell: 'IN THE CORNER, ON THE BACKS OF LIFT TICKETS: WHAT FOLK IN THE VALLEY ARE AFTER TODAY.',
    verdance: 'TUCKED UNDER THE NOTICES ON SCRAPS OF BROWN PAPER: WHAT THE VILLAGE IS AFTER TODAY. THEY PAY FAIR AND THEN SOME.',
    enigma: 'A NEWER PAGE PINNED OVER THE CORNER, IN OKAFOR\'S BLOCK CAPITALS: "IF YOU\'RE PASSING, I COULD USE -"',
    sylvara: 'LEAVES PINNED TO THE BARK, WRITTEN IN A FINE ELVEN HAND.'
  };

  // the requests: who (people.json), what, how many, why in their voice; w weights the daily pick (2: things nothing else
  // in the game asks for — the spec's orphans — so the board tells you what they're for); x a markup in place of MARKUP
  var REQUESTS = {
    lumar: [
      { who: 'penn', item: 'sea_glass', n: 5, why: '"The shallows off Tern Holm are a green I can\'t mix. Sea glass is the nearest."' },
      { who: 'rigg', item: 'harbour_crab', n: 2, why: '"Crab for the loft. Sailmakers live on crab and thread."' },
      { who: 'mudlark', item: 'old_boot', n: 1, why: '"The left one. I\'ve had the right one since spring."' },
      { who: 'ione', item: 'star_pearl', n: 1, why: '"A star pearl. They say it keeps the sky it fell from. I\'d like to check."' },
      { who: 'bryony', item: 'silverfin', n: 4, why: '"Silverfin for the pot. The Tern\'s Rest runs on chowder."' },
      { who: 'wick', item: 'ember_glass', n: 2, why: '"Ember glass for the stormwatch lamp. Burns brighter than oil in a blow."' },
      { who: 'glass_stavrou', item: 'glass_float', n: 1, w: 2, x: 1.5, why: '"One float of your own blowing. Let me see what Ione\'s taught you."' },
      { who: 'rose_lior', item: 'silk_scarf', n: 1, w: 2, why: '"A silk scarf for my mother. Rosewell silk, nothing less."' },
      { who: 'hetty', item: 'wolf_pelt', n: 1, w: 2, why: '"A wolf pelt for the settle by the fire. The old one\'s gone bald."' },
      { who: 'pim', item: 'rime_shell', n: 1, w: 2, why: '"A rime shell to hold the charts down. Paperweights are for amateurs."' },
      { who: 'crier', item: 'goldfish_bag', n: 1, w: 2, why: '"A goldfish for the Old Town fountain. Every town needs a mascot."' },
      { who: 'kettle', item: 'scrap_metal', n: 6, w: 2, why: '"Scrap for a raider\'s ribs. Iron\'s dear on Cinder Key."' },
      { who: 'harrow', item: 'wyrm_scale', n: 1, w: 2, x: 1.4, why: '"A wyrm scale. The cadets should see what real armour looks like."' }
    ],
    arcadia: [
      { who: 'teo', item: 'eel_fillet', n: 4, why: '"Eel for the laksa. Sump eel, mind. The fresh ones bite back."' },
      { who: 'wen', item: 'beeswax_candles', n: 2, w: 2, why: '"Real candles for the drowned shrine. The plastic ones don\'t flicker."' },
      { who: 'kanna', item: 'sea_glass', n: 3, why: '"Sea glass for the omamori. The sea\'s luck, sewn in."' },
      { who: 'hoshi', item: 'egg', n: 6, why: '"Farm eggs. Real ones. The ramen deserves it."' },
      { who: 'nadia', item: 'moonmelon', n: 1, why: '"A twin-moon melon, for a cocktail I haven\'t named yet."' },
      { who: 'ferris', item: 'sunflower', n: 3, why: '"Sunflowers. Something up here ought to face the sun, even if it can\'t find one."' },
      { who: 'brannigan', item: 'arctic_char', n: 2, why: '"Char from a real ice world. Spacers get homesick for cold."' },
      { who: 'static', item: 'circuit', n: 3, w: 2, why: '"Circuit boards for the Foundry\'s rig. Dead screens don\'t dance."' },
      { who: 'sallow', item: 'chrome_part', n: 2, w: 2, why: '"Chrome joints. I can fit anyone with the right knee."' },
      { who: 'iris_kade', item: 'silk_scarf', n: 1, w: 2, why: '"Rosewell silk, for a pattern. The city only has the printed kind."' },
      { who: 'duchess', item: 'sump_pearl', n: 1, w: 2, why: '"A sump pearl. My guests think it\'s hilarious that I wear them."' },
      { who: 'lanternmaker', item: 'bat_wing', n: 2, w: 2, why: '"Ice bat wings for a lantern shade. Thin as paper, and they glow red."' },
      { who: 'odette', item: 'moonflower', n: 2, why: '"Moonflowers for my hair. They open just as I go on."' }
    ],
    hoarfell: [
      { who: 'sigrun', item: 'edelweiss', n: 2, why: '"Edelweiss for my sister. She\'s never been higher than the lodge."' },
      { who: 'bryn', item: 'hoar_crystal', n: 3, why: '"Three hoar crystals for a dice cup. They ring when you shake them."' },
      { who: 'tove', item: 'arctic_char', n: 2, why: '"Char for the hut\'s soup. I\'m tired of cocoa for supper."' },
      { who: 'kaspar', item: 'frostfin', n: 2, why: '"Frostfin for the Stübli. Don\'t ask what I do with it on fondue nights."' },
      { who: 'liv', item: 'silverleaf_salve', n: 1, why: '"Silverleaf salve for my knees. Three falls on the Hoarspire this week."' },
      { who: 'stationmaster', item: 'hearthfire_draught', n: 1, why: '"A hearthfire draught for the stoker on the night train."' },
      { who: 'mathis', item: 'wolf_pelt', n: 1, w: 2, why: '"A wolf pelt for the bureau\'s floor. The guides come in wet."' },
      { who: 'aubert', item: 'wraith_essence', n: 1, w: 2, why: '"Wraith essence. Madame swears No. 13 needs it. I don\'t ask."' },
      { who: 'anouk', item: 'rime_shell', n: 2, w: 2, why: '"Rime shells for the sleigh bells. They ring like ice."' },
      { who: 'ysolde', item: 'golem_core', n: 1, w: 2, why: '"A golem core for my hut on the face. Warmest stone there is."' },
      { who: 'inge', item: 'bat_wing', n: 3, w: 2, why: '"Bat wings for ski wax. Old Fellhaven trick. Don\'t make that face."' },
      { who: 'hut-bram', item: 'wyrm_scale', n: 1, w: 2, x: 1.4, why: '"A wyrm scale over the fire. Nobody believes what lives in the valley."' }
    ],
    verdance: [
      { who: 'wat', item: 'iron_bar', n: 2, why: '"Good bar iron for shoes. The village stuff\'s gone soft."' },
      { who: 'ludd', item: 'wheat', n: 10, why: '"Wheat for the stones. They grumble when they\'re idle."' },
      { who: 'nell', item: 'moonflower', n: 2, why: '"Moonflowers. They sell before dark or not at all."' },
      { who: 'mags', item: 'farm_cider', n: 2, why: '"Your cider for the Hayloft\'s tap. Folk ask for it by name now."' },
      { who: 'hobb', item: 'apple', n: 10, why: '"Apples for the horses. Don\'t tell them who sent them."' },
      { who: 'juniper', item: 'farm_cheese', n: 1, why: '"Your farmhouse cheese for the café\'s toasties."' },
      { who: 'silas', item: 'pond_perch', n: 3, why: '"Perch from your pond. A candlemaker can\'t live on wax."' },
      { who: 'rudd', item: 'sun_carp', n: 1, why: '"A sun carp for the ferry\'s tank. For luck on the Wend."' },
      { who: 'tobias_ludd', item: 'old_boot', n: 2, why: '"Two old boots for the mill race. It eats them. Don\'t ask."' },
      { who: 'pike', item: 'beeswax_candles', n: 1, w: 2, why: '"Candles for the halt\'s lamps. The paraffin smokes up the timetable."' },
      { who: 'marigold', item: 'honey_crock', n: 2, w: 2, why: '"Honey in crocks for the gate. Folk buy flowers better with honey beside them."' },
      { who: 'ezra', item: 'glass_float', n: 1, w: 2, x: 1.5, why: '"A glass float for the press-house window. Something to catch the light."' },
      { who: 'okoro', item: 'silk_scarf', n: 1, w: 2, why: '"A silk scarf for a buyer in the Spires. Arcadia pays for Lumar silk."' },
      { who: 'hester', item: 'rime_shell', n: 1, w: 2, why: '"A rime shell for the cheese cave. Keeps it cold right through summer."' }
    ],
    sylvara: [
      { who: 'elf_herbalist', item: 'owlmoss', n: 3, why: '"Owlmoss, gathered after dark. Mine all went into the queen\'s tea."' },
      { who: 'elf_loomer', item: 'silk_cocoon', n: 5, why: '"Silk cocoons from Rosewell. Our worms are sulking."' },
      { who: 'elf_warden', item: 'ember_glass', n: 2, why: '"Ember glass from the Crater, for fire arrows."' },
      { who: 'elf_liftkeeper', item: 'honey', n: 3, why: '"Honey for the lift\'s pulleys. An old trick. Some of it is for me."' },
      { who: 'elf_starreader', item: 'fallen_star', n: 1, why: '"A fallen star. I have counted them falling. I would like to hold one."' },
      { who: 'elf_bowyer', item: 'golem_core', n: 1, w: 2, why: '"A golem core for a bow\'s grip. It holds its warmth in a frost."' },
      { who: 'elf_lanternmaker', item: 'glass_float', n: 1, w: 2, x: 1.5, why: '"Glass blown from your own breath. A lantern wants a heart."' },
      { who: 'elf_boatwright', item: 'wyrm_scale', n: 1, w: 2, x: 1.4, why: '"A wyrm scale for a keel guard. Rocks give way to it."' }
    ],
    enigma: [
      { who: 'okafor', item: 'circuit', n: 2, w: 2, why: '"A circuit board will do for a radio valve. The rig\'s been coughing."' },
      { who: 'okafor', item: 'silk_scarf', n: 1, w: 2, why: '"Silk for a pressure seal. Don\'t laugh - it\'s what the manual says."' },
      { who: 'okafor', item: 'chrome_part', n: 1, w: 2, why: '"A chrome joint for the loader arm. It\'s been limping."' },
      { who: 'okafor', item: 'golem_core', n: 1, w: 2, why: '"A golem core. Warm as a reactor and twice as quiet."' },
      { who: 'okafor', item: 'sapphire_crystal', n: 2, why: '"Sapphire crystal for the dish. It hums on the right note."' },
      { who: 'okafor', item: 'salad_greens', n: 4, why: '"Greens from your greenhouse. Hydro lettuce tastes of pipes."' }
    ]
  };

  // ---- small things --------------------------------------------------------------------------------------------------
  function say(t, x) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(t, x); }
  function choose(spec) { if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.choose) BridgeInteractions.choose(spec); }
  function toast(k, t, sub) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(k, t, sub); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }
  function count(id) { return typeof BridgeInventory !== 'undefined' ? BridgeInventory.getCount(id) : 0; }
  function item(id) { return typeof BridgeItems !== 'undefined' ? BridgeItems.get(id) : null; }
  function nameOf(id) { var i = item(id); return i ? i.name : id; }
  function person(id) { var all = typeof BridgePeople !== 'undefined' ? BridgePeople.all() : {}; return all[id] || null; }
  function whoName(id) { var p = person(id); return p ? p.name : id; }
  function award(n, why) {
    return typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins ? BridgeProgression.awardCoins(n, why) : Promise.resolve(null);
  }
  function title(t) { return String(t || '').toLowerCase().replace(/(^|[\s'])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); }).replace(/'S\b/g, '\'s'); }
  // "2 harbour crabs", "5 sea glass", "2 crocks of honey"
  var MASS = /(glass|honey|wheat|flour|essence|owlmoss|cider|cheese|metal|salve|greens|draught|candles|edelweiss|silverfin|frostfin|char|perch|carp)$/;
  function many(id, n) {
    var w = nameOf(id).toLowerCase();
    if (n === 1) return (/^[aeiou]/.test(w) ? 'an ' : 'a ') + w;
    var of = w.indexOf(' of ');
    if (of > 0) return n + ' ' + plural(w.slice(0, of)) + w.slice(of);
    return n + ' ' + (MASS.test(w) ? w : plural(w));
  }
  function plural(w) { return /[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ies' : /(s|sh|ch|x)$/.test(w) ? w + 'es' : w + 's'; }

  // ---- the day and the pick --------------------------------------------------------------------------------------------
  /** This planet's day as a key: the Eastern-time date, and which of the planet's days within it. */
  function dayKey(planet, ms) {
    var C = typeof BridgeClock !== 'undefined' ? BridgeClock : null, DAY = 86400000;
    var at = ms == null ? (C ? C.now() : Date.now()) : ms, et = C ? C.etAt(at) : at - 5 * 3600000;
    var d = new Date(et), date = d.getUTCFullYear() + '-' + (d.getUTCMonth() + 1) + '-' + d.getUTCDate();
    var len = C && C.dayLen ? C.dayLen(planet) : 0;
    return len ? date + '/' + Math.floor((((et % DAY) + DAY) % DAY) / len) : date;
  }
  /** ms until this planet's next day (and the next board). */
  function untilNext(planet) {
    var C = typeof BridgeClock !== 'undefined' ? BridgeClock : null, DAY = 86400000;
    var at = C ? C.now() : Date.now(), et = C ? C.etAt(at) : at, into = ((et % DAY) + DAY) % DAY;
    var len = (C && C.dayLen && C.dayLen(planet)) || DAY;
    return len - (into % len);
  }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) {                                    // mulberry32
    return function () {
      seed = (seed + 0x6D2B79F5) >>> 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /** Today's requests on a planet: PER_DAY of its table, weighted, no item twice and nobody twice where the table allows. */
  function todays(planet, key) {
    var T = REQUESTS[planet] || [], r = rng(hash(planet + '|' + (key || dayKey(planet)))), picks = [], tries = 0;
    var people = {}; T.forEach(function (q) { people[q.who] = 1; });
    var oneEach = Object.keys(people).length >= PER_DAY;
    while (picks.length < Math.min(PER_DAY, T.length) && tries++ < 200) {
      var total = 0, i;
      var open = T.filter(function (q) {
        return picks.indexOf(q) < 0 && !picks.some(function (p) { return p.item === q.item || (oneEach && p.who === q.who); });
      });
      if (!open.length) break;
      open.forEach(function (q) { total += q.w || 1; });
      var x = r() * total;
      for (i = 0; i < open.length - 1; i++) { x -= open[i].w || 1; if (x < 0) break; }
      picks.push(open[i]);
    }
    return picks;
  }
  /** The farm's order board's own pick (js/homestead.js): n of len by the date, as it has always been. */
  function daily(day, len, n, salt) {
    var seed = day.split('-').reduce(function (a, b) { return a * 31 + +b; }, salt == null ? 7 : salt), picks = [], i = 0;
    while (picks.length < n && i < 40) {
      var j = Math.abs((seed * 9301 + 49297 * (i + 1)) % 233280) % len;
      if (picks.indexOf(j) < 0) picks.push(j);
      i++;
    }
    return picks;
  }

  // ---- what it pays ------------------------------------------------------------------------------------------------------
  var best = null;
  function bestPrice(id) {                                 // the most anyone pays for it: its worth, or the dearest specialist
    if (!best && typeof BridgePeople !== 'undefined') {
      var all = BridgePeople.all(), out = {};
      if (Object.keys(all).length) {
        Object.keys(all).forEach(function (pid) {
          (all[pid].topics || []).forEach(function (t) { (t.sell || []).forEach(function (s) { out[s.id] = Math.max(out[s.id] || 0, s.price); }); });
        });
        best = out;
      }
    }
    var it = item(id);
    return Math.max(it && it.value || 0, (best || {})[id] || 0);
  }
  function payFor(q) { return Math.max(FLOOR, Math.round(bestPrice(q.item) * q.n * (q.x || MARKUP))); }

  // ---- state ---------------------------------------------------------------------------------------------------------------
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private mode */ } }
  function stateOf(planet) {
    var s = load(), key = dayKey(planet);
    if (!s[planet] || s[planet].day !== key) { s[planet] = { day: key, done: [] }; save(s); }
    return s[planet];
  }
  function isDone(planet, q) { return stateOf(planet).done.indexOf(q.who + ':' + q.item) >= 0; }
  function mark(planet, q, on) {
    var s = load(), key = dayKey(planet), id = q.who + ':' + q.item;
    if (!s[planet] || s[planet].day !== key) s[planet] = { day: key, done: [] };
    var i = s[planet].done.indexOf(id);
    if (on && i < 0) s[planet].done.push(id);
    if (!on && i >= 0) s[planet].done.splice(i, 1);
    s.filled = (s.filled || 0) + (on ? 1 : -1);
    save(s);
  }

  /** Hand things over and get paid (the farm's order board uses it too): takes o.n of o.item from the pack, pays o.pay;
   *  if the coins can't be paid the things go back. o.done() once paid; o.who / o.memory nudge that person's feeling. */
  var busy = false;
  function fill(o) {
    if (busy) return Promise.resolve(false);
    if (count(o.item) < o.n) return Promise.resolve(false);
    busy = true;
    BridgeInventory.removeItem(o.item, o.n);
    if (o.before) o.before();
    return award(o.pay, o.reason).then(function (bal) {
      busy = false;
      if (bal === null || bal === undefined) {
        BridgeInventory.addItem(o.item, o.n);
        if (o.undo) o.undo();
        say(o.failTitle || 'NOTICE BOARD', o.failText || 'NO WAY TO PAY YOU RIGHT NOW. TRY AGAIN LATER.');
        return false;
      }
      if (o.done) o.done();
      if (o.who && typeof BridgeTalk !== 'undefined' && BridgeTalk.nudge) BridgeTalk.nudge(o.who, 1, o.memory || '');
      toast(o.toast || 'Request filled', o.name || '', '+' + o.pay + ' coins');
      sfx('coin');
      return true;
    }, function () { busy = false; BridgeInventory.addItem(o.item, o.n); if (o.undo) o.undo(); return false; });
  }

  // ---- the board -----------------------------------------------------------------------------------------------------------
  var PLANET_OF = { lumar: 'Lumar', arcadia: 'Arcadia', hoarfell: 'Hoarfell', verdance: 'Verdance', enigma: 'Enigma Station', sylvara: 'Sylvara' };
  /** The rows for a planet's requests today (a chooser's rows); reopen() is called after one's filled. */
  function rows(planet, reopen) {
    return todays(planet).map(function (q) {
      var done = isDone(planet, q), have = count(q.item), pay = payFor(q), name = whoName(q.who);
      return {
        label: name, icon: q.item,
        sub: done ? 'filled - thank you' : many(q.item, q.n) + ': ' + q.why + (have < q.n ? ' (you have ' + have + ')' : ''),
        note: done ? 'done' : pay + ' coins', disabled: done || have < q.n,
        pick: function () {
          if (isDone(planet, q)) return reopen && reopen();
          fill({ item: q.item, n: q.n, pay: pay, reason: 'board:' + planet + ':' + q.who, who: q.who, name: name,
                 memory: 'They brought me ' + many(q.item, q.n) + ' I asked for on the notice board',
                 before: function () { mark(planet, q, true); }, undo: function () { mark(planet, q, false); } })
            .then(function () { if (reopen) reopen(); });
        }
      };
    });
  }
  function leftText(planet) {
    var ms = untilNext(planet), h = Math.floor(ms / 3600000), m = Math.max(1, Math.round((ms % 3600000) / 60000));
    if (m === 60) { h++; m = 0; }
    return 'NEW REQUESTS ' + (h ? 'IN ' + h + 'H' + (m ? ' ' + m + 'M' : '') : 'IN ' + m + 'M') + '.';
  }
  function open(inter) {
    var planet = inter.board;
    if (!REQUESTS[planet]) return say(inter.label, inter.flavour || '');
    choose({
      title: title(inter.label),
      text: (inter.flavour ? inter.flavour + '\n\n' : '') + (HEAD[planet] || '') + ' ' + leftText(planet),
      rows: rows(planet, function () { open(inter); }),
      closeLabel: 'Done'
    });
  }
  /** Hoarfell's lines for the lodge's board (js/lodge.js). */
  function head(planet) { return (HEAD[planet] || '') + ' ' + leftText(planet); }

  // ---- in the world --------------------------------------------------------------------------------------------------------
  var registered = false;
  function decorate(worldId, data) {
    if (!registered && typeof BridgeInteractions !== 'undefined' && BridgeInteractions.register) {
      BridgeInteractions.register('notice_board', open, 'Read');
      registered = true;
    }
    Object.keys(SPOTS).forEach(function (planet) {
      SPOTS[planet].forEach(function (s) {
        if (s[0] !== worldId || s[3]) return;                    // (the lodge's board stays the lodge's)
        (data.interactions || []).forEach(function (it) {
          if (it.label !== s[1] || it.type === 'notice_board') return;
          it.flavour = it.dialog || '';
          it.type = 'notice_board'; it.board = planet; it.prompt = 'PRESS E TO READ THE REQUESTS';
        });
      });
    });
  }
  function planetOf(worldId) { return typeof BridgeClock !== 'undefined' && BridgeClock.planet ? BridgeClock.planet(worldId) : String(worldId || '').split('-')[0]; }

  /** For the Journal's Next up: a request on this planet's boards you could fill now from your pack. */
  function nextUp(worldId) {
    var planet = planetOf(worldId), spots = SPOTS[planet] || [];
    if (!spots.length) return [];
    var can = todays(planet).filter(function (q) { return !isDone(planet, q) && count(q.item) >= q.n; });
    if (!can.length) return [];
    var q = can[0], spot = spots.filter(function (s) { return s[0] === worldId; })[0] || spots[0];
    var first = whoName(q.who).split(' ')[0];
    return [{ tag: 'Board', title: first + ' wants ' + many(q.item, q.n),
              text: 'You have ' + (q.n === 1 ? 'it' : 'them') + '. The notice board in ' + spot[2] + ' pays ' + payFor(q) + (can.length > 1 ? ' (and ' + (can.length - 1) + ' more you can fill).' : '.'),
              world: spot[0] }];
  }

  /** Where a planet's boards are, and today's requests with their pay (the ledger, the tests). */
  function today(planet) {
    return todays(planet).map(function (q) { return { who: q.who, name: whoName(q.who), item: q.item, n: q.n, pay: payFor(q), done: isDone(planet, q), why: q.why }; });
  }

  return { decorate: decorate, open: open, rows: rows, head: head, nextUp: nextUp, today: today, daily: daily, fill: fill,
           dayKey: dayKey, todays: todays, payFor: payFor, bestPrice: bestPrice, SPOTS: SPOTS, REQUESTS: REQUESTS, PER_DAY: PER_DAY };
})();
