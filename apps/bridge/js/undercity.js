/**
 * BridgeUndercity — Arcadia below the District: the Undercity and the Sump (Beck: "dangerous at the bottom… fighting",
 * "below it should still have restaurants", "bars and nightclubs at the bottom").
 *
 * Every world with an `undercity` block in its JSON (the scene scripts write it: tools/bridge-art/scenes/arcadia_undercity.py
 * and the rest) is one of ours. As it loads (`decorate`):
 *   - its counters become shops (`SHOPS`, by the interaction's label) — Mama Roo's broth, the Hawker Hall's stalls, The
 *     Drip's lager, the Foundry's tonic, the Pit's rotgut, Old Teo's laksa on his boat, the rave's glow shots;
 *   - who's out to fight is spawned (`ROSTER`): the Rust Saints on their turf in the Warrens and all over the scrapyards,
 *     scrap rats in the heaps; scavenger drones, sump eels and husks in the Sump — tougher the lower you go (their numbers
 *     are js/combat.js's CREATURES). Where they stand is worked out from the place and the day, so two pilots see the same
 *     ones (their names on the wire, js/fight.js, are kind@x,y). Once a day a boss: Saint Ruin in the scrapyard, the Dredge
 *     in the Sump (`bridge_under` keeps the day you beat each, and whether the trophy has dropped);
 *   - where you come round if you black out (`onFaint`, read by BridgeCombat.faint): Mama Roo's counter in the Undercity,
 *     the drowned shrine in the Sump.
 * The interactions of type `under` do the rest by their `act` (`use`): `scrap` (Gage buys scrap, boards, chrome, pearls),
 * `search` (a scrap pile, once a day each: scrap, a board, now and then chrome — and now and then a rat), `ring` (the Pit:
 * three rounds in the cage against the house's fighters, coins for each), `bets` (Tally's book on the house bout, the
 * same bout and the same winner for everyone in a twenty-minute slot), `shrine` (Sister Wen's shrine: a coin, a bow, health
 * and energy back once a day), `boat` (Old Teo: laksa, and he buys eel), `dance` (the Foundry and the rave: once a day,
 * energy), `lift` (the express lift's lobby, until js/transit.js handles `express_lift` itself).
 *
 * It also draws what's alive down there (the arcadia scene hooks, for worlds with an `undercity` block): rain falling in
 * streams through the grates onto the puddles (`drips`), steam off the stalls and vents (the scene's `steam`), tubes that
 * stutter (`tubes`), the dark of the underside pressing down from the top of the screen, and the fights (BridgeCombat).
 *
 *   BridgeUndercity.decorate(worldId, data) · .use(inter) · .onKill(world, h)
 *   BridgeUndercity._roster(worldId, data) (tests: who'd stand where today) · _save() · _bout(ms)
 */
var BridgeUndercity = (function () {
  var C45 = Math.cos(Math.PI / 4);
  var KEY = 'bridge_under';
  var save = { ruin: null, dredge: null, knuckles: false, heart: false, piles: {}, dance: {}, shrine: null, ring: null };
  try { save = Object.assign(save, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* fresh */ }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private */ } }
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function say(who, t) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(who, t); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }
  function toast(a, b, c) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(a, b, c); }
  function pay(n, why) {
    if (typeof BridgeProgression === 'undefined' || !BridgeProgression.wagerCoins) return Promise.resolve({ ok: false });
    return BridgeProgression.wagerCoins(n, why).then(function (r) { return r || { ok: false }; }, function () { return { ok: false }; });
  }
  function award(n, why) { if (typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins) return BridgeProgression.awardCoins(n, why); return Promise.resolve(null); }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
  function rng(seed) {
    var a = Math.floor(hash(seed) * 4294967296) >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // ---- what each counter sells (by label) --------------------------------------------------------------------------
  var SHOPS = {
    'NOODLE COUNTER': [{ id: 'roo_broth', price: 12 }, { id: 'kopi', price: 4 }],
    'NOODLE STALL':   [{ id: 'roo_broth', price: 12 }, { id: 'steam_dumplings', price: 9 }],
    'SKEWER STALL':   [{ id: 'char_skewers', price: 9 }, { id: 'kopi', price: 4 }],
    'DUMPLING STALL': [{ id: 'steam_dumplings', price: 9 }, { id: 'kopi', price: 4 }],
    'TEA STALL':      [{ id: 'kopi', price: 4 }, { id: 'steam_dumplings', price: 9 }],
    'DRINKS STALL':   [{ id: 'drip_lager', price: 6 }, { id: 'foundry_tonic', price: 10 }],
    'HAWKER STALL':   [{ id: 'roo_broth', price: 12 }, { id: 'char_skewers', price: 9 }, { id: 'steam_dumplings', price: 9 }],
    'CURRY STALL':    [{ id: 'sump_laksa', price: 18 }, { id: 'kopi', price: 4 }],
    'GRILL STALL':    [{ id: 'char_skewers', price: 9 }, { id: 'drip_lager', price: 6 }],
    'DRIP BAR':       [{ id: 'drip_lager', price: 6 }, { id: 'pit_rotgut', price: 9 }],
    'FOUNDRY BAR':    [{ id: 'foundry_tonic', price: 10 }, { id: 'drip_lager', price: 6 }],
    'PIT BAR':        [{ id: 'pit_rotgut', price: 9 }, { id: 'drip_lager', price: 6 }, { id: 'medkit', price: 34 }],
    'RAVE BAR':       [{ id: 'glow_shot', price: 12 }, { id: 'foundry_tonic', price: 10 }],
    'PARTS BIN':      [{ id: 'medkit', price: 30 }, { id: 'stim_pack', price: 25 }],
    'MEDS COUNTER':   [{ id: 'medkit', price: 32 }, { id: 'stim_pack', price: 26 }]
  };

  // ---- who's out to fight -------------------------------------------------------------------------------------------
  // per place: [kind, how many] over the block's `turf` rect (or the whole floor), and a daily boss at a spot
  var ROSTER = {
    'arcadia-undercity': { gang: [['saint', 3], ['shiv', 2]] },
    'arcadia-scrapyard': { gang: [['saint', 4], ['shiv', 3], ['scraprat', 5]], boss: 'ruin' },
    'arcadia-sump':      { gang: [['drone', 4], ['eel', 4], ['husk', 3]], boss: 'dredge' }
  };
  var FAINT = {
    undercity: { world: 'arcadia-undercity', spawn: [10, 11], who: 'MAMA ROO',
                 line: 'YOU COME ROUND ON A PLASTIC STOOL AT MAMA ROO\'S COUNTER, A BOWL OF BROTH STEAMING IN FRONT OF YOU.\n\n"EAT," SAYS MAMA ROO. "THE SAINTS DON\'T FIGHT FAIR AND NEITHER SHOULD YOU. NEXT TIME, ROLL."' },
    sump: { world: 'arcadia-sump', spawn: null, who: 'SISTER WEN',
            line: 'YOU COME ROUND ON THE SHRINE\'S STEPS, INCENSE IN THE AIR, A HAND ON YOUR FOREHEAD.\n\n"THE WATER GIVES BACK WHAT IT DOESN\'T WANT," SAYS SISTER WEN. "IT DIDN\'T WANT YOU. NOT TODAY."' }
  };

  function walkable(data, x, y) { return data.collisions[y] && data.collisions[y][x] === 0; }
  function occupied(data, x, y) { return (data.interactions || []).some(function (i) { return i.x === x && i.y === y; }); }
  // where today's fighters stand: free cells in the rect, from a hash of the place and the day — the same on every page
  function roster(worldId, data) {
    var R = ROSTER[worldId], U = data.undercity || {};
    if (!R) return [];
    var rect = (U.turf && U.turf.rect) || [1, 1, data.width - 2, data.height - 2], out = [], taken = {};
    var r = rng(worldId + ':' + today());
    var spawnAt = data.spawns && data.spawns.player;
    R.gang.forEach(function (g) {
      for (var n = 0; n < g[1]; n++) {
        for (var tries = 0; tries < 60; tries++) {
          var x = rect[0] + Math.floor(r() * (rect[2] - rect[0] + 1)), y = rect[1] + Math.floor(r() * (rect[3] - rect[1] + 1));
          if (!walkable(data, x, y) || taken[x + ',' + y] || occupied(data, x, y)) continue;
          if (spawnAt && Math.abs(spawnAt[0] - x) + Math.abs(spawnAt[1] - y) < 6) continue;           // never on top of the way in
          if ((U.safe || []).some(function (s) { return x >= s[0] && x <= s[2] && y >= s[1] && y <= s[3]; })) continue;
          taken[x + ',' + y] = 1; out.push([g[0], x, y]); break;
        }
      }
    });
    return out;
  }

  function decorate(worldId, data) {
    if (worldId === 'arcadia-alley') return backs(data);
    if (!data.undercity) return;
    var U = data.undercity;
    bout = null;                                             // a place loading (blacked out, walked off): any bout in the cage is over
    (data.interactions || []).forEach(function (it) {
      if (SHOPS[it.label] && (it.type === 'dialog' || it.type === 'vendor')) { it.type = 'vendor'; it.prompt = 'PRESS E TO ORDER'; it.items = SHOPS[it.label]; }
      if (it.type === 'express_lift' && typeof BridgeTransit === 'undefined') { it.type = 'under'; it.act = 'lift'; }   // until js/transit.js lands
    });
    var f = FAINT[U.level];
    if (f) data.onFaint = { world: f.world, spawn: f.spawn || U.comeRound || null, who: f.who, line: f.line };
    if (typeof BridgeCombat === 'undefined') return;
    data.interactions = data.interactions.filter(function (i) { return i.type !== 'hostile'; });
    roster(worldId, data).forEach(function (g) { BridgeCombat.spawn(data, g[0], g[1], g[2]); });
    var R = ROSTER[worldId];
    if (R && R.boss && U.boss && save[R.boss] !== today() && walkable(data, U.boss[0], U.boss[1])) BridgeCombat.spawn(data, R.boss, U.boss[0], U.boss[1]);
  }

  // the Backs: until the Backs' rebuild lands (tools/bridge-art/scenes/arcadia_alley.py is the rebuild session's), the
  // way down is the manhole in the lane, its cover off and a ladder going down
  function backs(data) {
    if ((data.interactions || []).some(function (i) { return i.target === 'arcadia-undercity'; })) return;
    data.interactions.push({ x: 12, y: 10, type: 'enter_world', target: 'arcadia-undercity', spawn: [3, 10], label: 'MANHOLE',
                             prompt: 'DOWN TO THE UNDERCITY' });
  }

  // ---- the counters and the rest -------------------------------------------------------------------------------------
  function use(inter) {
    var a = inter.act;
    if (a === 'scrap') return scrap();
    if (a === 'search') return search(inter);
    if (a === 'ring') return ring(inter);
    if (a === 'bets') return bets();
    if (a === 'shrine') return shrine();
    if (a === 'boat') return boat();
    if (a === 'dance') return dance(inter);
    if (a === 'lift') return lift(inter);
  }

  var BUYS = [['scrap_metal', 3], ['circuit', 12], ['chrome_part', 25], ['sump_pearl', 90], ['eel_fillet', 6]];
  function scrap() {
    var inv = BridgeInventory, rows = [], total = 0;
    BUYS.forEach(function (b) {
      var n = inv.getCount(b[0]);
      if (!n) return;
      total += n * b[1];
      rows.push({ label: BridgeItems.get(b[0]).name, sub: 'you have ' + n, note: b[1] + ' each', icon: b[0], pick: function () { sell([b]); } });
    });
    if (rows.length > 1) rows.push({ label: 'Sell it all', sub: 'everything above', note: total + ' coins', pick: function () { sell(BUYS); } });
    BridgeInteractions.choose({
      title: 'GAGE — SCRAP',
      text: rows.length ? 'GAGE WIPES HIS HANDS ON A RAG THAT MAKES THEM DIRTIER. "SCRAP BY THE PIECE, BOARDS BY THE BOARD, CHROME BY THE POUND. PEARLS, IF YOU\'VE BEEN DOWN THAT FAR. I DON\'T ASK WHERE."'
        : 'GAGE LOOKS AT YOUR EMPTY HANDS. "THE SAINTS DROP SCRAP WHEN YOU DROP THEM. THE HEAPS IN THE YARD HAVE MORE. BRING ME SOMETHING."',
      rows: rows, closeLabel: 'Leave'
    });
  }
  function sell(list) {
    var inv = BridgeInventory, coins = 0;
    list.forEach(function (b) { var n = inv.getCount(b[0]); if (n) { inv.removeItem(b[0], n); coins += n * b[1]; } });
    if (!coins) return;
    award(coins, 'scrap');
    sfx('coin');
    say('GAGE', 'HE WEIGHS IT, BITES A BOARD, COUNTS OUT ' + coins + ' COINS. "PLEASURE. MOSTLY YOURS."');
  }

  // a scrap pile: once a day each, a rummage — and now and then a rat comes out of it
  function search(inter) {
    var k = inter.pile || (inter.x + ',' + inter.y), w = BridgeWorld.getWorldId(), id = w + ':' + k;
    if (save.piles[id] === today()) return say('SCRAP PILE', 'YOU\'VE BEEN THROUGH THIS ONE TODAY. NOTHING BUT RUST AND A SMELL.');
    save.piles[id] = today(); store();
    var r = Math.random(), got, line;
    if (r < 0.5) { got = ['scrap_metal', 1 + Math.floor(Math.random() * 3)]; line = 'BENT PLATE, BOLTS, A BRACKET. SCRAP, ANYWAY.'; }
    else if (r < 0.75) { got = ['circuit', 1]; line = 'A CIRCUIT BOARD, MOSTLY WHOLE, UNDER A DEAD SCREEN.'; }
    else if (r < 0.88) { got = ['chrome_part', 1]; line = 'A CHROME KNEE JOINT, STILL OILED. SOMEBODY WILL WANT THAT.'; }
    else { got = null; line = 'SOMETHING IN THE HEAP MOVES. A SCRAP RAT, ALL TEETH AND CABLE, COMES OUT AT YOU.'; }
    if (got && !BridgeInventory.addItem(got[0], got[1])) return say('SCRAP PILE', 'YOU FIND SOMETHING, BUT YOUR PACK IS FULL.');
    if (!got && typeof BridgeCombat !== 'undefined') {
      var world = BridgeWorld.getWorld(), px = BridgeCharacter.getX(), py = BridgeCharacter.getY();
      [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (o) {
        if (walkable(world, px + o[0], py + o[1])) { BridgeCombat.spawn(world, 'scraprat', px + o[0], py + o[1]); return true; }
      });
      sfx('hurt');
    } else sfx('pickup');
    say('SCRAP PILE', line + (got ? ' (+' + got[1] + ' ' + BridgeItems.get(got[0]).name.toUpperCase() + ')' : ''));
  }

  // ---- the Pit: three rounds in the cage ------------------------------------------------------------------------------
  var ROUNDS = [
    { name: 'ROUND ONE: TWO SAINTS FROM THE YARD', who: [['saint', 0], ['shiv', 1]], pay: 30 },
    { name: 'ROUND TWO: THE KNIFE SISTERS', who: [['shiv', 0], ['shiv', 1], ['saint', 2]], pay: 60 },
    { name: 'ROUND THREE: THE HUSK FROM THE SUMP', who: [['husk', 0], ['shiv', 1]], pay: 120 }
  ];
  var ENTRY = 20, bout = null;
  function ring(inter) {
    var world = BridgeWorld.getWorld(), U = world.undercity || {};
    if (bout) return say('THE PIT', 'THE CAGE IS SHUT. THE CROWD IS ON ITS FEET. FIGHT.');
    BridgeInteractions.choose({
      title: 'THE PIT — THE CAGE',
      text: 'A PIT IN THE FLOOR WITH A CAGE ROUND IT, THE SAND IN IT DARK WHERE IT\'S BEEN WET. THE CROWD LEANS ON THE RAIL.\n\n"' + ENTRY +
        ' TO GET IN," SAYS THE MAN AT THE GATE. "THREE ROUNDS. EACH ONE PAYS. YOU GO DOWN, YOU GO DOWN, AND WE PICK YOU UP AFTER."',
      rows: [{ label: 'Climb in', sub: 'three rounds against the house: 30, 60 and 120 coins', note: ENTRY + ' coins', pick: function () {
        pay(ENTRY, 'pit').then(function (r) {
          if (!r.ok) return say('THE PIT', '"' + ENTRY + ' COINS. THE CROWD DOESN\'T COME TO WATCH YOU BEG."');
          startBout(world, U);
        });
      } }],
      closeLabel: 'Watch from the rail'
    });
  }
  function startBout(world, U) {
    var R = U.ring;
    if (!R) return;
    bout = { round: 0, world: BridgeWorld.getWorldId(), paid: 0 };
    say('THE PIT', 'THE GATE CLANGS OPEN. YOU DROP DOWN INTO THE SAND AND THE CROWD ROARS. ACROSS THE PIT, THE HOUSE\'S FIRST TWO ARE ALREADY COMING.');
    setTimeout(function () { nextRound(); }, 1200);
  }
  function nextRound() {
    if (!bout) return;
    var world = BridgeWorld.getWorld(), R = world.undercity && world.undercity.ring, rd = ROUNDS[bout.round];
    if (!R || !rd || BridgeWorld.getWorldId() !== bout.world) { bout = null; return; }
    bout.waiting = false;
    sfx('bell');
    toast('The Pit', rd.name, 'Round ' + (bout.round + 1) + ' of 3 — ' + rd.pay + ' coins');
    rd.who.forEach(function (w, i) {
      var at = R.foes[i % R.foes.length];
      if (walkable(world, at[0], at[1])) { var h = BridgeCombat.spawn(world, w[0], at[0], at[1]); h.reward = 0; h.drops = []; h.pit = true; h._engaged = true; }
    });
    if (typeof BridgeCrowd !== 'undefined' && BridgeCrowd.react) BridgeCrowd.react(bout.world, { x: R.spawn[0], y: R.spawn[1], r: 12, kind: 'cheer' });
  }
  function onKill(world, h) {
    if (h.pit && bout) {
      if (bout.waiting) return;                              // this round's already won (a kill can be reported twice)
      var left = (world.interactions || []).filter(function (o) { return o !== h && o.type === 'hostile' && o.pit && o._hp > 0; });
      if (left.length) return;
      var rd = ROUNDS[bout.round];
      bout.paid += rd.pay;
      bout.waiting = true;
      award(rd.pay, 'pit:round' + (bout.round + 1));
      sfx('coin');
      bout.round++;
      if (bout.round >= ROUNDS.length) {
        var first = save.ring !== today();
        save.ring = today(); store();
        if (first) award(50, 'pit:champion');
        toast('The Pit', 'The cage is yours', bout.paid + ' coins' + (first ? ' and 50 for the night\'s first champion' : ''));
        if (typeof BridgeQuests !== 'undefined' && BridgeQuests.note) BridgeQuests.note('The Pit', 'Three rounds in the cage', 'Won');
        bout = null;
        return;
      }
      setTimeout(nextRound, 2200);
      return;
    }
    if (h.creature === 'ruin' || h.creature === 'dredge') {
      save[h.creature] = today();
      var trophy = h.creature === 'ruin' ? ['knuckles', 'ruin_knuckles'] : ['heart', 'dredge_heart'];
      if (!save[trophy[0]] && typeof BridgeLoot !== 'undefined') { BridgeLoot.spawn(h.x, h.y, trophy[1], 1); save[trophy[0]] = true; }
      store();
      (world.interactions || []).filter(function (o) { return o.type === 'hostile' && o._blinkAt && o !== h; }).forEach(function (o) {
        o.reward = 0; o.drops = []; if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.killHostile(world, o);
      });
      toast(h.creature === 'ruin' ? 'Saint Ruin falls' : 'The Dredge goes down',
        h.creature === 'ruin' ? 'The Saints scatter into the heaps' : 'It sinks back into the black water, its lights going out one by one',
        save[trophy[0]] && !h._trophyMsg ? 'Doc Sallow can fit what it left' : 'Back tomorrow');
    }
  }

  // Tally's book: the house bout this slot, the same for everyone
  var FIGHTERS = ['IRON MAE', 'THE DEACON', 'LITTLE KOJI', 'RUST-EYE', 'BIG SUNNY', 'NINE-VOLT', 'THE WIDOW', 'GRAVEL'];
  function boutAt(ms) {
    var slot = Math.floor(ms / 1200000), r = rng('bout:' + slot);
    var a = FIGHTERS[Math.floor(r() * FIGHTERS.length)], b = a;
    while (b === a) b = FIGHTERS[Math.floor(r() * FIGHTERS.length)];
    var pa = 0.3 + r() * 0.4;
    return { slot: slot, a: a, b: b, pa: pa, win: r() < pa ? a : b };
  }
  function bets() {
    var B = boutAt(Date.now()), odds = function (p) { return Math.max(1.2, Math.round((0.92 / p) * 10) / 10); };
    var key = 'bet:' + B.slot;
    if (save[key]) return say('TALLY', '"YOU\'RE IN ON THIS ONE ALREADY. ' + save[key] + '. WE\'LL SEE." HE TAPS THE BOARD. "NEXT BOUT IN A FEW MINUTES."');
    var row = function (who, p, stake) {
      return { label: who + ' for ' + stake, sub: 'pays ' + odds(p) + ' to 1', note: stake + ' coins', pick: function () {
        pay(stake, 'pit:bet').then(function (r) {
          if (!r.ok) return say('TALLY', '"NO COINS, NO BOOK."');
          save[key] = who; store();
          var won = B.win === who, back = Math.round(stake * odds(p));
          if (won) award(back, 'pit:bet-won');
          sfx(won ? 'coin' : 'error');
          say('THE PIT', 'THE BELL. ' + B.a + ' AND ' + B.b + ' COME OFF THEIR STOOLS AND THE CROWD GOES UP WITH THEM. IT DOESN\'T LAST LONG.\n\n' +
            B.win + ' IS LEFT STANDING.' + (won ? ' TALLY COUNTS OUT ' + back + ' COINS WITHOUT LOOKING AT YOU.' : ' TALLY SHRUGS. "NEXT TIME."'));
        });
      } };
    };
    BridgeInteractions.choose({
      title: 'TALLY — THE BOOK',
      text: 'A MAN IN A GREEN VISOR BEHIND BARS, A CHALKBOARD OVER HIS HEAD. "HOUSE BOUT: ' + B.a + ' AGAINST ' + B.b + '. TAKE YOUR PICK."',
      rows: [row(B.a, B.pa, 10), row(B.b, 1 - B.pa, 10), row(B.a, B.pa, 50), row(B.b, 1 - B.pa, 50)], closeLabel: 'Not tonight'
    });
  }

  // ---- the Sump: the shrine, the boat --------------------------------------------------------------------------------
  function shrine() {
    var fresh = save.shrine !== today();
    BridgeInteractions.choose({
      title: 'THE DROWNED SHRINE',
      text: 'A SHRINE HALF UNDER THE BLACK WATER, ITS GATE STANDING IN THE CANAL, CANDLES ON EVERY STEP THAT\'S STILL DRY. SISTER WEN SWEEPS THE STEPS.' +
        '\n\n"A COIN FOR THE WATER," SHE SAYS, "AND IT LETS YOU GO ON."',
      rows: [{ label: 'Leave a coin and bow', sub: fresh ? 'health and energy, once a day' : 'you\'ve been blessed today', note: '5 coins', pick: function () {
        pay(5, 'shrine').then(function (r) {
          if (!r.ok) return say('SISTER WEN', '"THEN BOW ANYWAY. THE WATER ISN\'T PROUD."');
          if (fresh) { save.shrine = today(); store(); BridgeInventory.restoreAll(); }
          sfx('chime');
          say('THE DROWNED SHRINE', 'THE COIN GOES INTO THE WATER WITHOUT A SOUND. THE CANDLES LEAN, ALL AT ONCE, THE SAME WAY.' +
            (fresh ? '\n\nYOU FEEL WHOLE. (HEALTH AND ENERGY FULL)' : '\n\nSISTER WEN NODS. "TOMORROW IT WILL HAVE MORE TO GIVE."'));
        });
      } }],
      closeLabel: 'Leave'
    });
  }
  function boat() {
    var eels = BridgeInventory.getCount('eel_fillet');
    var rows = [{ label: "Teo's Laksa", sub: 'curry noodles off the boat: energy and health', note: '18 coins', icon: 'sump_laksa', pick: function () {
      pay(18, 'boat').then(function (r) {
        if (!r.ok) return say('OLD TEO', '"EIGHTEEN. THE CURRY ISN\'T FREE AND NEITHER AM I."');
        if (!BridgeInventory.addItem('sump_laksa', 1)) return say('OLD TEO', '"NO ROOM IN YOUR PACK? EAT IT HERE THEN." YOU DO. (+45 ENERGY)');
        sfx('pickup'); say('OLD TEO', 'HE LADLES IT FROM THE POT ON THE STERN, THE BOAT ROCKING UNDER HIM. "MIND, IT\'S HOT. EVERYTHING DOWN HERE IS HOT OR COLD. NOTHING IN BETWEEN."');
      });
    } }];
    if (eels) rows.push({ label: 'Sell him your eel', sub: 'you have ' + eels, note: '8 each', icon: 'eel_fillet', pick: function () {
      BridgeInventory.removeItem('eel_fillet', eels); award(eels * 8, 'boat:eel'); sfx('coin');
      say('OLD TEO', '"SUMP EEL! GOOD." HE PAYS ' + (eels * 8) + ' COINS AND DROPS THEM IN A BUCKET, WHERE THEY GLOW. "THE BROTH LIKES THEM."');
    } });
    BridgeInteractions.choose({
      title: 'THE NOODLE BOAT',
      text: 'A SAMPAN TIED UP AT THE QUAY, A CANVAS ROOF, A POT ON A BURNER AT THE STERN. OLD TEO SITS IN THE BOW WITH HIS LEGS CROSSED. "LAKSA. AND IF YOU\'VE TAKEN AN EEL, I\'LL TAKE IT OFF YOU."',
      rows: rows, closeLabel: 'Walk on'
    });
  }
  function dance(inter) {
    var k = BridgeWorld.getWorldId(), fresh = save.dance[k] !== today();
    if (fresh) { save.dance[k] = today(); store(); BridgeInventory.restoreEnergy(40); }
    sfx('fever');
    if (typeof BridgeCrowd !== 'undefined' && BridgeCrowd.react) BridgeCrowd.react(k, { x: inter.x, y: inter.y, r: 6, kind: 'cheer' });
    say(inter.label, (inter.dance || 'THE BASS COMES UP THROUGH THE FLOOR AND INTO YOUR CHEST, AND FOR A WHILE THERE\'S NOTHING ELSE.') +
      (fresh ? '\n\nYOU COME OFF THE FLOOR SOAKED AND LIGHTER. (+40 ENERGY)' : ''));
  }

  // the express lift's lobby (until js/transit.js handles `express_lift`): its shaft's stops from assets/arcadia-lifts.json
  var LIFTS = null;
  function lift(inter) {
    var go = function () {
      var sh = LIFTS && LIFTS.shafts && LIFTS.shafts[inter.shaft || 'core'], here = BridgeWorld.getWorldId();
      var stops = sh ? sh.lobbies.filter(function (l) { return l.world !== here; }) : [];
      BridgeInteractions.choose({
        title: (sh && sh.name || 'THE LIFT').toUpperCase(),
        text: 'A FREIGHT LIFT, STEEL DOORS SCARRED BY A HUNDRED YEARS OF CARGO. THE COUNTER OVER THEM READS ' + floorTag(inter.lobby) + '.',
        rows: stops.map(function (l) {
          return { label: l.name || l.world, sub: floorTag(l.id, l.floor), note: 'Go', pick: function () { sfx('door'); BridgeWorld.enterWorld(l.world, l.spawn); } };
        }),
        closeLabel: 'Stay'
      });
    };
    if (LIFTS) return go();
    fetch('/bridge/assets/arcadia-lifts.json?v=' + Date.now()).then(function (r) { return r.json(); }).then(function (d) { LIFTS = d; go(); })
      .catch(function () { say('LIFT', 'THE BUTTON LIGHTS, AND NOTHING COMES.'); });
  }
  function floorTag(id, floor) {
    if (typeof floor !== 'number' && LIFTS) {
      Object.keys(LIFTS.shafts || {}).forEach(function (s) { LIFTS.shafts[s].lobbies.forEach(function (l) { if (l.id === id) floor = l.floor; }); });
    }
    return typeof floor === 'number' ? (floor < 0 ? 'B' + (-floor) : 'FLOOR ' + floor) : '';
  }

  // ---- what's alive down there: drips, steam, failing tubes, the dark overhead, the fights ----------------------------
  function isOurs(world) { return world && world.undercity; }
  function ground(ctx, world, offX, offY, ts, now) {
    if (!isOurs(world) || typeof BridgeCombat === 'undefined' || !BridgeCombat.ground) return;
    BridgeCombat.ground(ctx, world, offX, offY, ts);
  }
  function items(world, offX, offY, ts, now, sc) {
    if (!isOurs(world) || typeof BridgeCombat === 'undefined') return [];
    return BridgeCombat.sceneItems(world, offX, offY, ts, now, sc);
  }
  function over(ctx, world, offX, offY, ts, now) {
    if (!isOurs(world)) return;
    var U = world.undercity, W = ctx.canvas.width, H = ctx.canvas.height;
    if (world.scene && typeof BridgeSkyline !== 'undefined' && BridgeSkyline.steam) BridgeSkyline.steam(ctx, world.scene, offX, offY, ts, now);
    ctx.save();
    // tubes that stutter: each its own rhythm from its place; a dead one now and then goes dark for a beat
    (U.tubes || []).forEach(function (t, i) {
      var h = hash('tube' + i + ':' + t[0]);
      if (h > 0.4) return;
      var cyc = 3000 + h * 9000, ph = (now % cyc) / cyc;
      if (ph > 0.06 && !(h < 0.12 && ph > 0.5 && ph < 0.53)) return;
      var cx = offX + (t[0] + t[2]) / 2 * ts, cy = offY + t[1] * ts + ts * 1.2;
      if (cx < -ts * 4 || cx > W + ts * 4 || cy < -ts * 4 || cy > H + ts * 6) return;
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, ts * 3.2);
      g.addColorStop(0, 'rgba(6,6,14,0.55)'); g.addColorStop(1, 'rgba(6,6,14,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - ts * 3.2, cy - ts * 3.2, ts * 6.4, ts * 6.4);
    });
    // rain coming through the grates: a stream of drops down from the dark, a splash where it lands
    (U.drips || []).forEach(function (d, i) {
      var x = Math.round(offX + d[0] * ts), yb = offY + (d[1] + 0.05) * ts, yt = offY + (d[1] - Math.min(d[2], 4.5) * C45) * ts;
      if (x < -10 || x > W + 10 || yb < -10 || yt > H + 10) return;
      yt = Math.max(yt, -10);
      for (var sg = 0; sg < 5; sg++) {                                              // the stream, broken into falling runs
        var ph = ((now / 520) + sg / 5 + hash('r' + i) * 0.3) % 1, sy = yt + (yb - yt) * ph;
        ctx.fillStyle = 'rgba(170,200,230,' + (0.1 + 0.18 * ph).toFixed(2) + ')';
        ctx.fillRect(x, Math.round(sy), 1, Math.round((yb - yt) * 0.12));
      }
      for (var p = 0; p < 9; p++) {
        var life = ((now / 700) + p / 9 + hash('d' + i + ':' + p) * 0.2) % 1, y = yt + (yb - yt) * life * life;
        ctx.fillStyle = 'rgba(200,225,255,' + (0.35 + 0.4 * life).toFixed(2) + ')';
        ctx.fillRect(x + (p % 2 ? 1 : -1) * (p % 3 === 0 ? 1 : 0), Math.round(y), 1, Math.max(2, Math.round(ts * 0.12)));
      }
      var sp = (now / 330 + hash('s' + i)) % 1;                                         // the splash ring
      ctx.strokeStyle = 'rgba(200,225,255,' + (0.45 * (1 - sp)).toFixed(2) + ')'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(x + 0.5, Math.round(yb), 2 + sp * ts * 0.35, 1 + sp * ts * 0.12, 0, 0, Math.PI * 2); ctx.stroke();
    });
    ctx.restore();
    // the underside pressing down from overhead
    if (U.level === 'undercity' || U.level === 'sump') {
      var g2 = ctx.createLinearGradient(0, 0, 0, H * 0.3);
      g2.addColorStop(0, 'rgba(4,4,10,' + (U.level === 'sump' ? 0.55 : 0.4) + ')'); g2.addColorStop(1, 'rgba(4,4,10,0)');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H * 0.3);
    }
    if (typeof BridgeCombat !== 'undefined' && BridgeCombat.over) BridgeCombat.over(ctx, world, offX, offY, ts, now);
  }
  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('arcadia', { ground: ground, items: items, over: over });

  return { decorate: decorate, use: use, onKill: onKill, SHOPS: SHOPS, ROSTER: ROSTER,
           _roster: roster, _save: function () { return save; }, _bout: boutAt, _ring: function () { return bout; } };
})();
