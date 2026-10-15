/**
 * BridgeDistrict — what the District's shops are for.
 *
 * Set up on their interactions as the worlds load (labels kept, types
 * changed): Cyber Noodles' pot serves ramen and udon; the Chrome Clinic's exam
 * chair patches you up (twenty coins to full health) and its cabinet sells
 * med-kits and stims; Joro's junk pile can be rummaged for twenty coins —
 * mostly junk, sometimes not (`RUMMAGE`: a weighted table, a treasure map
 * now and then, a gold pocket watch Joro will buy back). Miyu buys eggs and
 * vegetables from the farm at a kitchen's price (people.json).
 *
 * On the Skywalk (arcadia-skywalk): ZOLTA.EXE's booth tells a fortune for
 * ten coins (`FORTUNES`, true tips dressed up as prophecy), and B-SIDE the
 * busker robot plays you something for a five-coin tip — the first tune of
 * the day lifts your energy.
 *
 *   BridgeDistrict.decorate(worldId, data) / .use(inter)
 */
var BridgeDistrict = (function () {
  var HEAL = 20, DIG = 20, FORTUNE = 10, TIP = 5;
  var FORTUNES = [
    'A LIGHT BURNS PAST THE LAST RIDGE. A LANTERN THAT NEVER GOES OUT. THE WAY IS MARKED IN ORANGE RAGS.',
    'THE OLD MAN AT THE DICE TABLE DOES NOT BLUFF. THE WOMAN WITH THE GREASE ON HER HANDS DOES.',
    'THE PEDDLER MOVES WITH THE DAYS. ASK HIM WHAT HE HAS HEARD; HE HEARS A GREAT DEAL.',
    'FLOOR TWENTY SINGS. GO DOWN WITH A GOOD PICK AND A FULL BELLY.',
    'A PEARL SLEEPS IN THE MOON POOL. CAST LONG, AND BE PATIENT WITH WHAT FIGHTS.',
    'ON THE FARM, THE HENS REMEMBER KINDNESS. A HAND ON THEM EACH DAY, AND GOLD FOLLOWS.',
    'THE GIRL IN THE RED COAT CHECKS THE BOARD EVERY NIGHT. BEAT HER ONCE AND SHE WILL NEVER FORGET YOU.',
    'WHAT THE JUNK MAN THROWS ON THE PILE, HE SOMETIMES WISHES HE HAD KEPT. A WATCH STOPPED AT TEN TO THREE.',
    'THE SEA HAS FIVE COLOURS AND ONE MORE NOBODY TALKS ABOUT.',
    'A BELL RINGS UNDER THE WATER OFF THE TEETH. SOMEONE IS STILL WAITING FOR AN ANSWER.',
    'WHERE THE MAP SAYS X, DIG. THE INK DOES NOT LIE, BUT IT DOES NOT NAME THE ISLAND EITHER.',
    'YOU WILL TAKE A LONG WAY ROUND TO SOMEWHERE SHORT. THIS IS GOOD. THE SHORT WAY IS BORING.',
    'SOMEONE WHO WRITES TO YOU IS THINKING OF YOU NOW. THE LETTER RACK ON YOUR SHIP KNOWS.',
    'THE KEEPER OF THE LIGHT SIGNALS THREE LONG AND ONE SHORT. NOBODY HAS ANSWERED IN YEARS.',
    'A SMALL DOG WILL DIG UP A LARGE SURPRISE. FEED IT WELL.',
    'THE STARS SAY NOTHING. ZOLTA SAYS: BUY THE FONDUE.'
  ];
  var RUMMAGE = [
    [30, 'old_boot', 'AN OLD BOOT. OF COURSE IT IS.'],
    [18, 'silver_nail', 'A HANDFUL OF SILVER NAILS, STILL SHINY.'],
    [14, 'sea_glass', 'A PIECE OF SEA GLASS SOMEONE BROUGHT ALL THE WAY FROM LUMAR.'],
    [12, 'void_fizz', 'A SEALED BOTTLE OF VOID FIZZ. STILL GLOWS.'],
    [10, 'coins', 'A TIN WITH COINS IN IT. MORE THAN YOU PAID.'],
    [8, 'sapphire_crystal', 'A BLUE CRYSTAL, WRAPPED IN A SOCK.'],
    [5, 'pocket_watch', 'A GOLD POCKET WATCH, STOPPED AT TEN TO THREE. JORO\'S EYEBROWS GO UP.'],
    [3, 'map', 'A FOLDED MAP, INKED BY HAND. AN X.']
  ];
  function say(t, x) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(t, x); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }

  function decorate(worldId, data) {
    var first = {};
    (data.interactions || []).forEach(function (it) {
      var k = it.label;
      if (worldId === 'cyber-noodle-bar' && k === 'NOODLE POT') {
        it.type = 'vendor'; it.prompt = 'PRESS E TO ORDER';
        it.items = [{ id: 'spore_ramen', price: 14 }, { id: 'neon_udon', price: 9 }];
      }
      if (worldId === 'chrome-clinic' && k === 'EXAM CHAIR') { it.type = 'clinic'; it.prompt = 'PRESS E TO GET PATCHED UP'; }
      if (worldId === 'chrome-clinic' && k === 'MEDICAL CABINET' && !first.cab) {
        first.cab = true; it.type = 'vendor'; it.prompt = 'PRESS E TO BUY';
        it.items = [{ id: 'medkit', price: 30 }, { id: 'stim_pack', price: 25 }];
      }
      if (worldId === 'junk-pawn-shop' && k === 'JUNK PILE' && !first.junk) { first.junk = true; it.type = 'rummage'; it.prompt = 'PRESS E TO RUMMAGE'; }
    });
  }

  function use(inter) {
    if (inter.type === 'clinic') return clinic();
    if (inter.type === 'rummage') return rummage();
    if (inter.type === 'fortune') return fortune();
    if (inter.type === 'busker') return busker();
  }

  // ---- the Skywalk: a fortune, a tune --------------------------------------------------------------------------------
  function fortune() {
    BridgeInteractions.choose({
      title: 'ZOLTA.EXE',
      text: 'THE HOLOGRAPHIC HEAD IN THE GLASS OPENS ITS EYES. "ZOLTA SEES ALL. ZOLTA SEES YOUR POCKETS. ' + FORTUNE + ' COINS, TRAVELLER, AND THE MISTS WILL PART."',
      rows: [{ label: 'Hear your fortune', sub: 'the mists, parting', note: FORTUNE + ' coins', pick: function () {
        BridgeProgression.wagerCoins(FORTUNE, 'fortune').then(function (r) {
          if (!r || !r.ok) return say('ZOLTA.EXE', '"THE MISTS ARE... EXPENSIVE. RETURN WHEN YOUR POCKETS ARE HEAVIER."');
          sfx('clue');
          var f = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
          say('ZOLTA.EXE', 'THE BULBS CHASE ROUND THE CABINET. A CARD SLIDES OUT OF THE SLOT, STILL WARM:\n\n"' + f + '"');
        });
      } }],
      closeLabel: 'Walk on'
    });
  }
  var played = 0;
  function busker() {
    BridgeInteractions.choose({
      title: 'B-SIDE',
      text: 'A BUSKER ROBOT ON A CRATE, A PINK KEYTAR SLUNG ACROSS ITS CHEST, A SPEAKER HUMMING BESIDE IT. ITS VISOR FLICKERS GREEN. "REQUESTS TAKEN. TIPS APPRECIATED. EXISTENTIAL DREAD EXTRA."',
      rows: [{ label: 'Tip it', sub: 'and listen to a song', note: TIP + ' coins', pick: function () {
        BridgeProgression.wagerCoins(TIP, 'busker').then(function (r) {
          if (!r || !r.ok) return say('B-SIDE', '"NO COINS? NO WORRIES. I\'LL PLAY YOU THE QUIET ONE." IT PLAYS NOTHING, VERY BEAUTIFULLY.');
          sfx('fever');
          var lift = played !== Math.floor(Date.now() / 86400000);
          played = Math.floor(Date.now() / 86400000);
          if (lift && typeof BridgeInventory !== 'undefined') BridgeInventory.restoreEnergy(20);
          say('B-SIDE', 'B-SIDE BOWS, ALL GEARS, AND PLAYS A FAST BRIGHT THING THAT CLIMBS AND CLIMBS. COMMUTERS SLOW DOWN. SOMEBODY CLAPS.' +
              (lift ? '\n\nYOU WALK ON LIGHTER. (+20 ENERGY)' : ''));
        });
      } }],
      closeLabel: 'Walk on'
    });
  }

  function clinic() {
    var s = BridgeInventory.getStats();
    if (s.hp >= s.maxHP) return say('CHROME CLINIC', 'NAKURI SCANS YOU, TOP TO TOE, AND SHRUGS. "NOTHING TO FIX. COME BACK WHEN YOU\'VE FALLEN OFF SOMETHING."');
    BridgeInteractions.choose({
      title: 'The exam chair',
      text: 'NAKURI SNAPS ON A GLOVE. "SIT. THIS WON\'T HURT. MUCH. ' + HEAL + ' COINS AND YOU\'LL WALK OUT LIKE NEW."',
      rows: [{ label: 'Get patched up', sub: s.hp + ' / ' + s.maxHP + ' health', note: HEAL + ' coins', pick: function () {
        BridgeProgression.wagerCoins(HEAL, 'clinic').then(function (r) {
          if (!r || !r.ok) return say('CHROME CLINIC', '"' + HEAL + ' COINS. THE MACHINES DON\'T RUN ON SYMPATHY."');
          BridgeInventory.restoreHP(s.maxHP);
          sfx('success');
          say('CHROME CLINIC', 'A HUM, A WARMTH, A SMELL LIKE A THUNDERSTORM. EVERY BRUISE YOU HAD IS GONE. "NEXT!"');
        });
      } }],
      closeLabel: 'Not today'
    });
  }

  function rummage() {
    BridgeInteractions.choose({
      title: 'The junk pile',
      text: 'A HEAP OF EVERYTHING NOBODY WANTED: CABLES, CASINGS, A HEADLESS ROBOT, A SINGLE ROLLER SKATE. JORO WAVES A HAND AT IT. "' + DIG + ' COINS, YOU KEEP WHAT YOU FIND. NO REFUNDS ON BOOTS."',
      rows: [{ label: 'Rummage', sub: 'mostly junk. mostly.', note: DIG + ' coins', pick: dig }],
      closeLabel: 'Leave it'
    });
  }
  function dig() {
    BridgeProgression.wagerCoins(DIG, 'rummage').then(function (r) {
      if (!r || !r.ok) return say('JORO', '"' + DIG + ' COINS FIRST, FRIEND. THE JUNK\'S NOT FREE, IT\'S JUST JUNK."');
      var total = RUMMAGE.reduce(function (a, x) { return a + x[0]; }, 0), roll = Math.random() * total, pick = RUMMAGE[0];
      for (var i = 0; i < RUMMAGE.length; i++) { roll -= RUMMAGE[i][0]; if (roll <= 0) { pick = RUMMAGE[i]; break; } }
      var id = pick[1], line = pick[2];
      if (id === 'coins') { BridgeProgression.awardCoins(45, 'rummage'); sfx('coin'); return say('THE JUNK PILE', line + ' (+45)'); }
      if (id === 'map') {
        var maps = typeof BridgeItems !== 'undefined' ? Object.keys(BridgeItems.all()).filter(function (k) { return /^tmap_/.test(k) && BridgeInventory.getCount(k) === 0; }) : [];
        if (!maps.length) { id = 'pocket_watch'; line = RUMMAGE[6][2]; }
        else id = maps[Math.floor(Math.random() * maps.length)];
      }
      if (!BridgeInventory.addItem(id, 1)) return say('THE JUNK PILE', 'YOU FIND SOMETHING, BUT YOUR PACK IS FULL. YOU PUT IT BACK, SADLY.');
      sfx(id === 'old_boot' ? 'error' : id === 'pocket_watch' || /^tmap_/.test(id) ? 'quest' : 'pickup');
      say('THE JUNK PILE', line);
    });
  }

  return { decorate: decorate, use: use };
})();
