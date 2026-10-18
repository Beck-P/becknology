/**
 * BridgeRose — the Rose Sea's own places (workstream B1): Rosewell, the bathhouse town on Rose Cove's hot springs
 * (world "lumar-rose-springs", scenes/lumar_rose_springs.py), its bathhouse ("lumar-rose-bathhouse") and tea house
 * ("lumar-rose-teahouse"). Interactions of type `rose` carry an `act`:
 *
 *   bath      the bathhouse's great bath: a few coins to rest (health and energy back to full) and warm up — the cold
 *             stays out of you for two hours after (js/worlds/hoarfell.js `warm`)
 *   soak      the hot pools on the terraces, free: a little energy, warm for half an hour; once a day the soak is a
 *             proper one and lifts you more
 *   tea       Master Lior's pots: rosehip (energy), emberleaf (warm for an hour and a half), moonleaf (health)
 *   silk      the silk trees: gather the empty cocoons that are ripe today (silk_cocoon), once a day
 *   looms     Seren's looms: five cocoons woven into a glowing spore silk scarf (silk_scarf), a gift anyone loves
 *   reading   Mother Amaryllis reads the steam for a few coins: a true tip dressed as prophecy
 *
 * Rose Cove gets the path up to Rosewell (`decorate`, so a re-render of Rose Cove never loses it).
 *
 * BridgeRose.use(inter) · .decorate(worldId, data)
 */
var BridgeRose = (function () {
  var KEY = 'bridge_rose';
  var st = load();
  var BATH = 12, READING = 4, SCARF = 5;
  var TEAS = [
    { id: 'rosehip', label: 'Rosehip', sub: 'bright and sour · +40 energy', price: 6, en: 40 },
    { id: 'ember', label: 'Emberleaf', sub: 'smoky, hot all the way down · warm through the cold for an hour and a half', price: 8, warm: 90 },
    { id: 'moon', label: 'Moonleaf', sub: 'pale, almost sweet · +40 health', price: 8, hp: 40 }
  ];
  // the steam's prophecies: true tips, said strangely
  var READINGS = [
    'THE STEAM SHOWS A FISH MADE OF GLASS, ITS HEART BEATING. IT SWIMS IN BLUE WATER, FAR FROM ANY PIER. YOU WILL NEED A BOAT, AND PATIENCE, AND A LONG CAST.',
    'I SEE A WHITE TOWN ON A BROKEN MOUNTAIN, AND A DONKEY WHO JUDGES YOU. PAY THE DONKEY. THE STEPS ARE MANY.',
    'A FURNACE THAT HAS NEVER GONE OUT. A PIPE IN YOUR HAND. THE GOLD MOMENT, THEN THE SOFT ONE, THEN THE LAST. DO NOT RUSH THE THIRD.',
    'THE STEAM SMELLS OF SALT AND BARGAINING. THE FLOATING MARKET PAYS BEST FOR WHAT THE MARKET HAS NONE OF. BRING THEM WHAT THE FARM WORLD GROWS.',
    'COLD. SO MUCH COLD, AND A MOUNTAIN. THE WATER HERE WILL GO WITH YOU INSIDE YOUR BONES FOR A WHILE. BATHE BEFORE YOU CLIMB.',
    'A MOTH, AND A MILE OF LIGHT WOUND UP SMALL. FIVE OF THEM MAKE A GIFT THAT NOBODY REFUSES. THE STEAM IS VERY SURE ABOUT THIS.',
    'THE STEAM SHOWS ME A RED SEA AND A BLACK SAIL. LIGHT A CANDLE IN THE CAPITAL BEFORE YOU GO. OR A LAMP ON THE CLIFF. THE SEA IS NOT FUSSY ABOUT WHICH.',
    'I SEE LANTERNS GOING DOWN A CLIFF IN A ZIGZAG, AND A SUNSET THAT MAKES STRANGERS CLAP. BE ON THE PROMENADE AT DUSK.'
  ];

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode */ } }
  function day() { return Math.floor(Date.now() / 86400000); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }
  function say(t, x) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(t, x); }
  function choose(o) { if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.choose) BridgeInteractions.choose(o); }
  function toast(a, b, c) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(a, b, c); }
  function note(a, b, c) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.note) BridgeQuests.note(a, b, c); }
  function pay(n, why) {
    return typeof BridgeProgression !== 'undefined' && BridgeProgression.wagerCoins ? BridgeProgression.wagerCoins(n, why) : Promise.resolve({ ok: false });
  }
  function warm(min) { if (typeof BridgeHoarfell !== 'undefined' && BridgeHoarfell.warm) BridgeHoarfell.warm(min); }
  function restore(hp, en) {
    if (typeof BridgeInventory === 'undefined') return;
    if (hp) BridgeInventory.restoreHP(hp);
    if (en) BridgeInventory.restoreEnergy(en);
  }
  function count(id) { return typeof BridgeInventory !== 'undefined' && BridgeInventory.getCount ? BridgeInventory.getCount(id) : 0; }

  function use(inter) {
    switch (inter.act) {
      case 'bath': return bath();
      case 'soak': return soak();
      case 'tea': return tea();
      case 'silk': return silk();
      case 'looms': return looms();
      case 'reading': return reading();
    }
  }

  // ---- the bathhouse ------------------------------------------------------------------------------------------------
  function bath() {
    choose({
      title: 'The great bath',
      text: 'STEAM OFF THE WATER, BLUE TILES UNDER YOUR FEET, THE BRONZE FISH SPLASHING AT THE FAR END. ODA HOLDS OUT A TOWEL. "AS LONG AS YOU LIKE," SHE SAYS. "THE WATER\'S IN NO HURRY."',
      rows: [{ label: 'Bathe', sub: 'rest: health and energy back to full · warm through the cold for two hours', note: BATH + ' coins', pick: function () {
        pay(BATH, 'rosewell:bath').then(function (r) {
          if (!r || !r.ok) return say('THE BATH', 'ODA TAPS THE SIGN: ' + BATH + ' COINS. "THE SPRINGS ARE FREE," SHE SAYS. "THE TOWELS AREN\'T."');
          restore(999, 999);
          warm(120);
          st.baths = (st.baths || 0) + 1; store();
          sfx('chime');
          toast('Rested and warm', 'The bathhouse at Rosewell', 'The cold stays out of you for two hours');
          if (st.baths === 1) note('Rosewell', 'Bathed in the great bath', 'Came out pinker');
          say('THE BATH', 'YOU GO DOWN THE STEPS INTO THE HOT PINK WATER, UP TO YOUR SHOULDERS. SOMEWHERE THE FISH SPLASHES. SOMEWHERE ODA IS HUMMING. THE ACHES OF A HUNDRED PASSAGES LET GO ONE BY ONE.\n\nWHEN YOU CLIMB OUT, THE WARMTH COMES WITH YOU.');
        });
      } }],
      closeLabel: 'Not now'
    });
  }
  function soak() {
    var deep = st.soak !== day();
    if (deep) { st.soak = day(); store(); }
    restore(deep ? 20 : 0, deep ? 30 : 8);
    warm(30);
    sfx('blip');
    say('HOT POOL', deep
      ? 'YOU SINK INTO THE POOL UNTIL ONLY YOUR HEAD IS OUT, THE TERRACE\'S LIP UNDER YOUR CHIN. BELOW, THE TOWN\'S LAMPS; ABOVE, THE SILK GROVES GLOWING. A STRANGER IN THE NEXT POOL NODS TO YOU, SOLEMN AS A JUDGE.\n\n+30 ENERGY, AND WARM FOR A WHILE.'
      : 'YOU SIT IN THE WARM WATER A WHILE LONGER. IT IS EXACTLY AS PLEASANT AS LAST TIME, WHICH IS VERY.');
  }

  // ---- the tea house ------------------------------------------------------------------------------------------------
  function tea() {
    choose({
      title: 'A pot of tea',
      text: 'MASTER LIOR LIFTS THE KETTLE OFF ITS HOOK AND WAITS, AS IF THE TEA WILL TELL HIM WHICH ONE YOU WANT. "TIRED, COLD OR HURT?" HE SAYS AT LAST. "EVERYONE IS ONE OF THE THREE."',
      rows: TEAS.map(function (t) {
        return { label: t.label, sub: t.sub, note: t.price + ' coins', pick: function () {
          pay(t.price, 'rosewell:tea').then(function (r) {
            if (!r || !r.ok) return say('MASTER LIOR', 'LIOR LOOKS AT THE COINS IN YOUR HAND, THEN AT YOU. "NEXT TIME," HE SAYS, KINDLY.');
            restore(t.hp, t.en);
            if (t.warm) warm(t.warm);
            sfx('coin');
            say('MASTER LIOR', 'HE POURS FROM HIGH UP, SO THE TEA FOAMS IN THE LITTLE CUP, AND SETS IT DOWN WITHOUT A SOUND. "' + t.label.toUpperCase() + '. DRINK IT WHILE IT IS ANGRY." IT TASTES OF STEAM AND SOMETHING YOU REMEMBER FROM A LONG TIME AGO.');
          });
        } };
      }),
      closeLabel: 'Not now'
    });
  }

  // ---- the silk groves ----------------------------------------------------------------------------------------------
  function silk() {
    if (st.silk === day()) return say('SILK TREES', 'YOU\'VE GATHERED WHAT WAS RIPE TODAY. THE MOTHS STILL IN THEIR COCOONS GLOW AT YOU, OFFENDED.');
    st.silk = day(); store();
    var n = 2 + Math.floor(Math.random() * 2);
    if (typeof BridgeInventory !== 'undefined') BridgeInventory.addItem('silk_cocoon', n);
    sfx('pickup');
    say('SILK TREES', 'YOU REACH UP INTO THE LOW BRANCHES WHERE THE EMPTY COCOONS HANG - THE MOTHS LONG FLOWN - AND PICK ' + n + ', STILL GLOWING FAINTLY PINK IN YOUR HAND. SEREN WATCHES, APPROVING, FROM THE SHED.\n\nFIVE WILL MAKE A SCARF ON HER LOOM.');
  }
  function looms() {
    var have = count('silk_cocoon');
    choose({
      title: 'Seren\'s looms',
      text: 'THREE LOOMS UNDER THE SHED, THE SILK ON THEM GLOWING AS IT GROWS. "BRING ME FIVE COCOONS," SEREN SAYS, "AND I\'LL WEAVE YOU SOMETHING TO GIVE AWAY. NOBODY HAS EVER REFUSED ONE." YOU HAVE ' + have + '.',
      rows: [{ label: 'Weave a spore silk scarf', icon: 'silk_scarf', sub: 'five silk cocoons', note: have >= SCARF ? 'weave' : have + ' / ' + SCARF, disabled: have < SCARF, pick: function () {
        if (count('silk_cocoon') < SCARF || typeof BridgeInventory === 'undefined') return;
        BridgeInventory.removeItem('silk_cocoon', SCARF);
        BridgeInventory.addItem('silk_scarf', 1);
        sfx('clue');
        toast('A spore silk scarf', 'Woven on Seren\'s loom', 'A gift anyone would love');
        say('LOOMS', 'THE SHUTTLE FLIES. THE COCOONS UNWIND INTO A THREAD SO FINE YOU CAN ONLY SEE IT BY ITS GLOW, AND THE THREAD BECOMES CLOTH, AND THE CLOTH BECOMES A SCARF THAT LIGHTS SEREN\'S HANDS FROM BELOW. "THERE," SHE SAYS. "WHO\'S IT FOR?"');
      } }],
      closeLabel: 'Not now'
    });
  }

  // ---- the reading --------------------------------------------------------------------------------------------------
  function reading() {
    choose({
      title: 'A reading',
      text: 'MOTHER AMARYLLIS BENDS OVER THE STEAM RISING FROM THE STEP AT HER FEET AND WAVES IT TOWARD HER. "' + READING + ' COINS," SHE SAYS, "AND THE STEAM TELLS YOU SOMETHING TRUE. NOT ALWAYS WHAT YOU WANTED. ALWAYS TRUE."',
      rows: [{ label: 'Have your steam read', sub: 'a true tip, said strangely', note: READING + ' coins', pick: function () {
        pay(READING, 'rosewell:reading').then(function (r) {
          if (!r || !r.ok) return say('A READING', 'THE STEAM, SAYS MOTHER AMARYLLIS, DOES NOT WORK ON CREDIT.');
          var i = (day() * 7 + (st.read = (st.read || 0) + 1)) % READINGS.length;
          store();
          sfx('chime');
          note('A reading at Rosewell', READINGS[i].slice(0, 60) + '…', 'Mother Amaryllis');
          say('A READING', READINGS[i]);
        });
      } }],
      closeLabel: 'Not now'
    });
  }

  // ---- Rose Cove: the path up to Rosewell ----------------------------------------------------------------------------
  var SPRINGS_PATH = { x: 52, y: 22, type: 'enter_world', target: 'lumar-rose-springs', spawn: [21, 26], label: 'ROSEWELL',
                       prompt: 'PRESS E TO GO UP TO THE SPRINGS' };
  var SPRINGS_OPEN = false;                  // (off until Rosewell's world is in the game)
  function decorate(worldId, data) {
    if (!SPRINGS_OPEN || worldId !== 'lumar-rose' || !data) return;
    data.interactions = data.interactions || [];
    if (!data.interactions.some(function (it) { return it.target === SPRINGS_PATH.target; })) data.interactions.push(Object.assign({}, SPRINGS_PATH));
  }

  return { use: use, decorate: decorate, SPRINGS_PATH: SPRINGS_PATH, READINGS: READINGS };
})();
