/**
 * BridgeTouring — the High Route: three days hut to hut from Aurelle over the glaciers to the hidden valley (Beck
 * liked "hut-to-hut ski touring"). Hoarfell's own systems carry it: the cold (js/worlds/hoarfell.js), the crevasse
 * fields, wands, cairns and whiteouts (js/expedition.js — any world with an `expedition` block), free skiing
 * (js/ski.js — any world with a `ski` block) and a night's rest (BridgeActions.rest).
 *
 *   Day 1  the Aurelle Glacier (`hoarfell-glacier`): up the moraine, over the crevasse field on the wands, past the
 *          icefall to the Cabane Bleue (`hoarfell-hut-bleue`, Odile's).
 *   Day 2  over the Col du Vent at first light, then the long powder bowl below it skied free (`hoarfell-col`) down to
 *          the Refuge du Col (`hoarfell-hut-col`, Bram's).
 *   Day 3  down through the larches into the hidden valley (`hoarfell-valley`, js/valley.js).
 * The bureau des guides in Aurelle starts it (a guide's fee the first time); you can't go on from a hut till you've
 * slept there. Once you've been, the guides walk you to the valley in a day. Saved in localStorage `bridge_touring`.
 *
 * Interactions (type `touring`, by `action`): guides, back, hut, warden, soup, bunk, book, radio, next.
 *   BridgeTouring.use(inter)   BridgeTouring.decorate(worldId, data)   BridgeTouring.state()
 */
var BridgeTouring = (function () {
  var KEY = 'bridge_touring', FEE = 100;
  var DAYS = {
    1: { world: 'hoarfell-glacier', spawn: [10, 39], name: 'The Aurelle Glacier', hut: 'hoarfell-hut-bleue' },
    2: { world: 'hoarfell-col', spawn: [22, 4], name: 'The Col du Vent', hut: 'hoarfell-hut-col' },
    3: { world: 'hoarfell-valley', spawn: null, name: 'The hidden valley' }
  };
  var HUTS = {
    'hoarfell-hut-bleue': { day: 1, warden: 'ODILE', next: 2,
      hello: 'ODILE, SMALL AND SQUARE, A LADLE IN ONE HAND. "BOOTS OFF, SKINS ON THE RACK, SOUP\'S HOT. YOU\'RE THE ONE GOING OVER THE COL? HM. EAT FIRST."',
      lore: '"THE VALLEY? IT\'S REAL. WARM UNDER THE SNOW, STEAM COMING UP OUT OF THE ROCK. THE MONKS WENT THERE A THOUSAND YEARS AGO AND THE MOUNTAIN KEPT THEM. DON\'T WANDER INTO THE CAVES WITHOUT A LIGHT. AND IF YOU SEE SOMETHING BIG AND WHITE, DON\'T RUN. IT\'S MORE FRIGHTENED THAN YOU."' },
    'hoarfell-hut-col': { day: 2, warden: 'BRAM', next: 3,
      hello: 'BRAM FILLS THE DOORWAY OF HIS OWN KITCHEN. "YOU SKIED THE BOWL? GOOD SNOW TODAY. SIT. THERE\'S STEW, AND THERE\'S MORE STEW."',
      lore: '"TOMORROW IT\'S ALL DOWNHILL - THE LARCHES, THEN THE STEAM. THE WOLVES ARE ON THE OUTER SLOPES; THEY HUNT IN THREES. FURTHER IN, THE CAVES, THE OLD MONASTERY, AND SOMETHING UNDER THE SNOW AT THE HEART OF IT THAT NOBODY\'S SEEN AND EVERYBODY\'S HEARD."' }
  };
  var BOOK = {
    'hoarfell-hut-bleue': [
      ['MATHIS ROUX, GUIDE', 'TWELFTH CROSSING THIS SEASON. THE BRIDGE OVER THE THIRD CRACK IS THINNING. PUT IN NEW WANDS. - M.'],
      ['TWO NAMES IN ONE HAND, A HEART', 'OUR HONEYMOON. SHE CRIED ON THE GLACIER AND LAUGHED ON THE COL. WORTH IT.'],
      ['IVO VENN, CARTOGRAPHER', 'MAPPED THE CABANE TO THE COL. THE VALLEY BEYOND IS NOT ON ANY CHART AND I HAVE DECIDED NOT TO PUT IT ON MINE.']
    ],
    'hoarfell-hut-col': [
      ['BROTHER ANSELM (A SHAKY HAND)', 'CAME UP FROM THE VALLEY FOR SALT AND TEA. THE MONASTERY IS QUIET NOW. TOO QUIET. THE COLD HAS GOT INTO THE LOWER HALLS.'],
      ['YSOLDE, FELLHAVEN', 'SKIED THE BOWL IN SEVEN TURNS. BRAM SAYS IT\'S SIX IF YOU\'RE BRAVE. TOMORROW, SIX.'],
      ['"A FRIEND" (DRAWING OF A LARGE FURRY FOOT)', 'LEFT BERRIES ON THE STEP. TOOK ONE SOCK.']
    ]
  };

  var st = load();
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || fresh(); } catch (e) { return fresh(); } }
  function fresh() { return { day: 0, slept: {}, paid: false, done: 0, signed: {} }; }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode */ } }
  function say(l, t) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(l, t); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }
  function toast(k, t, s) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(k, t, s); }
  function note(t, s) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.note) BridgeQuests.note('The High Route', t, s); }
  function has(id) { return typeof BridgeInventory !== 'undefined' && BridgeInventory.getCount(id) > 0; }
  function warmGear() { return typeof BridgeHoarfell !== 'undefined' && BridgeHoarfell.isWarm && BridgeHoarfell.isWarm(); }
  function choose(title, text, rows, close) { BridgeInteractions.choose({ title: title, text: text, rows: rows, closeLabel: close || 'Not now' }); }

  function use(inter) {
    switch (inter.action) {
      case 'guides': return guides();
      case 'back': return back(inter);
      case 'hut': return hut(inter);
      case 'warden': return warden();
      case 'soup': return soup();
      case 'bunk': return bunk();
      case 'book': return book();
      case 'radio': return radio();
      case 'next': return next();
    }
  }

  // ---- the bureau des guides in Aurelle -------------------------------------------------------------------------------
  function guides() {
    var rows = [];
    var gearNote = (has('skis') ? '' : ' YOU\'LL NEED SKIS - THE HIRE IN FELLHAVEN.') + (warmGear() ? '' : ' AND SOMETHING WARMER THAN THAT.');
    rows.push({ label: st.day ? 'Back onto the route (day ' + st.day + ')' : 'The High Route', sub: st.day ? DAYS[st.day].name
      : 'three days hut to hut, over the glacier and the Col du Vent, to the hidden valley', note: st.paid ? '' : FEE + ' coins', pick: function () {
        if (!has('skis')) return say('MATHIS', '"NOT WITHOUT SKIS. THE HIRE IN FELLHAVEN WILL SORT YOU OUT. COME BACK WITH WAX ON THEM."');
        var go = function () {
          if (!st.day) { st.day = 1; st.slept = {}; store(); toast('The High Route', 'Day one: the Aurelle Glacier', 'Rope up. Keep to the wands'); note('Day one', 'Up the Aurelle Glacier to the Cabane Bleue'); }
          var D = DAYS[st.day] || DAYS[1];
          BridgeWorld.enterWorld(D.world, D.spawn || undefined);
        };
        if (st.paid) return go();
        BridgeProgression.wagerCoins(FEE, 'touring').then(function (r) {
          if (!r || !r.ok) return say('MATHIS', '"' + FEE + ' FOR THE ROUTE NOTES, THE HUT BOOKINGS AND MY NUMBER IF YOU FALL IN SOMETHING. IT\'S A BARGAIN, BELIEVE ME."');
          st.paid = true; store(); go();
        });
      } });
    if (st.done) rows.push({ label: 'The valley path', sub: 'a long day\'s walk straight to the hidden valley', pick: function () {
      BridgeWorld.enterWorld('hoarfell-valley');
    } });
    choose('Bureau des guides', 'MATHIS ROUX, A GUIDE WITH A FACE LIKE A WALNUT, SPREADS A MAP ACROSS THE COUNTER. "THE HIGH ROUTE: THE GLACIER TO THE CABANE BLEUE, OVER THE COL DU VENT AND SKI THE BOWL TO BRAM\'S REFUGE, THEN DOWN INTO THE VALLEY NOBODY PUTS ON A MAP. THREE DAYS. A HUT EACH NIGHT."' + gearNote, rows);
  }

  function back(inter) {
    choose('The way down', 'BACK DOWN THE MORAINE TO AURELLE. THE ROUTE WILL KEEP: THE HUT BOOKING STANDS.', [
      { label: 'Go back down', sub: 'to Aurelle', pick: function () { BridgeWorld.enterWorld(inter.target || 'hoarfell-aurelle', inter.spawn || [9, 17]); } }
    ], 'Stay');
  }

  // ---- the huts --------------------------------------------------------------------------------------------------------
  function hutHere() { return HUTS[BridgeWorld.getWorldId()]; }
  function hut(inter) {
    var H = HUTS[inter.target];
    if (H && st.day < H.day) { st.day = H.day; store(); }
    sfx('door');
    BridgeWorld.enterWorld(inter.target, inter.spawn);
    if (H && !(st.reached || {})[inter.target]) {
      st.reached = st.reached || {}; st.reached[inter.target] = 1; store();
      setTimeout(function () { toast(H.day === 1 ? 'The Cabane Bleue' : 'The Refuge du Col', 'Night ' + H.day + ' of the High Route', 'Eat, sleep, go on at first light'); }, 900);
      note(H.day === 1 ? 'The Cabane Bleue' : 'The Refuge du Col', 'A hut for the night');
    }
  }
  function warden() {
    var H = hutHere();
    if (!H) return;
    choose(H.warden.charAt(0) + H.warden.slice(1).toLowerCase(), H.hello, [
      { label: 'What\'s ahead?', sub: 'the way on', pick: function () { say(H.warden, H.lore); } },
      { label: 'A bowl of soup', sub: 'warm through; energy', note: '6 coins', pick: soup }
    ], 'Thanks');
  }
  function soup() {
    BridgeProgression.wagerCoins(6, 'touring').then(function (r) {
      if (!r || !r.ok) return say('THE POT', 'THE WARDEN SLIDES YOU A BOWL ANYWAY. "PAY ME TOMORROW. EVERYBODY DOES."');
      if (typeof BridgeHoarfell !== 'undefined') BridgeHoarfell.warm(20);
      if (typeof BridgeInventory !== 'undefined') { BridgeInventory.restoreEnergy(35); BridgeInventory.restoreHP(15); }
      sfx('sit');
      say('THE POT', 'BARLEY AND SMOKED SAUSAGE, A HUNK OF BREAD, A SPOON THAT STANDS UP IN IT. YOU COULD CLIMB A MOUNTAIN ON THIS. TOMORROW, YOU WILL.');
    });
  }
  function bunk() {
    var H = hutHere();
    if (!H) return;
    var go = function () {
      st.slept[BridgeWorld.getWorldId()] = 1;
      if (st.day < H.next) st.day = H.next;
      store();
    };
    if (typeof BridgeActions === 'undefined' || !BridgeActions.rest) { go(); return say('BUNKS', 'YOU SLEEP LIKE THE DEAD. MORNING COMES BLUE AT THE WINDOW.'); }
    BridgeActions.rest({ rate: 1.2, text: 'A top bunk under the eaves, a grey blanket, eleven strangers snoring. The stove ticks as it cools.',
      rested: H.next === 2 ? 'The warden bangs a pan at five. Blue light at the window; the col is waiting. Health and energy full.'
                           : 'Bram\'s already up, frying something. The way down to the valley is all yours today. Health and energy full.',
      onTick: function (dt) { if (typeof BridgeHoarfell !== 'undefined') BridgeHoarfell.warm(dt * 1.5); },
      woke: function () { go(); toast('Day ' + H.next, DAYS[H.next].name, H.next === 2 ? 'Over the col, then ski the bowl' : 'Down into the hidden valley'); } });
  }
  function next() {
    var H = hutHere();
    if (!H) return;
    if (!st.slept[BridgeWorld.getWorldId()]) {
      return say(H.warden, H.warden === 'ODILE' ? '"IN THE DARK? OVER THE COL? YOU\'LL SLEEP FIRST, THANK YOU, AND GO AT FIRST LIGHT LIKE A PERSON WITH SENSE."'
                                                : '"NOBODY GOES DOWN THAT VALLEY TIRED. BUNK. NOW. I\'LL WAKE YOU."');
    }
    var D = DAYS[H.next];
    if (H.next === 3) {
      if (!st.done) { st.done = 1; note('The hidden valley', 'Three days hut to hut, and the valley under the steam'); toast('The hidden valley', 'Warm from below', 'Steam, moss, the monastery on its cliff'); }
      else st.done++;
      st.day = 0; st.slept = {}; store();
    }
    BridgeWorld.enterWorld(D.world, D.spawn || undefined);
  }
  function book() {
    var wid = BridgeWorld.getWorldId(), list = BOOK[wid] || [];
    var name = ((typeof BridgeState !== 'undefined' && BridgeState.getPilot()) || {}).name || 'A PILOT';
    var lines = list.map(function (e) { return e[0] + ':\n"' + e[1] + '"'; }).join('\n\n');
    if (!st.signed[wid]) { st.signed[wid] = 1; store(); }
    sfx('clue');
    say('HUT BOOK', 'A FAT BOOK WITH A PENCIL ON A STRING, ITS PAGES WARPED BY A HUNDRED WET GLOVES.\n\n' + lines + '\n\nYOU WRITE: "' + String(name).toUpperCase() + ', HEADING OVER." ');
  }
  function radio() {
    var wx = typeof BridgeWeather !== 'undefined' && BridgeWeather.here ? BridgeWeather.here('hoarfell') : null;
    say('RADIO', 'IT CRACKLES. A VOICE FROM AURELLE READS THE MOUNTAIN FORECAST IN A VOICE THAT\'S SEEN EVERYTHING: "' +
        (wx && wx.kind ? 'TOMORROW ON THE HIGH ROUTE: ' + String(wx.kind).toUpperCase() + '. ' : '') +
        'WIND ON THE COL, LIGHT IN THE BOWL. HUT WARDENS, THE CHEESE DELIVERY IS LATE AGAIN. OVER."');
  }

  // ---- as worlds load -----------------------------------------------------------------------------------------------
  function decorate(worldId, data) {
    if (!data || !data.interactions) return;
    if (worldId === 'hoarfell-aurelle' && !data.interactions.some(function (i) { return i.action === 'guides'; })) {
      data.interactions.push({ x: 9, y: 17, type: 'touring', action: 'guides', label: 'BUREAU DES GUIDES', prompt: 'PRESS E TO ASK' });
      // Mathis himself, at his door (people.json `mathis`)
      data.interactions.push({ x: 8, y: 17, type: 'dialog', label: 'MATHIS', prompt: 'PRESS E TO TALK', dialog: 'MATHIS ROUX, GUIDE.' });
      if (data.scene) (data.scene.actors = data.scene.actors || []).push({ sheet: 'npc-mathis', x: 8, y: 17, facing: 'down' });
      if (data.collisions && data.collisions[17]) data.collisions[17][8] = 1;
    }
    var H = HUTS[worldId];
    if (H && !data.interactions.some(function (i) { return i.action === 'next'; })) {
      data.interactions.push({ x: 10, y: 9, type: 'touring', action: 'next', label: H.next === 2 ? 'ON TO THE COL' : 'DOWN TO THE VALLEY', prompt: 'PRESS E TO SET OFF' });
    }
  }

  function init() {
    if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.register) BridgeInteractions.register('touring', use, 'Go');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  return { use: use, decorate: decorate, state: function () { return st; }, DAYS: DAYS, HUTS: HUTS, _reset: function () { st = fresh(); store(); } };
})();
