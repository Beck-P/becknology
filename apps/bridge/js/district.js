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
 *   BridgeDistrict.decorate(worldId, data) / .use(inter)
 */
var BridgeDistrict = (function () {
  var HEAL = 20, DIG = 20;
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
