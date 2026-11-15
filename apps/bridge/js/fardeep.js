/**
 * BridgeFarDeep — Sylvara, Enigma, the Brink and the ship, deeper (spec-deeper-worlds Y4–Y7, E1–E2, S1, W1–W2).
 * Small things that tie what's there together, with the cast already in the game and nothing drawn but in code.
 * apps/bridge/CLAUDE.md, *Sylvara, Enigma, the Brink and the ship, deeper*.
 *
 *   Y6  Thaelin's lost verse (assets/quests.json `thaelins-verse`): five verses down the Silverrun, each on a label its
 *       place's world JSON already has. The three in places not open yet wait on a gate (`verse-falls`, `verse-lake`,
 *       `verse-deepwood`: BridgeSylvara.isOpen), whose clue's `hintGate` says so in the tracker; each opens by itself
 *       as its place goes into BridgeSylvara.OPEN. Thaelin's topics read the verses back (`thaelin_verses`).
 *   Y7  Silverrun fishing lives in js/fishing.js (the `river` pool, `moonCarp`), js/fishart.js, js/items.js, js/codex.js,
 *       assets/fishing.json; Tamsin buys the catch (people.json), Fennick and Tamsin ask for it (js/boards.js). Here: the
 *       Map's Come back for on the Silverrun.
 *
 * State: localStorage `bridge_fardeep` (cloud-saved like every bridge_* key).
 */
var BridgeFarDeep = (function () {
  var KEY = 'bridge_fardeep';
  var s = load();
  function load() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    d = d || {};
    return { echoes: d.echoes || [], specials: d.specials || {}, chart: d.chart || {}, seeds: d.seeds || 0, dispatches: d.dispatches || [], cloak: d.cloak || 0, seen: d.seen || {} };
  }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private mode */ } }
  function say(t, x) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(t, x); }
  function choose(spec) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.choose(spec); }
  function toast(a, b, c) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(a, b, c); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function count(id) { return typeof BridgeInventory !== 'undefined' ? BridgeInventory.getCount(id) : 0; }
  function register(type, fn, verb) { if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.register) BridgeInteractions.register(type, fn, verb); }
  function gate(name, fn) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.gate) BridgeQuests.gate(name, fn); }
  function has(k) { return typeof BridgeQuests !== 'undefined' && BridgeQuests.has ? BridgeQuests.has(k) : false; }

  // ---- Y6 · Thaelin's lost verse -------------------------------------------------------------------------------------
  var VQ = 'thaelins-verse';
  function opened(id) { return typeof BridgeSylvara === 'undefined' || !BridgeSylvara.isOpen || BridgeSylvara.isOpen(id); }
  gate('verse-falls', function () { return opened('sylvara-fallcave') && opened('sylvara-falls'); });
  gate('verse-lake', function () { return opened('sylvara-lake'); });
  gate('verse-deepwood', function () { return opened('sylvara-deepwood'); });
  // the song, verse by verse, as the clues found have it (the words are the clues' own `say`, so there's one copy)
  var VERSES = ['lookout', 'stage', 'falls', 'lake', 'deep'];
  var REFRAIN = '  SO TAKE THE LONG WAY HOME, MY HEART;\n  THE RIVER KNOWS THE WAY,\n  AND ALL WE LOSE UPON THE ROAD\n  IS ONLY GONE ASTRAY.';
  var NEXT = { lookout: 'THE LOOKOUT IN THE BOUGHS', stage: 'FENNICK\'S, IN THE HOLLOW BOUGH', falls: 'BEHIND THE FALLS', lake: 'MIRROR LAKE', deep: 'THE FROGS\' POOL IN THE DEEPWOOD' };
  var SHUT = { falls: 'verse-falls', lake: 'verse-lake', deep: 'verse-deepwood' };
  function verseOf(id) {
    var q = typeof BridgeQuests !== 'undefined' && BridgeQuests.def ? BridgeQuests.def(VQ) : null;
    var c = q && q.clues.filter(function (c) { return c.id === id; })[0];
    var m = c && c.say ? c.say.match(/\n\n((?: {2}[^\n]+\n){3} {2}[^\n]+)/) : null;   // the verse: four lines set in two spaces (js/interactions.js reflow keeps them)
    return m ? m[1] : '';
  }
  function verses() {
    var done = has(VQ);
    var got = VERSES.filter(function (v) { return done || has(VQ + '/' + v); });
    if (done) return say('THAELIN', 'HE TUNES FOR LONGER THAN HE NEEDS TO, THEN PLAYS IT THROUGH, ALL FIVE AND THE REFRAIN:\n\n' +
      got.map(verseOf).join('\n\n') + '\n\n' + REFRAIN + '\n\n"EIGHTY YEARS," HE SAYS. "AND IT TOOK SOMEONE WHO\'D NEVER HEARD IT."');
    var next = VERSES.filter(function (v) { return !has(VQ + '/' + v); })[0];
    var gname = SHUT[next], shut = gname && typeof BridgeQuests !== 'undefined' && !BridgeQuests.has('gate:' + gname);
    var where = next ? (shut ? '"THE NEXT ONE\'S AT ' + NEXT[next] + ', AND THE WARDENS HAVE THE WAY THERE ROPED OFF. WHEN THEY OPEN IT, WE GO. I\'LL STILL BE HERE. I\'M ALWAYS HERE."'
                             : '"AND THE NEXT ONE\'S AT ' + NEXT[next] + '. I\'M SURE OF IT NOW."')
                      : '"THAT\'S ALL FIVE. THE HALL, THEN. I\'LL MEET YOU AT THE HARP."';
    if (!got.length) return say('THAELIN', '"NOTHING YET? THE LOOKOUT IN THE BOUGHS. START THERE. IT\'LL BE ON THE RAIL. I WAS SITTING ON THE RAIL. DON\'T SIT ON THE RAIL."');
    say('THAELIN', 'YOU READ HIM WHAT YOU\'VE COPIED. HE PLAYS ALONG UNDER IT, VERY SOFTLY, MOUTHING THE WORDS AS THEY COME BACK.\n\n' +
      got.map(verseOf).join('\n\n') + '\n\n' + where);
  }
  register('thaelin_verses', verses, 'Listen');
  function decorateVerse(worldId, data) {
    if (worldId !== 'sylvara-tavern' || !has(VQ)) return;
    (data.interactions || []).forEach(function (it) {
      if (it.label === 'THE STAGE' && it.type === 'dialog') it.dialog = 'A STAGE OF PLANKS, A HARP, A LUTE ON ITS STAND. THE BOARD BESIDE IT HAS BEEN WIPED AND WRITTEN OUT FRESH: TONIGHT - THAELIN. NO, REALLY. THE LONG WAY HOME, ALL FIVE VERSES. (UNDER IT, IN FENNICK\'S HAND: SIT DOWN EARLY.)';
    });
  }

  function decorate(worldId, data) {
    if (!data) return;
    decorateVerse(worldId, data);
  }

  function nextUp(wid) {
    var out = [];
    if (/^sylvara/.test(wid || '') && typeof BridgeQuests !== 'undefined' && BridgeQuests.has('queens-favour') && !BridgeQuests.has(VQ + '/ask') &&
        !(BridgeQuests.rumours && BridgeQuests.rumours().indexOf(VQ) >= 0))
      out.push({ tag: 'Here', title: 'Thaelin\'s old song', text: 'Fennick at the Hollow Bough, up in the Boughs, says the bard has lost the words to his best song.', world: 'sylvara-tavern' });
    return out;
  }
  function comeBack(wid) {
    var out = [];
    if (wid === 'sylvara-river') out.push('trout off the dock; a moon carp after dark');   // Y7 (js/fishing.js `river`)
    return out;
  }
  window.BRIDGE_NEXTUP = (window.BRIDGE_NEXTUP || []).concat([nextUp]);
  window.BRIDGE_COMEBACK = (window.BRIDGE_COMEBACK || []).concat([comeBack]);

  var USES = [];

  return { USES: USES, decorate: decorate, nextUp: nextUp, comeBack: comeBack, verses: verses, verseOf: verseOf,
           _s: function () { return s; }, reload: function () { s = load(); } };
})();
