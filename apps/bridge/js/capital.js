/**
 * BridgeCapital — Crownhaven grown into a capital of districts (Denser Worlds, Workstream A).
 *
 * Beck: "making the capital city a lot bigger and cooler… each one should feel large but connected and unique".
 * Crownhaven's island (`lumar-crown`: the quay, the grand square, the Exchange, St Brendan's, the palace gate, the Royal
 * Yard) is the middle of the city; its districts are worlds of their own, joined by streets you walk:
 *   the Old Town (`lumar-crown-oldtown`) — the walled town on the point west of the harbour: lanes of tall jettied
 *     houses, the Old Keep, Well Square, the Lantern Theatre, the sea wall and the Sea Steps;
 *   and, as they're built, the canal quarter and Guild Row, the hill (the academy, the observatory, the funicular up to
 *   the palace), the Arsenal, the bridge of shops over the harbour mouth, the stilt slums under the quays.
 *
 * The doors between them are added here as the worlds load, never in another scene's script or world JSON (the
 * island's own scene is rebuilt by another session): a way in is only made once its district is on main (`BUILT`),
 * and Crownhaven's side finds its own walkable edge (`edge`), so a re-render of the island moves the door with it.
 *
 * The Lantern Theatre plays a different piece every Lumar evening (`PLAYS`, by the day): a ticket, a seat, the play in
 * a few cards; the first of the day lifts your spirits (energy) and goes in the journal.
 *
 *   BridgeCapital.decorate(worldId, data)   (js/world.js, as every world loads)
 *   BridgeCapital.BUILT, BridgeCapital.play(ms)
 */
var BridgeCapital = (function () {
  var BUILT = { 'lumar-crown-oldtown': true, 'lumar-crown-canals': true, 'lumar-crown-bridge': true, 'lumar-crown-arsenal': true, 'lumar-crown-hill': true };
  // the ways between the districts: on the district's side a label of its own (a 'dialog' in its world JSON until the
  // far side exists) and where it lands you
  var GATES = {
    'lumar-crown-oldtown': {
      'NORTH GATE': { to: 'lumar-crown-canals', spawn: [28, 34] },
      'BRIDGE GATE': { to: 'lumar-crown-bridge', spawn: [4, 11] }
    },
    'lumar-crown-canals': { 'FUNICULAR': { to: 'lumar-crown-hill', spawn: [31, 25] } },
    'lumar-crown-bridge': { 'EAST GATE': { to: 'lumar-crown-arsenal', spawn: [2, 30] } }
  };
  // Crownhaven's own ways into its districts: where on the island each goes (`find`: the walkable tile that scores
  // lowest — the island's render decides where the edges and the quay are) and where it lands you
  var CROWN = [
    { label: 'THE OLD TOWN', to: 'lumar-crown-oldtown', spawn: [53, 19], prompt: 'PRESS E TO GO THROUGH',
      find: function (c, r) { return r >= 17 && r <= 27 ? c * 4 + Math.abs(r - 21) : null; } },
    { label: 'THE ARSENAL', to: 'lumar-crown-arsenal', spawn: [2, 16], prompt: 'PRESS E TO GO THROUGH',
      find: function (c, r) { return r >= 20 && r <= 32 ? (63 - c) * 4 + Math.abs(r - 25) : null; } },
    { label: 'QUAY STAIRS', to: 'lumar-crown-stilts', spawn: [19, 6], prompt: 'PRESS E TO GO DOWN',
      find: function (c, r) { return c >= 42 && c <= 50 && r >= 30 && r <= 34 ? Math.abs(c - 46) * 2 - r * 3 : null; } }
  ];
  // the far side of each of those: the district's label that leads back, and which of Crownhaven's doors it returns by
  var BACK = { 'lumar-crown-oldtown': ['LAND GATE', 'THE OLD TOWN', 1], 'lumar-crown-arsenal': ['YARD GATE', 'THE ARSENAL', -1],
               'lumar-crown-stilts': ['QUAY STAIRS', 'QUAY STAIRS', 0] };
  var TICKET = 15;
  var KEY = 'bridge_capital';
  var st = load();
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode */ } }
  function say(t, x) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(t, x); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }
  function note(a, b, c) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.note) BridgeQuests.note(a, b, c); }

  // ---- doors ---------------------------------------------------------------------------------------------------------
  function spot(data, find) {
    var C = data.collisions || [], best = null;
    for (var r = 0; r < C.length; r++) {
      for (var c = 0; c < C[r].length; c++) {
        if (C[r][c] !== 0) continue;
        var s = find(c, r);
        if (s != null && (!best || s < best.s)) best = { x: c, y: r, s: s };
      }
    }
    return best;
  }
  var crownSpots = null;
  function spots(data) {
    var out = {};
    CROWN.forEach(function (d) { out[d.label] = spot(data, d.find); });
    return out;
  }
  function fetchSpots(cb) {
    if (crownSpots) return cb(crownSpots);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/bridge/assets/worlds/lumar-crown.json?v=' + Date.now());
    xhr.onload = function () { try { crownSpots = spots(JSON.parse(xhr.responseText)); } catch (e) { /* keep the JSON's own */ } cb(crownSpots); };
    xhr.onerror = function () { cb(null); };
    xhr.send();
  }

  function decorate(worldId, data) {
    var list = data.interactions || (data.interactions = []);
    if (worldId === 'lumar-crown') {
      crownSpots = spots(data);
      CROWN.forEach(function (d) {
        var p = crownSpots[d.label];
        if (!BUILT[d.to] || !p || list.some(function (it) { return it.label === d.label; })) return;
        list.push({ x: p.x, y: p.y, type: 'enter_world', target: d.to, spawn: d.spawn.slice(), label: d.label, prompt: d.prompt });
      });
    }
    var gates = GATES[worldId];
    if (gates) {
      list.forEach(function (it) {
        var g = gates[it.label];
        if (g && BUILT[g.to]) { it.type = 'enter_world'; it.target = g.to; it.spawn = g.spawn.slice(); delete it.dialog; }
      });
    }
    var back = BACK[worldId];
    if (back) {
      list.forEach(function (it) {
        if (it.label !== back[0]) return;
        fetchSpots(function (sp) { var p = sp && sp[back[1]]; if (p) it.spawn = [p.x + back[2], p.y + (back[2] ? 0 : -1)]; });
      });
    }
    if (worldId === 'lumar-crown-oldtown') {
      list.forEach(function (it) {
        if (it.label === 'THE LANTERN THEATRE') { it.type = 'capital'; it.what = 'theatre'; it.prompt = 'PRESS E FOR THE BOX OFFICE'; }
        if (it.label === 'PLAYBILL') it.dialog = playbill();
      });
    }
  }

  // ---- the Lantern Theatre -----------------------------------------------------------------------------------------------
  var PLAYS = [
    { name: 'THE LADY OF THE EMERALD SEA', cards: [
      'THE LAMPS GO DOWN. A PAINTED SEA ROLLS ACROSS THE STAGE ON A CRANK, AND A YOUNG CAPTAIN STANDS AT A CARDBOARD WHEEL.',
      'SHE SAILS PAST THE LAST CHARTED ROCK. THE STAGEHANDS SHAKE A SHEET OF TIN FOR THUNDER. A CHILD IN THE FRONT ROW GASPS.',
      'IN THE FINAL SCENE SHE FINDS ALL FIVE SEAS AND, INSTEAD OF COMING HOME, ASKS FOR A BIGGER MAP. THE HOUSE GOES WILD.'] },
    { name: 'THE QUEEN-REGENT\'S HAT', cards: [
      'A FARCE. THE QUEEN-REGENT\'S CROWN IS LOST ON THE MORNING OF THE REGATTA, AND A FISHWIFE\'S BONNET IS PRESSED INTO SERVICE.',
      'THE BONNET STILL SMELLS OF HERRING. THE ADMIRALTY SALUTES IT ANYWAY. A GULL FOLLOWS IT ACROSS THE STAGE ON A WIRE.',
      'THE REAL CROWN TURNS UP IN THE FOUNTAIN. NOBODY CAN SAY HOW. THE BONNET IS MADE A PEER OF THE REALM.'] },
    { name: 'SALT AND LANTERNS', cards: [
      'A SAD ONE. TWO SISTERS ON TERN HOLM, ONE WHO GOES TO SEA AND ONE WHO KEEPS THE CHAPEL LANTERN LIT FOR HER.',
      'YEARS PASS IN A SINGLE SONG. THE LANTERN NEVER GOES OUT. THE WOMAN BESIDE YOU PASSES YOU A HANDKERCHIEF WITHOUT LOOKING.',
      'A SAIL ON THE HORIZON IN THE LAST MOMENT - PAINTED, BUT SOMEHOW YOU BELIEVE IT. NOBODY CLAPS UNTIL THE CURTAIN\'S DOWN.'] },
    { name: 'THE GHOST OF THE OLD KEEP', cards: [
      'A COMEDY OF FRIGHTS. A GHOST IN A SHEET WAILS ABOUT THE KEEP, AND NOBODY IN THE PLAY IS IN THE LEAST BIT SCARED.',
      'THE GHOST TRIES HARDER. CHAINS. A HOWL. A COLD WIND FROM A BELLOWS IN THE WINGS. THE COOK OFFERS IT SOUP.',
      'IN THE END THE GHOST OPENS A TEA ROOM AND DOES VERY WELL. THE CAST BOW IN SHEETS. SO DOES THE ORCHESTRA.'] },
    { name: 'THE DRAGON OF THE ASHEN RIDGE', cards: [
      'A SPECTACLE: A DRAGON TWELVE ACTORS LONG WINDS DOWN THE AISLE BREATHING RED SILK, AND THE FRONT ROWS SCREAM WITH DELIGHT.',
      'A PIRATE QUEEN CHALLENGES IT TO A GAME OF LIAR\'S DICE INSTEAD OF A FIGHT. THE DRAGON, IT TURNS OUT, CANNOT BLUFF.',
      'IT LOSES ITS HOARD AND IS STRANGELY RELIEVED. THE TWELVE ACTORS TAKE TWELVE BOWS, ONE AT A TIME, FROM THE TAIL.'] },
    { name: 'A MIDWINTER\'S CHART', cards: [
      'A ROMANCE BETWEEN A CARTOGRAPHER AND A LIGHTHOUSE KEEPER WHO ONLY EVER WRITE TO EACH OTHER IN THE MARGINS OF MAPS.',
      'THEIR LETTERS GO ASTRAY, ARE BOUND INTO AN ATLAS AND SOLD TO A SEA CAPTAIN WHO READS THEM ALOUD TO HER CREW.',
      'THE CREW SAIL HER TO THE LIGHTHOUSE TO SEE HOW IT ENDS. IT ENDS WELL. SOMEBODY IN THE GALLERY WHISTLES.'] },
    { name: 'THE FERRYMAN\'S COIN', cards: [
      'THE LAMPS BURN BLUE. A HOODED FIGURE POLES A BOAT ACROSS THE STAGE AND SAYS NOTHING FOR A VERY LONG TIME.',
      'A YOUNG SAILOR TRIES TO PAY HIM WITH A COIN FROM EVERY PORT ON THE FIVE SEAS. HE TAKES NONE OF THEM.',
      'HE TAKES, AT LAST, A SONG. THE SAILOR SINGS IT. THE LAMPS COME BACK UP GOLD, AND YOU FIND YOU\'VE BEEN HOLDING YOUR BREATH.'] }
  ];
  function lumarDay(ms) { return Math.floor(((ms == null ? Date.now() : ms) - Date.UTC(2026, 0, 1, 5)) / (8 * 3600000)); }
  function play(ms) { var d = lumarDay(ms); return PLAYS[((d % PLAYS.length) + PLAYS.length) % PLAYS.length]; }
  function evening() {
    if (typeof BridgeClock === 'undefined' || !BridgeClock.sky) return true;
    var s = BridgeClock.sky('lumar-crown-oldtown');
    return !s || s.sun < 0.5;
  }
  function playbill() {
    var p = play();
    return 'TONIGHT AT THE LANTERN: "' + p.name + '". TICKETS ' + TICKET + ' COINS AT THE BOX OFFICE BY THE MIDDLE DOOR.' +
      '\n\nTOMORROW: "' + play(Date.now() + 8 * 3600000).name + '".';
  }
  function theatre() {
    var p = play(), eve = evening();
    BridgeInteractions.choose({
      title: 'The Lantern Theatre',
      text: (eve ? 'THE BOX OFFICE WINDOW IS LIT. A WOMAN IN A GREEN VELVET JACKET LOOKS UP FROM HER LEDGER. "TONIGHT\'S IS ' : 'THE DOORS ARE OPEN FOR THE REHEARSAL; THE CAST ARE STILL IN THEIR OWN CLOTHES. "TONIGHT WE DO ') +
            '\'' + p.name + '\'. ' + TICKET + ' A SEAT, AND YOU\'LL WANT A HANDKERCHIEF OR A STRONG STOMACH, DEPENDING."',
      rows: [{ label: eve ? 'Buy a ticket' : 'Watch the rehearsal', sub: p.name.toLowerCase(), note: TICKET + ' coins', pick: function () {
        BridgeProgression.wagerCoins(TICKET, 'theatre').then(function (r) {
          if (!r || !r.ok) return say('BOX OFFICE', '"' + TICKET + ' COINS, LOVE. THE GALLERY\'S NOT FREE EITHER, WHATEVER THEY TELL YOU."');
          perform(p, 0, eve);
        });
      } }],
      closeLabel: 'Another night'
    });
  }
  function perform(p, i, eve) {
    if (i === 0) sfx('door');
    if (i < p.cards.length) {
      return BridgeInteractions.choose({ title: p.name, text: p.cards[i], rows: [{ label: i < p.cards.length - 1 ? 'Watch on' : 'Applaud', pick: function () { perform(p, i + 1, eve); } }], closeLabel: 'Slip out' });
    }
    sfx('success');
    var today = lumarDay();
    var lift = st.saw !== today;
    st.saw = today; st.seen = st.seen || {}; st.seen[p.name] = (st.seen[p.name] || 0) + 1; store();
    if (lift && typeof BridgeInventory !== 'undefined' && BridgeInventory.restoreEnergy) BridgeInventory.restoreEnergy(30);
    if (lift) note('The Lantern Theatre', 'Saw "' + p.name.toLowerCase() + '"', eve ? 'from the gallery' : 'at a rehearsal');
    say('THE LANTERN THEATRE', 'THE CURTAIN COMES DOWN. THE HOUSE STAMPS AND CHEERS AND SPILLS OUT ONTO THEATRE STREET, STILL ARGUING ABOUT THE ENDING.' +
        (lift ? '\n\nYOU WALK OUT LIGHTER. (+30 ENERGY)' : ''));
  }

  if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.register) {
    BridgeInteractions.register('capital', function (inter) { if (inter.what === 'theatre') theatre(); }, 'Visit');
  }

  return { decorate: decorate, BUILT: BUILT, play: play, PLAYS: PLAYS, _spots: function () { return crownSpots; } };
})();
