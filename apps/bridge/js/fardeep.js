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
 *   S1  Echoes that grow: the Brink's RING GATE (type `brink_ring` once you've finished anything) reads back what you've
 *       done out there — quests (not the main story's), festival placings, sea legends, Collection sets — and hangs a
 *       thread of light in the ring for each (the `singularity` items hook), the new ones brighter.
 *   E1  Okafor's seeds: her glowing tuber for three bunches of your greenhouse's herbs (`okafor_swap`), planted at the
 *       potting bench (js/greenhouse.js reads `benchRows`): two glow-tubers an hour.
 *   E2  Dispatches into the log: each cipher solved at Enigma's terminal decodes the next station dispatch (`DISPATCHES`)
 *       into the Journal's log; Okafor reads them back (`okafor_dispatches`).
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

  // ---- S1 · Echoes that grow (the Brink) ------------------------------------------------------------------------------
  // What you've finished out there, read back at the ring gate like a scrapbook — about you, nothing of the main story.
  // Worked out from what the game already keeps (quests done, a festival placing, a sea legend landed, a Collection set
  // filled), so an existing save's deeds are all there on its first visit; `seen` remembers when each was first read
  // into the ring (its date where the deed has none) and which are new since you last looked.
  var STORY = { 'ship-mark': 1, signal: 1, brink: 1, wren: 1, listeners: 1, keepsakes: 1, 'keepers-log': 1 };
  var PLACE = ['First place', 'Second place', 'Third place'], ROSE = ['blue_rosette', 'red_rosette', 'yellow_rosette'];
  function deeds() {
    var out = [];
    try {
      if (typeof BridgeQuests !== 'undefined' && BridgeQuests.finished) BridgeQuests.finished().forEach(function (f) {
        var q = BridgeQuests.def(f.id);
        if (q && !STORY[f.id]) out.push({ id: 'q:' + f.id, title: q.title, sub: q.where || '', at: f.at });
      });
      var fm = {}; try { fm = JSON.parse(localStorage.getItem('bridge_festivals') || '{}') || {}; } catch (e) { fm = {}; }
      var FS = typeof BridgeFestivals !== 'undefined' && BridgeFestivals.all ? BridgeFestivals.all() : {};
      Object.keys(fm).forEach(function (k) {
        var m = k.match(/^([a-z0-9_-]+)@(\d+)(?:#(\d+))?$/), R = fm[k], f = m && FS[m[1]];
        if (!m || !R || !(R.paid >= 1 && R.paid <= 3)) return;
        var c = f && f.contests && f.contests[+(m[3] || 0)];
        out.push({ id: 'f:' + k, title: (f ? f.name : m[1].replace(/-/g, ' ')) + (c && c.title && f.contests.length > 1 ? ': ' + c.title : ''), sub: PLACE[R.paid - 1] + (R.what ? ', with ' + R.what : ''), at: +m[2] * 86400000 + 43200000, icon: ROSE[R.paid - 1] });
      });
      if (typeof BridgeFishing !== 'undefined' && BridgeFishing.journal) (BridgeFishing.journal().fish || []).forEach(function (f) {
        if (f.tier >= 3 && f.n > 0) out.push({ id: 'l:' + f.id, title: 'Landed ' + f.name, sub: 'a sea legend' + (f.best ? ', ' + f.best + ' cm' : ''), icon: f.id });
      });
      var cs = typeof BridgeCodex !== 'undefined' && BridgeCodex._st ? BridgeCodex._st() : null;
      if (cs && cs.paid) (BridgeCodex.SETS || []).forEach(function (set) {
        if (cs.paid[set.id]) out.push({ id: 'c:' + set.id, title: set.name + ', all of them', sub: 'the Collection', at: typeof cs.paid[set.id] === 'number' ? cs.paid[set.id] : 0 });
      });
    } catch (e) { /* a module missing: what's here */ }
    var now = Date.now(), changed = false;
    out.forEach(function (d) {
      if (!s.seen[d.id]) { s.seen[d.id] = { t: d.at || now, read: 0 }; changed = true; }
      d.at = d.at || s.seen[d.id].t; d.fresh = !s.seen[d.id].read;
    });
    if (changed) store();
    return out.sort(function (a, b) { return b.at - a.at; });
  }
  function fresh() { return deeds().filter(function (d) { return d.fresh; }).length; }
  function when(t) {
    var d = new Date(t), M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return t ? M[d.getMonth()] + ' ' + d.getDate() : '';
  }
  var RING = 'A RING OF STONE, HALF SUNK. THROUGH IT THE STARS ARE IN THE WRONG PLACES.\n\nYOU SEE YOUR OWN BACK, A LONG WAY OFF.';
  function ring(inter) {
    var said = (inter && inter.__clues || []).filter(function (c) { return c.say; }).map(function (c) { return c.say; }).join('\n\n');
    if (said) return say(inter.label, said);
    var all = deeds(), nw = all.filter(function (d) { return d.fresh; }).length;
    if (!all.length) return say('RING GATE', RING);
    all.forEach(function (d) { s.seen[d.id].read = Date.now(); });
    store();
    choose({
      title: 'The ring gate',
      text: RING + '\n\nAND HANGING IN THE RING LIKE THREADS OF LIGHT, ONE FOR EVERYTHING YOU\'VE FINISHED OUT THERE, ' + (all.length === 1 ? 'ONE' : all.length) + ' OF THEM' +
        (nw ? (nw === all.length ? '.' : ', ' + (nw === 1 ? 'ONE' : nw) + ' NEW SINCE YOU WERE LAST HERE, STILL BRIGHT.') : '. THE HOLE ISN\'T REMEMBERING THE UNIVERSE. IT\'S KEEPING YOUR SCRAPBOOK.'),
      rows: all.map(function (d) { return { label: d.title, sub: d.sub, note: (d.fresh ? 'new · ' : '') + when(d.at), icon: d.icon, info: true }; }),
      closeLabel: 'Step back'
    });
  }
  register('brink_ring', ring, 'Look');
  function decorateBrink(worldId, data) {
    if (worldId !== 'singularity') return;
    (data.interactions || []).forEach(function (it) { if (it.label === 'RING GATE' && it.type === 'dialog') { it.type = 'brink_ring'; it.verb = 'Look'; } });
    var nw = fresh();
    if (nw) setTimeout(function () { toast('The Brink', nw === 1 ? 'A new echo in the ring gate' : nw + ' new echoes in the ring gate', 'Things you\'ve done, out there'); }, 1600);
  }
  // the threads of light in the ring, drawn live: one a deed (up to 30), the new ones brighter, swaying in a slow circle
  var GATE = [23.5, 14.7], cache = { t: 0, n: 0, f: 0 };
  function threads(world, offX, offY, ts, now) {
    if (typeof BridgeWorld === 'undefined' || BridgeWorld.getWorldId() !== 'singularity') return [];
    if (now - cache.t > 4000) { var all = deeds(); cache = { t: now, n: Math.min(30, all.length), f: all.filter(function (d) { return d.fresh; }).length }; }
    if (!cache.n) return [];
    return [{ footRow: GATE[1] + 0.6, draw: function (c) {
      var u = Math.max(1, Math.round(ts / 16));
      c.save(); c.globalCompositeOperation = 'lighter';
      for (var i = 0; i < cache.n; i++) {
        var a = i / cache.n * Math.PI * 2 + now / 9000, r = 0.55 + 0.12 * Math.sin(i * 2.3);
        var x = Math.round(offX + (GATE[0] + Math.cos(a) * r) * ts), y = Math.round(offY + (GATE[1] - 0.9 + Math.sin(a) * r * 0.75) * ts);
        var h = (5 + (i * 7) % 5) * u, br = i < cache.f ? 1 : 0.55, tw = 0.6 + 0.4 * Math.sin(now / 600 + i * 1.7);
        c.globalAlpha = 0.35 * br * tw; c.fillStyle = '#a080e0'; c.fillRect(x - u, y - h - u, u * 3, h + u * 2);
        c.globalAlpha = 0.9 * br * tw; c.fillStyle = i < cache.f ? '#ffffff' : '#d0c0ff'; c.fillRect(x, y - h, u, h);
      }
      c.restore();
    } }];
  }
  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('singularity', { items: threads });

  // ---- E1 · Okafor's seeds ------------------------------------------------------------------------------------------
  // Okafor swaps a seedling of her glowing tuber for three bunches of fresh herbs off your greenhouse deck (she hasn't
  // smelled mint in seventy cycles); planted at the potting bench aboard, it gives two glow-tubers every hour.
  var SWAP = 3, TUBER_EVERY = 60 * 60000;
  function fitted(m) { return typeof BridgeWayfarer !== 'undefined' && BridgeWayfarer.fitted && BridgeWayfarer.fitted(m); }
  gate('okafor-swap', function () { return !s.seeds; });
  function swap() {
    if (s.seeds) return say('OKAFOR', '"HOW\'S MY TUBER? TALK TO IT. IT LIKES THAT. IT LIKES SHANTIES BEST, BUT I DON\'T KNOW ANY."');
    if (count('okafor_seedling') > 0) return say('OKAFOR', '"IT WANTS A POT AND A GROW-LAMP. YOUR POTTING BENCH WILL DO. GO ON, IT\'S GETTING IDEAS."');
    if (!fitted('greenhouse')) return say('OKAFOR', '"A GREENHOUSE ON THAT SHIP OF YOURS? NO? WHEN THERE IS ONE, BRING ME HERBS FROM IT - REAL ONES - AND I\'LL GIVE YOU SOMETHING THAT GROWS IN THE DARK."');
    if (count('ship_herbs') < SWAP) return say('OKAFOR', '"FRESH HERBS. THREE BUNCHES, FROM YOUR OWN BEDS. I HAVEN\'T SMELLED MINT IN SEVENTY CYCLES. THEN WE\'LL TALK."' + (count('ship_herbs') ? ' (YOU HAVE ' + count('ship_herbs') + '.)' : ''));
    BridgeInventory.removeItem('ship_herbs', SWAP);
    if (BridgeInventory.give) BridgeInventory.give('okafor_seedling', 1); else BridgeInventory.addItem('okafor_seedling', 1);
    sfx('give');
    say('OKAFOR', 'SHE PUTS HER FACE IN THE HERBS AND DOESN\'T SAY ANYTHING FOR A WHILE.\n\n"RIGHT." SHE PRISES A SPROUTING TUBER OUT OF A RATION TIN AND HANDS YOU THE TIN. "IT GLOWS WHEN YOU TALK TO IT. POT IT UP UNDER A LAMP. TWO AN HOUR, ONCE IT\'S GOING. DON\'T LET IT HEAR YOU CALL IT A POTATO."');
  }
  register('okafor_swap', swap, 'Ask');
  // the potting bench (js/greenhouse.js asks for these rows): plant it, then pick what it's grown
  function benchRows(back) {
    var rows = [];
    if (!s.seeds && count('okafor_seedling') > 0) rows.push({ label: 'Plant Okafor\'s seedling', sub: 'a pot under a grow-lamp', icon: 'okafor_seedling', note: 'two glow-tubers an hour', pick: function () {
      BridgeInventory.removeItem('okafor_seedling', 1); s.seeds = Date.now() - TUBER_EVERY; store(); sfx('pickup');
      say('THE POTTING BENCH', 'YOU POT IT UP UNDER THE GROW-LAMP AND, FEELING SILLY, SAY GOOD MORNING TO IT. IT GLOWS GREEN. IT\'S ALREADY GOT TWO LITTLE TUBERS ON IT.');
    } });
    if (s.seeds) {
      var left = s.seeds + TUBER_EVERY - Date.now();
      rows.push({ label: 'Okafor\'s glow-tubers', sub: 'in a pot under the lamp', icon: 'glow_tuber', note: left > 0 ? 'ready in ' + Math.ceil(left / 60000) + ' min' : 'two ready', info: left > 0, pick: function () {
        if (s.seeds + TUBER_EVERY > Date.now()) return;
        if (!BridgeInventory.addItem('glow_tuber', 2)) return say('THE POTTING BENCH', 'YOUR PACK\'S FULL.');
        s.seeds = Date.now(); store(); sfx('pickup');
        if (back) back();
      } });
    }
    return rows;
  }

  // ---- E2 · Dispatches into the log ------------------------------------------------------------------------------------
  // Each cipher solved at Enigma's terminal (apps/cipher-room posts `bridge-run-ended`, game 'cipher-room') decodes the
  // next of the station's old dispatches into the Journal's log: shift swaps, supply orders, notices. Station business only.
  var DISPATCHES = [
    ['Supply order 114', 'Hydro: two bags of potting grit, one pump seal, seed trays (any). Signed D. Okafor. In the margin: the tomatoes want a word.'],
    ['Shift swap', 'Maintenance third shift swaps with Stores for the long weekend. Coffee owed: two. No trading back.'],
    ['Notice', 'The galley kettle is not a soldering iron. Whoever this is about knows who they are.'],
    ['Supply order 117', 'Fuses (40). Light tubes (12). One deck of cards: the old one is short a queen.'],
    ['Rota', 'Ring section C closed for the air scrub, cycles 40 to 42. Use the spine corridor. Mind the step.'],
    ['Shift swap', 'Okafor takes all of Stores\' night shifts this cycle in exchange for the big hammock. Approved, with a sigh.'],
    ['Supply order 121', 'From Arcadia port: six tins of peaches, one long squeegee, batteries. Do not substitute the peaches.'],
    ['Maintenance', 'Dock 3, clamp 2 sticks. Hit it with the mallet. It\'s fine. It\'s been fine for six cycles.'],
    ['Medical', 'Annual checks in cycle 50. Bring your card. Bring your own sweets: the jar is for the doctor.'],
    ['Shift swap', 'Relay Ops first shift needs cover on the 14th. Will pay in socks. Good socks.'],
    ['Supply order 126', 'Hydro: grow-lamp bulbs (6), twine, and a lemon tree if anyone\'s passing Verdance. (Nobody is.)'],
    ['Notice', 'Whoever keeps setting the corridor lights to "sunset": thank you. Please stop. Please don\'t stop.']
  ];
  function dispatch() {
    var n = s.dispatches.length;
    if (n >= DISPATCHES.length) return null;
    var D = DISPATCHES[n];
    s.dispatches.push(Date.now()); store();
    toast('Dispatch decoded', D[0], D[1]);
    return D;
  }
  window.addEventListener('message', function (e) {
    var d = e && e.data;
    if (d && d.type === 'bridge-run-ended' && d.game === 'cipher-room') setTimeout(dispatch, 400);
  });
  function dispatches() {
    var got = s.dispatches.length;
    if (typeof BridgeQuests !== 'undefined' && BridgeQuests.lead) BridgeQuests.lead('enigma-dispatches', 'Dami Okafor');
    if (!got) return say('OKAFOR', '"THE CIPHER TERMINAL ON THE RELAY DECK? IT\'S STILL CHEWING THROUGH THE OLD TRAFFIC. EVERY CODE YOU CRACK, SOMETHING DULL FALLS OUT. SHIFT SWAPS. PEACHES. BRING ME THE GOSSIP."');
    say('OKAFOR', 'SHE READS THEM OFF YOUR COPY, GRINNING.\n\n' + DISPATCHES.slice(0, got).map(function (D) { return (D[0] + ': ' + D[1]).toUpperCase(); }).join('\n\n') +
      (got < DISPATCHES.length ? '\n\n"MORE WHERE THOSE CAME FROM. THE TERMINAL\'S GOT YEARS OF IT."' : '\n\n"THAT\'S THE LOT. I MISS THE PEACHES."'));
  }
  register('okafor_dispatches', dispatches, 'Ask');

  function decorate(worldId, data) {
    if (!data) return;
    decorateVerse(worldId, data);
    decorateBrink(worldId, data);
  }

  function nextUp(wid) {
    var out = [];
    if (/^sylvara/.test(wid || '') && typeof BridgeQuests !== 'undefined' && BridgeQuests.has('queens-favour') && !BridgeQuests.has(VQ + '/ask') &&
        !(BridgeQuests.rumours && BridgeQuests.rumours().indexOf(VQ) >= 0))
      out.push({ tag: 'Here', title: 'Thaelin\'s old song', text: 'Fennick at the Hollow Bough, up in the Boughs, says the bard has lost the words to his best song.', world: 'sylvara-tavern' });
    if (count('okafor_seedling') > 0 && !s.seeds) out.push({ tag: 'Carrying', title: 'Okafor\'s seedling', text: 'Pot it up at the potting bench on your greenhouse deck.', world: 'ship-greenhouse' });
    if (s.seeds && s.seeds + TUBER_EVERY <= Date.now() && /^ship-/.test(wid || '')) out.push({ tag: 'Aboard', title: 'Glow-tubers ready', text: 'Two on Okafor\'s plant at the potting bench.', world: 'ship-greenhouse' });
    // W1: tonight's sight not logged yet, with the observatory fitted
    if (typeof BridgeObservatory !== 'undefined' && typeof BridgeWayfarer !== 'undefined' && BridgeWayfarer.fitted('observatory')) {
      var S = BridgeObservatory.tonight();
      if (S && BridgeObservatory.seen().indexOf(S.id) < 0) out.push({ tag: 'Aboard', title: 'Something new in the sky', text: 'The observatory\'s telescope has tonight\'s sight. Log every sight over a world and its star chart is yours.', world: 'ship-observatory' });
    }
    var nw = fresh();
    if (nw && typeof BridgeQuests !== 'undefined' && BridgeQuests.visited && BridgeQuests.visited().singularity)
      out.push({ tag: 'Brink', title: nw === 1 ? 'A new echo at the Brink' : nw + ' new echoes at the Brink', text: 'Things you\'ve finished, hanging in the ring gate at the Singularity like threads of light.', world: 'singularity' });
    return out;
  }
  function comeBack(wid) {
    var out = [];
    if (wid === 'sylvara-river') out.push('trout off the dock; a moon carp after dark');   // Y7 (js/fishing.js `river`)
    if (wid === 'ship-greenhouse' && s.seeds) out.push('two glow-tubers an hour on Okafor\'s plant');   // E1
    if (wid === 'enigma' && s.dispatches.length < DISPATCHES.length) out.push('a station dispatch for every cipher you crack');   // E2
    if (wid === 'singularity') out.push('a new echo in the ring gate for each thing you finish out there');   // S1
    return out;
  }
  window.BRIDGE_NEXTUP = (window.BRIDGE_NEXTUP || []).concat([nextUp]);
  window.BRIDGE_COMEBACK = (window.BRIDGE_COMEBACK || []).concat([comeBack]);

  var USES = [
    { id: 'ship_herbs', p: 5, t: '<b>Okafor</b> on Enigma swaps a seedling of her glowing tuber for ' + SWAP + ' of them' },
    { id: 'okafor_seedling', p: 9, t: 'Plant it at the <b>potting bench</b> on your greenhouse deck: two glow-tubers an hour from then on' }
  ];

  return { USES: USES, decorate: decorate, nextUp: nextUp, comeBack: comeBack, verses: verses, verseOf: verseOf, deeds: deeds, ring: ring, benchRows: benchRows, swap: swap, dispatch: dispatch, DISPATCHES: DISPATCHES,
           _s: function () { return s; }, reload: function () { s = load(); } };
})();
