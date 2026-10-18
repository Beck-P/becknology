/**
 * BridgeExpedition — past the Hoarspire: the Last Ridge and the Lantern Beyond.
 *
 * The end of the curios' tale (js/magic.js). From the summit of the Hoarspire
 * a rope goes down the far side onto **the Last Ridge** (`hoarfell-ridge`,
 * scenes/hoarfell_ridge.py, a backdrop world over the cloud sea, twice as
 * cold): the crevasse field, where the open crevasses are walls and their
 * hidden ends lie under the snow (the world JSON's `expedition.crevasses`) —
 * step on one and the snow gives way: you fall, it hurts, and you climb out
 * back at the last cairn you passed; the crack stays open till the next day's
 * snow. The bamboo wands mark the one safe line. Ysolde's **avalanche probe**
 * (F) finds them a few paces ahead; the glimmer lantern shows the near ones.
 * Then the Ice Step (a climb, js/climb.js route `icestep`), the high ridge
 * (the bivouac hut: rest, the logbook; the old camp; the last cairn) and the
 * bowl, skied free (js/ski.js) down to **the ice door**: it opens to the rune
 * stone from the Hoarspire's summit (a curio), and its twelve hollows light
 * for the curios you've found. Behind it, **the Hollow** (`hoarfell-hollow`):
 * the Lantern Beyond. You carry a flame home in the tin lantern left there —
 * the `lantern_beyond` item: the cold can't touch you, hidden things show
 * in its light (crevasses, and curios like the glimmer lantern).
 * Whiteouts blow over the ridge now and then: the world goes white past a
 * few paces, the cold bites harder, the wands' flags are all you can see.
 *
 * Kept in localStorage bridge_expedition.
 *
 *   BridgeExpedition.decorate(worldId, data)   // world.js, as worlds load
 *   BridgeExpedition.use(inter)                // interaction type 'expedition'
 *   BridgeExpedition.probe() / .beyond()       // the items' F
 *   BridgeExpedition.whiteout()                // 0..1, for the cold (js/worlds/hoarfell.js)
 *   BridgeExpedition.journal()
 */
var BridgeExpedition = (function () {
  var KEY = 'bridge_expedition', RIDGE = 'hoarfell-ridge', HOLLOW = 'hoarfell-hollow', SUMMIT = 'hoarfell-summit';
  var ARRIVE = [13, 62];
  var LOG = [
    ['IVO VENN, CARTOGRAPHER, SAPPHIRE PORT',
     'MAPPED THE FIELD AS FAR AS THE STEP. PUT IN WANDS WHERE THE SNOW HELD ME. IF YOU ARE READING THIS, KEEP TO THEM - I FOUND THE OTHER WAY THE HARD WAY, TWICE.'],
    ['FIVE NAMES, ONE HAND: THE CREW OF THE WREN',
     'WE CAME TO SEE IF IT WAS TRUE. IT IS. WE AREN\'T TAKING IT - IT ISN\'T THE SORT OF THING YOU TAKE. WE\'LL PUT THE BIRD ON OUR PATCH AND GO HOME AND NOT SAY.'],
    ['NO NAME. A DRAWING OF A DRAGON, VERY SMALL',
     'FOLLOWED THE OLD ONE NORTH FROM THE REACH. IT WENT DOWN THE BOWL AT DUSK AND DIDN\'T COME BACK UP. I THINK IT WENT TO SLEEP BY THE FIRE.'],
    ['"FOR EDDA" - THE WRITING SHAKES',
     'THE WIND TURNED US AT THE BOWL. I SAW THE DOOR. LIT, LIKE THEY SAID. TELL EDDA I SAW IT. TELL HER THE FARM WAS THE RIGHT CHOICE AND I\'M SORRY ABOUT THE THIMBLE.'],
    ['YSOLDE, GUIDE, FELLHAVEN (YOUNGER WRITING)',
     'GOT AS FAR AS THE HUT. TURNED BACK. A GUIDE WHO DOESN\'T KNOW WHEN TO TURN BACK ISN\'T ONE. ONE DAY.']
  ];

  var st = load();
  var sel = null;              // the last cairn you passed (a fall puts you back by it)
  var fall = null;             // falling in, in progress
  var puffs = [];
  var wx = { next: 0, start: 0, end: 0 };   // the whiteout
  var lastWorld = null;
  var clock = 0;               // the scene hooks' time (ms), so the weather keeps the same clock as the drawing

  function load() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    d = d || {};
    return { seen: d.seen || {}, opened: d.opened || {}, openedDay: d.openedDay || 0, door: !!d.door, lantern: d.lantern || 0,
             falls: d.falls || 0, log: d.log || 0, signed: !!d.signed, camp: !!d.camp, hut: !!d.hut, came: !!d.came, stepped: !!d.stepped };
  }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode */ } }
  function say(t, x) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(t, x); }
  function toast(k, t, sub) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(k, t, sub); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }
  function carried(id) { return typeof BridgeInventory !== 'undefined' && BridgeInventory.getCount(id) > 0; }
  function held(id) { return typeof BridgeInventory !== 'undefined' && BridgeInventory.getSelectedItemId && BridgeInventory.getSelectedItemId() === id; }
  function day() { return Math.floor(Date.now() / 86400000); }
  // a crack's key: plain on the Last Ridge (as saved before), the world's id in front anywhere else with a crevasse field
  // (the touring days' glaciers, js/touring.js)
  function key(x, y, wid) { wid = wid || (typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId()) || RIDGE; return (wid === RIDGE ? '' : wid + ':') + x + ',' + y; }
  function curios() { return typeof BridgeMagic !== 'undefined' ? Object.keys(BridgeMagic._st().found).length : 0; }
  function runeFound() { return typeof BridgeMagic !== 'undefined' && !!BridgeMagic._st().found.summit_rune; }

  // a fresh fall of snow each day bridges the cracks you fell through again
  function opened() {
    if (st.openedDay !== day()) { st.opened = {}; st.openedDay = day(); store(); }
    return st.opened;
  }
  function hiddenAt(world, x, y) {
    var E = world && world.expedition;
    if (!E) return false;
    if (!E._set) { E._set = {}; E.crevasses.forEach(function (t) { E._set[key(t[0], t[1])] = 1; }); }
    return !!E._set[key(x, y)] && !opened()[key(x, y)];
  }

  // ---- as worlds load -----------------------------------------------------------------------------------------
  function decorate(worldId, data) {
    if (worldId === SUMMIT) {
      data.interactions = (data.interactions || []).filter(function (it) { return it.label !== 'THE LAST RIDGE'; });
      data.interactions.push({ x: 24, y: 9, type: 'expedition', action: 'last_ridge', label: 'THE LAST RIDGE', prompt: 'PRESS E TO LOOK' });
    }
    if (worldId === 'hoarfell') {                             // Ysolde stocks the probe
      (data.interactions || []).forEach(function (it) {
        if (it.label === 'GUIDE\'S HUT' && it.items && !it.items.some(function (i) { return i.id === 'probe'; })) it.items.push({ id: 'probe', price: 50 });
      });
    }
    if (data.expedition) {                                     // cracks fallen through today are open holes
      var pre = worldId === RIDGE ? '' : worldId + ':';
      Object.keys(opened()).forEach(function (k) {
        if ((pre && k.indexOf(pre) !== 0) || (!pre && k.indexOf(':') >= 0)) return;
        var p = k.slice(pre.length).split(','), x = +p[0], y = +p[1];
        if (data.collisions[y]) data.collisions[y][x] = 1;
      });
    }
  }

  // ---- interactions ----------------------------------------------------------------------------------------------
  function use(inter) {
    switch (inter.action) {
      case 'last_ridge': return lastRidge();
      case 'cairn': return cairn(inter);
      case 'hut': return hut();
      case 'camp': return camp();
      case 'door': return door();
      case 'lantern': return lantern();
    }
  }

  function lastRidge() {
    var probe = carried('probe'), thermal = typeof BridgeGear !== 'undefined' && BridgeGear.has('cold');
    BridgeInteractions.choose({
      title: 'The Last Ridge',
      text: 'AN OLD BOLT IN THE ROCK AT THE EDGE, A BLUE ROPE TIED OFF TO IT, GOING DOWN THE FAR SIDE OF THE HOARSPIRE INTO THE CLOUD. ' +
            'PAST IT, A LONG WHITE RIDGE BENDS AWAY NORTH, AND THE WIND COMES OFF IT LIKE A HAND ON YOUR CHEST.' +
            (probe ? '' : '\n\nYSOLDE\'S VOICE IN YOUR HEAD: "NOT WITHOUT A PROBE. THE SNOW UP THERE LIES."') +
            (thermal ? '' : '\n\nIT IS COLDER THERE THAN ANYWHERE YOU HAVE BEEN.'),
      rows: [
        { label: 'Go down onto the ridge', sub: 'the rope, the far side, the crevasse field', pick: function () { BridgeWorld.enterWorld(RIDGE, ARRIVE); } }
      ],
      closeLabel: 'Not today'
    });
  }

  function cairn(inter) {
    var E = BridgeWorld.getWorld().expedition, i = 0;
    if (E) E.cairns.forEach(function (c, j) { if (c[0] === inter.x && c[1] === inter.y) i = j; });
    sel = i;
    sfx('pickup');
    say('CAIRN', 'A CAIRN OF FLAT STONES, EACH ONE PUT THERE BY SOMEBODY WHO GOT THIS FAR. YOU ADD ONE.\n\nTHE SNOW HERE HOLDS. IF IT GOES WRONG AHEAD, THIS IS WHERE YOU\'LL CLIMB BACK TO.');
  }

  function hut() {
    var rows = [
      { label: 'Light the stove and rest', sub: 'warm through, sleep a little', pick: rest },
      { label: 'Read the logbook', sub: (st.log % LOG.length + 1) + ' of ' + LOG.length, pick: readLog }
    ];
    if (!st.signed) rows.push({ label: 'Sign the logbook', sub: 'your name under theirs', pick: sign });
    BridgeInteractions.choose({
      title: 'The Bivouac Hut',
      text: 'STONE WALLS, AN IRON ROOF UNDER A DRIFT, ONE SMALL WINDOW. INSIDE: TWO BUNKS, A STOVE, A STACK OF WOOD SOMEBODY CUT AND LEFT, AND A LOGBOOK ON A SHELF.',
      rows: rows
    });
    if (!st.hut) { st.hut = true; store(); }
  }
  function rest() {
    if (typeof BridgeInventory !== 'undefined') BridgeInventory.restoreAll();
    if (typeof BridgeHoarfell !== 'undefined') BridgeHoarfell.warm(10);
    if (wx.end > clock) { wx.end = 0; wx.next = clock + 150000; }      // the weather blows over while you sleep
    sfx('success');
    say('THE BIVOUAC HUT', 'THE STOVE TICKS. THE WIND WORRIES AT THE ROOF FOR AN HOUR AND THEN GIVES UP. YOU WAKE WARM, RESTED, AND THE WINDOW IS CLEAR.');
  }
  function readLog() {
    var e = LOG[st.log % LOG.length];
    st.log++; store();
    sfx('click');
    say(e[0], '"' + e[1] + '"');
  }
  function sign() {
    st.signed = true; store();
    var name = ((typeof BridgeState !== 'undefined' && BridgeState.getPilot && BridgeState.getPilot()) || {}).name || 'A PILOT';
    if (typeof BridgeProgression !== 'undefined') BridgeProgression.recordAchievement('signed_the_hut', 40, { source: 'expedition' });
    sfx('quest');
    say('THE LOGBOOK', 'YOU WRITE: ' + name.toUpperCase() + '. CAME UP THE WANDS AND THE STEP. GOING ON.\n\nIT LOOKS SMALL UNDER ALL THE OTHERS. IT LOOKS RIGHT.');
  }

  function camp() {
    if (!st.camp) {
      st.camp = true; store();
      if (typeof BridgeInventory !== 'undefined') BridgeInventory.give('summit_crystal', 2);
      if (typeof BridgeProgression !== 'undefined') BridgeProgression.awardCoins(80, 'expedition:camp');
      sfx('clue');
      toast('The old camp', 'Two summit crystals, 80 coins', 'And a last page');
      return say('THE OLD CAMP', 'A TENT FLATTENED BY YEARS OF WIND, A SLEDGE ON ITS SIDE, AN AXE STILL STANDING IN THE SNOW WHERE SOMEBODY LEFT IT. ' +
        'IN A TIN UNDER THE SLEDGE: TWO SUMMIT CRYSTALS, A FEW OLD COINS, AND ONE PAGE.\n\n"THE BOWL GOES DOWN TO IT. YOU CAN SEE THE LIGHT FROM THE TOP AT DUSK. ' +
        'WE\'RE TOO TIRED TO GO DOWN AND TOO PROUD TO SAY SO. TOMORROW."\n\nTHERE WAS NO NEXT PAGE.');
    }
    say('THE OLD CAMP', 'THE TENT, THE SLEDGE, THE AXE. THE WIND HAS STARTED BURYING THEM AGAIN.');
  }

  function door() {
    var n = curios();
    if (st.door) return BridgeWorld.enterWorld(HOLLOW, [8, 12]);
    var lit = 'TWELVE SMALL HOLLOWS CUT UP THE PILLARS. ' + (n ? n + (n === 1 ? ' OF THEM GLOWS' : ' OF THEM GLOW') + ' GOLD AS YOU COME CLOSE - ONE FOR EACH PIECE OF THE TALE YOU CARRY.' : 'THEY ARE DARK.');
    if (!runeFound()) {
      sfx('error');
      return say('THE ICE DOOR', 'A DOOR OF ICE IN THE BUTTRESS, LIT FROM BEHIND, WARM AND GOLD. NO HANDLE, NO HINGE.\n\n' + lit +
        '\n\nOVER THE DOOR, A HOLLOW THE SIZE AND SHAPE OF A SMALL CARVED STONE. SOMETHING BELONGS THERE - SOMETHING FROM THE TOP OF THE HOARSPIRE, BY THE OLD OBSERVATORY.');
    }
    st.door = true; store();
    sfx('quest');
    toast('The ice door', 'It opens', 'The Lantern Beyond');
    BridgeInteractions.choose({
      title: 'The Ice Door',
      text: lit + '\n\nYOU PRESS THE RUNE STONE FROM THE SUMMIT INTO THE HOLLOW OVER THE DOOR. IT FITS AS IF IT WAS CUT FOR IT - IT WAS. THE ICE SIGHS, AND THE DOOR IS NOT THERE ANY MORE.',
      rows: [{ label: 'Go in', pick: function () { BridgeWorld.enterWorld(HOLLOW, [8, 12]); } }], closeLabel: 'Not yet'
    });
  }

  function lantern() {
    if (st.lantern) {
      if (carried('lantern_beyond')) return say('THE LANTERN BEYOND', 'IT BURNS ON THE PLINTH AS IT ALWAYS HAS, NOTHING FEEDING IT. YOURS BURNS WITH IT, THE SAME COLOUR EXACTLY.');
      return BridgeInteractions.choose({
        title: 'The Lantern Beyond',
        text: 'IT BURNS ON THE PLINTH AS IT ALWAYS HAS. THE TIN LANTERN IS BACK ON THE STEP, CLEAN AND EMPTY.',
        rows: [{ label: 'Light it again', sub: 'and carry the flame home', pick: relight }], closeLabel: 'Just look a while'
      });
    }
    BridgeInteractions.choose({
      title: 'The Lantern Beyond',
      text: 'AN OLD IRON LANTERN ON A PLINTH OF DARK STONE, AND IN IT A FLAME THAT ISN\'T BURNING ANYTHING. IT WAS OLD WHEN THE FIRST OF THEM FOUND IT. ' +
            'THE LIGHT IS EXACTLY THE COLOUR THE GLASSBLOWERS NEVER GOT RIGHT.\n\nON THE STEP, A TIN LANTERN, CLEAN AND EMPTY, AND SCRATCHED ON THE STONE BESIDE IT: TAKE A LIGHT HOME. LEAVE THE LANTERN.',
      rows: [{ label: 'Light the tin lantern from it', sub: 'and carry the flame home', pick: take }], closeLabel: 'Just look a while'
    });
  }
  function relight() {
    if (typeof BridgeInventory === 'undefined' || !BridgeInventory.addItem('lantern_beyond', 1)) return;
    sfx('pickup');
    toast('The Lantern Beyond', 'Lit again', 'In your pack');
  }
  function take() {
    if (typeof BridgeInventory === 'undefined' || !BridgeInventory.addItem('lantern_beyond', 1)) return say('THE LANTERN BEYOND', 'YOUR PACK IS FULL. MAKE ROOM FOR IT.');
    st.lantern = Date.now(); store();
    if (typeof BridgeProgression !== 'undefined') {
      BridgeProgression.awardCoins(500, 'expedition:lantern');
      BridgeProgression.recordAchievement('lantern_beyond', 0, { source: 'expedition' });
    }
    sfx('quest');
    toast('The Lantern Beyond', 'You carry a light home', '500 coins');
    say('THE LANTERN BEYOND', 'THE FLAME LEANS OVER INTO THE TIN LANTERN AS IF IT HAD BEEN WAITING TO. THE OLD ONE BURNS ON, NO SMALLER.\n\n' +
      'THE CRACKS IN THE ICE SHOW DARK IN ITS LIGHT. THE COLD DOESN\'T COME NEAR IT. AND SOMEWHERE, YOU THINK, A BELL RINGS ON ITS OWN.\n\n(500 COINS. THE LANTERN BEYOND IS IN YOUR PACK.)');
  }

  // ---- the probe and the lantern -------------------------------------------------------------------------------------
  function ahead(n) {
    var f = BridgeCharacter.getFacing(), dx = f === 'right' ? 1 : f === 'left' ? -1 : 0, dy = f === 'down' ? 1 : f === 'up' ? -1 : 0;
    var out = [];
    for (var i = 1; i <= n; i++) out.push([BridgeCharacter.getX() + dx * i, BridgeCharacter.getY() + dy * i]);
    return out;
  }
  function probe() {
    var w = BridgeWorld.getWorld();
    if (!w || !w.expedition) return say('AVALANCHE PROBE', 'YOU PUSH THE PROBE IN. IT STOPS ON SOMETHING SOLID. NOTHING TO FEAR HERE.');
    sfx('step');
    var hit = ahead(3).filter(function (t) { return hiddenAt(w, t[0], t[1]); })[0];
    if (!hit) return say('AVALANCHE PROBE', 'THE PROBE GOES IN A HAND\'S DEPTH AND STOPS. FIRM SNOW, THREE PACES OUT.');
    var n = Math.abs(hit[0] - BridgeCharacter.getX()) + Math.abs(hit[1] - BridgeCharacter.getY());
    st.seen[key(hit[0], hit[1])] = 1;
    w.expedition.crevasses.forEach(function (t) {                  // the probe tells you which way the crack runs, too
      if (Math.abs(t[0] - hit[0]) <= 1 && Math.abs(t[1] - hit[1]) <= 1) st.seen[key(t[0], t[1])] = 1;
    });
    store();
    sfx('error');
    say('AVALANCHE PROBE', 'THE PROBE PLUNGES IN TO THE HANDLE - NOTHING UNDER THE SNOW BUT AIR. A HIDDEN CREVASSE, ' + n + (n === 1 ? ' PACE' : ' PACES') + ' AHEAD.');
  }
  function beyond() {
    var w = BridgeWorld.getWorld();
    if (w && w.expedition) {
      var px = BridgeCharacter.getX(), py = BridgeCharacter.getY(), n = 0;
      w.expedition.crevasses.forEach(function (t) {
        if (Math.hypot(t[0] - px, t[1] - py) < 7 && !st.seen[key(t[0], t[1])]) { st.seen[key(t[0], t[1])] = 1; n++; }
      });
      store();
      return say('THE LANTERN BEYOND', n ? 'YOU HOLD IT UP. THE LIGHT GOES INTO THE SNOW, AND WHERE THE SNOW IS HOLLOW IT SHOWS DARK. ' + n + ' MORE TO KEEP CLEAR OF.' : 'YOU HOLD IT UP. THE SNOW ROUND YOU IS SOUND.');
    }
    if (typeof BridgeMagic !== 'undefined') BridgeMagic.lantern();
  }

  // ---- falling in -----------------------------------------------------------------------------------------------
  function fallIn(world, x, y, now) {
    opened()[key(x, y)] = 1;
    st.seen[key(x, y)] = 1;
    st.falls++; store();
    if (world.collisions[y]) world.collisions[y][x] = 1;
    fall = { x: x, y: y, t0: now };
    for (var i = 0; i < 26; i++) puffs.push({ x: x + 0.5, y: y + 0.6, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2.2 - 0.5, t: now, life: 700 + Math.random() * 600 });
    sfx('crumble');
    BridgeCharacter.setHidden(true);
    BridgeWorld.setMode({ update: function () {}, focus: function () { return { x: x, y: y }; }, solo: true, end: function () { landOut(world, true); } });
  }
  function landOut(world, quiet) {
    if (!fall) return;
    fall = null;
    var E = world.expedition, c = E.cairns[sel == null ? -1 : sel], spot = c ? [c[0], c[1] + 1] : (E.arrive || ARRIVE).slice();
    if (world.collisions[spot[1]] && world.collisions[spot[1]][spot[0]]) spot = [spot[0] + 1, spot[1]];
    BridgeCharacter.setHidden(false);
    if (BridgeWorld.getMode()) BridgeWorld.setMode(null);
    if (world.expedition) { BridgeCharacter.init(spot[0], spot[1]); BridgeCharacter.setFacing('up'); }
    if (typeof BridgeInventory !== 'undefined') BridgeInventory.takeDamage(25);
    if (quiet) return;
    say('THE SNOW GIVES WAY', 'ONE STEP AND THE WORLD DROPS OUT FROM UNDER YOU - BLUE, THEN DARK, THEN A LEDGE OF ICE THAT KNOCKS THE WIND OUT OF YOU. ' +
      'IT TAKES AN AGE OF KICKING AND CLAWING TO GET OUT, AND YOU COME BACK TO ' + (c ? 'THE LAST CAIRN' : 'THE ROPE') + ' SHAKING.\n\n(-25 HEALTH. THE WANDS MARK THE SAFE LINE; A PROBE FINDS THE HOLLOW SNOW.)');
  }

  // ---- each frame on the ridge ---------------------------------------------------------------------------------------
  function tick(world, now) {
    clock = now;
    var wid = BridgeWorld.getWorldId();
    if (wid !== lastWorld) {
      lastWorld = wid;
      if (world.expedition) {
        sel = null; wx.next = now + 70000 + Math.random() * 60000; wx.start = wx.end = 0;
        if (wid === RIDGE && !st.came) { st.came = true; store(); toast('The Last Ridge', 'Past the Hoarspire', 'Keep to the wands'); }
      }
      if (wid === 'hoarfell-icestep' && !st.stepped) { st.stepped = true; store(); }
    }
    if (!world.expedition) return;
    if (fall) {
      if (now - fall.t0 > 1500) landOut(world, false);
      return;
    }
    if (BridgeWorld.getMode()) return;
    var x = BridgeCharacter.getX(), y = BridgeCharacter.getY();
    world.expedition.cairns.forEach(function (c, i) { if (Math.abs(c[0] - x) + Math.abs(c[1] - y) <= 2) sel = i; });
    if (!BridgeCharacter.isMoving() && hiddenAt(world, x, y)) fallIn(world, x, y, now);
    // the weather: a whiteout now and then, a minute or two apart
    if (now > wx.next && !wx.end) {
      wx.start = now; wx.end = now + 32000;
      toast('Whiteout', 'The cloud comes up over the ridge', 'Stay on the wands, or stay put');
      sfx('swish');
    }
    if (wx.end && now > wx.end) { wx.end = 0; wx.next = now + 120000 + Math.random() * 120000; }
  }
  function whiteout() {
    var w = BridgeWorld.getWorld && BridgeWorld.getWorld();
    if (!wx.end || !(w && w.expedition)) return 0;
    var now = clock, a = Math.min(1, (now - wx.start) / 4000), b = Math.min(1, (wx.end - now) / 4000);
    return Math.max(0, Math.min(a, b));
  }

  // ---- drawing ---------------------------------------------------------------------------------------------------
  function ground(ctx, world, offX, offY, ts, now) {
    var E = world.expedition;
    if (!E) return;
    var px = BridgeCharacter.getX(), py = BridgeCharacter.getY();
    var glow = held('glimmer_lantern') ? 2.5 : 0, beyondR = carried('lantern_beyond') ? 5 : 0;
    var op = opened();
    E.crevasses.forEach(function (t) {
      var k = key(t[0], t[1]), X = Math.round(offX + t[0] * ts), Y = Math.round(offY + t[1] * ts);
      if (op[k]) return hole(ctx, X, Y, ts, t[0] * 7 + t[1]);
      var d = Math.hypot(t[0] - px, t[1] - py), shown = st.seen[k] ? 1 : 0;
      if (d < glow) shown = Math.max(shown, 0.7 * (1 - d / glow) + 0.2);
      if (d < beyondR) shown = Math.max(shown, 0.9);
      if (shown > 0) sag(ctx, X, Y, ts, shown, t[0] * 7 + t[1]);
    });
  }
  // a crack you know is there: the snow sagging, a dark seam along it
  function sag(ctx, X, Y, ts, a, seed) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, a);
    ctx.fillStyle = 'rgba(120,140,176,0.32)';
    ctx.fillRect(X + 2, Y + Math.round(ts * 0.34), ts - 4, Math.round(ts * 0.34));
    ctx.fillStyle = '#4e6488';
    var y = Y + Math.round(ts * 0.5);
    for (var i = 0; i < ts; i += 4) {
      var j = ((seed * 13 + i * 7) % 5) - 2;
      ctx.fillRect(X + i, y + (j > 0 ? 1 : j < 0 ? -1 : 0), 4, 2);
    }
    ctx.restore();
  }
  // a crack you fell through: an open hole, blue at the lips, dark inside
  function hole(ctx, X, Y, ts, seed) {
    var u = Math.max(1, Math.round(ts / 16));
    ctx.fillStyle = '#a8d4ea';
    ctx.fillRect(X, Y + 4 * u, ts, 9 * u);
    ctx.fillStyle = '#4a7ea8';
    ctx.fillRect(X + u, Y + 5 * u, ts - 2 * u, 7 * u);
    ctx.fillStyle = '#1a2c48';
    ctx.fillRect(X + u, Y + 7 * u, ts - 2 * u, 5 * u);
    ctx.fillStyle = '#060c18';
    ctx.fillRect(X + 2 * u, Y + 9 * u, ts - 4 * u, 2 * u);
    ctx.fillStyle = '#e8eef6';                                   // ragged snow lips
    for (var i = 0; i < 16; i += 2) {
      if ((seed + i) % 3) ctx.fillRect(X + i * u, Y + 4 * u, 2 * u, u);
      if ((seed + i) % 4) ctx.fillRect(X + i * u, Y + 12 * u, 2 * u, u);
    }
  }

  function over(ctx, world, offX, offY, ts, now) {
    tick(world, now);
    var W = ctx.canvas.width, H = ctx.canvas.height, wid = BridgeWorld.getWorldId();
    // snow thrown up where you went through
    puffs = puffs.filter(function (p) { return now - p.t < p.life; });
    puffs.forEach(function (p) {
      var k = (now - p.t) / 1000;
      ctx.fillStyle = 'rgba(240,246,255,' + (0.85 * (1 - (now - p.t) / p.life)).toFixed(2) + ')';
      ctx.fillRect(Math.round(offX + (p.x + p.vx * k) * ts), Math.round(offY + (p.y + p.vy * k + 2.4 * k * k) * ts), 2, 2);
    });
    if (fall) {                                                   // the drop: everything going dark
      var f = Math.min(1, (now - fall.t0) / 1100);
      ctx.fillStyle = 'rgba(4,10,22,' + (f * 0.92).toFixed(2) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    var E = world.expedition;
    // the door's twelve hollows, one lit for each curio found; the door brighter once open
    if (E && E.door) {
      var n = curios();
      E.door.hollows.forEach(function (h, i) {
        if (i >= n) return;
        var X = Math.round(offX + h[0] * ts), Y = Math.round(offY + h[1] * ts), p = 0.6 + 0.4 * Math.sin(now / 500 + i);
        ctx.fillStyle = 'rgba(255,200,96,' + (0.35 * p).toFixed(2) + ')'; ctx.fillRect(X - 3, Y - 3, 6, 6);
        ctx.fillStyle = '#fff0b0'; ctx.fillRect(X - 1, Y - 1, 2, 2);
      });
      if (st.door) {
        var dx = Math.round(offX + (E.door.x + 0.5) * ts), dy = Math.round(offY + (E.door.y - 0.6) * ts);
        var g = ctx.createRadialGradient(dx, dy, 0, dx, dy, ts * 2.2);
        g.addColorStop(0, 'rgba(255,200,110,' + (0.32 + 0.08 * Math.sin(now / 700)).toFixed(2) + ')'); g.addColorStop(1, 'rgba(255,200,110,0)');
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(dx - ts * 3, dy - ts * 3, ts * 6, ts * 6); ctx.restore();
      }
    }
    // the Hollow: motes of light going up off the lantern
    if (world.hollow) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      var LX = offX + 8 * ts, LY = offY + 4.1 * ts, fl = 0.85 + 0.1 * Math.sin(now / 230) + 0.05 * Math.sin(now / 97);
      var lg = ctx.createRadialGradient(LX, LY, 0, LX, LY, ts * 1.6);
      lg.addColorStop(0, 'rgba(255,214,140,' + (0.42 * fl).toFixed(2) + ')'); lg.addColorStop(1, 'rgba(255,190,110,0)');
      ctx.fillStyle = lg; ctx.fillRect(LX - ts * 2, LY - ts * 2, ts * 4, ts * 4);
      for (var i = 0; i < 14; i++) {
        var ph = ((now / 1000) * (0.12 + (i % 4) * 0.03) + i * 0.137) % 1;
        var mx = 8 + Math.sin(i * 2.1 + now / 1300) * (0.25 + ph * 0.6), my = 3.9 - ph * 2.4;
        ctx.fillStyle = 'rgba(255,214,130,' + (0.7 * Math.sin(ph * Math.PI)).toFixed(2) + ')';
        ctx.fillRect(Math.round(offX + mx * ts), Math.round(offY + my * ts), 2, 2);
      }
      ctx.restore();
    }
    // the rope down to the ridge, from the summit's rim: two wands with their rags of orange
    if (wid === SUMMIT) {
      [[24.25, 9.5], [24.8, 9.85]].forEach(function (p, i) { wand(ctx, Math.round(offX + p[0] * ts), Math.round(offY + p[1] * ts), ts, now, i); });
    }
    // the whiteout: white past a few paces, blowing snow, and the wands' flags still showing through
    var a = whiteout();
    if (a > 0) {
      var pos = BridgeCharacter.getRenderPos(), X0 = offX + (pos.x + 0.5) * ts, Y0 = offY + (pos.y + 0.6) * ts;
      var gr = ctx.createRadialGradient(X0, Y0, ts * (2.6 - a), X0, Y0, ts * (6.5 - 2.5 * a));
      gr.addColorStop(0, 'rgba(232,238,248,0)'); gr.addColorStop(1, 'rgba(232,238,248,' + (0.96 * a).toFixed(2) + ')');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.6 * a).toFixed(2) + ')';
      for (var s = 0; s < 90; s++) {
        var sx = ((s * 131.7 + now * (0.18 + (s % 5) * 0.05)) % (W + 40)) - 20, sy = (s * 71.3 + Math.sin(now / 900 + s) * 8) % H;
        ctx.fillRect(Math.round(sx), Math.round(sy), 3 + (s % 4) * 2, 1);
      }
      if (E && E.wands) E.wands.forEach(function (p) {
        var d = Math.hypot(p[0] - pos.x, p[1] - pos.y);
        if (d > 9) return;
        ctx.globalAlpha = a * Math.max(0.25, 1 - d / 9);
        ctx.fillStyle = '#e8602a';
        ctx.fillRect(Math.round(offX + p[0] * ts), Math.round(offY + (p[1] - 0.95) * ts), Math.max(3, Math.round(ts / 4)), Math.max(2, Math.round(ts / 6)));
        ctx.globalAlpha = 1;
      });
    }
  }
  function wand(ctx, X, Y, ts, now, i) {
    var u = Math.max(1, Math.round(ts / 16));
    ctx.fillStyle = '#7a5a30'; ctx.fillRect(X, Y - 15 * u, u, 15 * u);
    ctx.fillStyle = '#c8a060'; ctx.fillRect(X + u, Y - 15 * u, u, 15 * u);
    var flap = Math.round(Math.sin(now / 160 + i * 2) * u);
    ctx.fillStyle = '#e8602a'; ctx.fillRect(X + 2 * u, Y - 14 * u + flap, 4 * u, 3 * u);
    ctx.fillStyle = '#a83a1a'; ctx.fillRect(X + 2 * u, Y - 12 * u + flap, 4 * u, u);
  }

  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('hoarfell', { ground: ground, over: over });

  function journal() {
    var out = [];
    if (!st.came) return out;
    out.push('Went down the rope from the Hoarspire onto the Last Ridge' + (st.falls ? ' (and through the snow ' + st.falls + (st.falls === 1 ? ' time)' : ' times)') : ''));
    if (typeof BridgeClimb !== 'undefined' && BridgeClimb.records('icestep') && BridgeClimb.records('icestep').ascents) out.push('Climbed the Ice Step');
    if (st.hut) out.push('Found the bivouac hut' + (st.signed ? ' and signed its logbook' : ''));
    if (st.camp) out.push('Found the old camp, and its last page');
    if (st.door) out.push('Opened the ice door at the foot of the bowl');
    else if (st.hut) out.push(runeFound() ? 'The rune stone from the summit should fit something down there' : 'Something lit at the bottom of the bowl. Something from the Hoarspire\'s summit opens it');
    if (st.lantern) out.push('<b>Carried a light home from the Lantern Beyond</b>');
    return out;
  }

  return { decorate: decorate, use: use, probe: probe, beyond: beyond, whiteout: whiteout, journal: journal,
           _st: function () { return st; }, _storm: function () { wx.next = 0; wx.end = 0; }, _wx: function () { return wx; } };
})();
