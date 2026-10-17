/**
 * BridgeHome — places of your own: buy them, furnish them, make them yours.
 *
 * Homes: the White House on Sapphire Port's square (lumar-home) and a
 * capsule apartment over the District's Capsule Hotel (arcadia-home), each
 * an empty Blender-rendered room (tools/bridge-art/scenes/lumar_home.py,
 * arcadia_home.py); at the top of the ramp (js/legacy.js) the Penthouse on
 * Skyport 7, its brass door on the roof pad (arcadia-penthouse, 250,000),
 * and Ashcombe House on Crownhaven's waterfront (lumar-manor, 400,000) —
 * and aboard the Wayfarer, your quarters and the bridge,
 * which are yours already. Their doors are `home_door` interactions put on
 * the street as worlds load: the first time, the door offers the place for
 * sale (wagerCoins); after that it lets you in.
 *
 * Furniture: thirty-six pieces rendered by tools/bridge-art/furniture_sprites.py
 * into one sheet (assets/scenes/furniture) with assets/furniture.json (id,
 * name, price, footprint w x d, walk for rugs, where each sits on the sheet),
 * and pieces drawn live by the modules that run them (`add`: the fish tanks,
 * js/aquarium.js — a picture each frame, `live(entry, now, theme)`, and
 * optionally a light laid over it, `glow`).
 * Pieces are drawn through the global scene hooks ('*') and depth-tested
 * against the room's render like the characters; they block their tiles
 * (rugs don't), and the useful ones work: beds to sleep in, seats to sit on,
 * the wardrobe, an arcade cabinet, the chess table, a telescope, a clock
 * that knows the time, a cat that will (sometimes) be stroked.
 *
 * Furnishing (H, or the Furnish pill, in a place of yours): a cursor on the
 * floor (arrows, the mouse, a tap), the tray of what you own and the shop
 * to buy more. E / click puts the piece in hand down or picks one up; X puts
 * one away; Tab switches to the shop. A piece can't go where it would block
 * a door, a person, anything you use, or cut off part of the floor.
 * Saved in localStorage bridge_homes.
 *
 *   BridgeHome.decorate(worldId, data)   // world.js, last, as each world loads
 *   BridgeHome.use(inter)                // home_door, home_piece
 *   BridgeHome.buy(homeId) / edit() / owns(homeId)
 */
var BridgeHome = (function () {
  var KEY = 'bridge_homes';
  var HOMES = {
    'lumar-home': { name: 'The White House', price: 6000, theme: 'parchment', gift: ['rocking_chair', 'potted_plant'],
                    door: { world: 'lumar-sapphire', x: 38, y: 13, label: 'WHITE HOUSE', spawn: [8, 9] },
                    shop: 'WEXLEY & DAUGHTERS, JOINERS',
                    pitch: 'A WHITEWASHED HOUSE ON THE SQUARE, BLUE SHUTTERS, A CHIMNEY THAT DRAWS. A CARD IN THE WINDOW: "TO LET, FOR GOOD. ONE ROOM, ONE HEARTH, A VIEW OF THE LIGHT. ENQUIRE WITHIN - THE KEY IS UNDER THE POT."',
                    bought: 'THE KEY TURNS. IT\'S EMPTY, SWEPT, AND YOURS - AND THE LANDLADY HAS LEFT YOU A ROCKING CHAIR AND A PLANT, "TO START YOU OFF".' },
    'arcadia-home': { name: 'Capsule Apartment', price: 3000, theme: 'neon', gift: ['neon_stool', 'houseplant'],
                      door: { world: 'arcadia-street', x: 36, y: 7, label: 'CAPSULE HOTEL', spawn: [6, 8] },
                      shop: 'ARCADIAMART LIVING',
                      pitch: 'CAPSULE HOTEL, 24 HOURS. "NO VACANCY" - BUT UNDER IT, SMALLER: "LONG-STAY FLOOR. ONE ROOM, ONE WINDOW, YOUR OWN CAPSULE. KEYCARD AT THE DESK."',
                      bought: 'THE KEYCARD BLINKS GREEN. A BARE ROOM, A WINDOW FULL OF CITY, A CAPSULE IN THE WALL - YOURS. THE DESK THREW IN A STOOL AND A PLANT.' },
    // the legacy homes (js/legacy.js): the top of Skyport 7's tower, its private lift from the roof pad; and the
    // Ashcombes' house on Crownhaven's waterfront, beside the Crown & Anchor
    'arcadia-penthouse': { name: 'The Penthouse', price: 250000, theme: 'neon', gift: ['sofa', 'arcade_cabinet', 'nebula_tank', 'telescope'],
                           door: { world: 'arcadia-skypad', x: 11, y: 3, label: 'PENTHOUSE', spawn: [10, 10] },
                           shop: 'ARCADIAMART LIVING',
                           pitch: 'A BRASS DOOR ON THE ROOF, A LIFT THAT GOES ONE FLOOR DOWN. THE LISTING ON ITS GLASS: "THE TOP OF THE TOWER. THE WHOLE CITY THROUGH ONE WINDOW. A POOL. A BAR. DISCRETION INCLUDED."',
                           bought: 'THE BRASS DOOR KNOWS YOUR HAND NOW. THE LIFT HUMS DOWN ONE FLOOR AND OPENS ON THE CITY. THE AGENT LEFT A SOFA, A CABINET, A NEBULA IN A JAR AND A TELESCOPE, "TO GET YOU STARTED".' },
    'lumar-manor': { name: 'Ashcombe House', price: 400000, theme: 'parchment', gift: ['wingback', 'chess_table', 'orrery', 'clock'],
                     door: { world: 'lumar-crown', x: 45, y: 29, label: 'ASHCOMBE HOUSE', spawn: [10, 11] },
                     shop: 'WEXLEY & DAUGHTERS, JOINERS',
                     pitch: 'THE TALL HOUSE ON THE WATERFRONT, SHUTTERED SINCE THE LAST ADMIRAL ASHCOMBE DIED. A BRASS PLATE BY THE DOOR: "FOR SALE BY ORDER OF THE CROWN. A GREAT HALL, A GALLERY, EIGHT BEDROOMS, A VIEW OF EVERY SHIP IN THE CAPITAL."',
                     bought: 'THE REGISTRAR HANDS YOU A KEY AS LONG AS YOUR HAND. INSIDE, THE DUST SHEETS ARE OFF: A HALL, A FIRE ALREADY LIT, AND THE ASHCOMBES\' OWN WINGBACK, CHESS TABLE, ORRERY AND CLOCK, LEFT FOR THE NEXT CAPTAIN.' },
    // Edda's farmhouse on Verdance: it comes with the farm's deed (js/homestead.js), its door is the farm's own
    'verdance-home': { name: 'The Farmhouse', farm: true, theme: 'parchment', gift: ['rocking_chair', 'bed'], shop: 'HOLLIN\'S MAIL-ORDER' },
    // the cottage on Starling Holm: yours once it's rebuilt (js/holm.js), its door the island's own
    'lumar-holm-home': { name: 'The Cottage', holm: true, theme: 'parchment', gift: ['bed', 'armchair'], shop: 'WEXLEY & DAUGHTERS, JOINERS' },
    'quarters': { name: 'Your Quarters', ship: true, theme: 'holo', shop: "THE CHANDLER'S CATALOGUE" },
    'bridge': { name: 'The Bridge', ship: true, theme: 'holo', shop: "THE CHANDLER'S CATALOGUE" }
  };
  var SEATS = { stool: 1, armchair: 1, rocking_chair: 1, bench: 1, sofa: 1, wingback: 1, pouf: 1, neon_stool: 1 };
  // what a piece does once it's down (one interaction a tile for seats, one a piece otherwise)
  var USES = {
    bed: { type: 'dialog', action: 'sleep', label: 'BED', prompt: 'PRESS E TO SLEEP', dialog: 'YOUR OWN BED. YOU SLEEP LIKE THE DEAD AND WAKE UP NEW.' },
    wardrobe: { type: 'outfitter', wardrobe: true, label: 'WARDROBE', prompt: 'PRESS E TO CHANGE' },
    arcade_cabinet: { type: 'cabinet', target: '/asteroids', label: 'ASTEROIDS', prompt: 'PRESS E TO PLAY' },
    retro_crt: { type: 'app', target: '/breakout', label: 'RETRO CRT', prompt: 'PRESS E TO PLAY' },
    chess_table: { type: 'app', target: '/chess', label: 'CHESS TABLE', prompt: 'PLAY CHESS' },
    desk: { type: 'home_piece', label: 'DESK', prompt: 'PRESS E TO WRITE' },
    telescope: { type: 'dialog', action: 'view', view: 'stars', label: 'TELESCOPE', prompt: 'PRESS E TO LOOK',
                 dialog: 'THE STARS, CLOSER. SOMEWHERE OUT THERE, EVERY PLACE YOU\'VE BEEN.' },
    bookshelf: { type: 'home_piece', label: 'BOOKSHELF', prompt: 'PRESS E TO READ' },
    clock: { type: 'home_piece', label: 'CLOCK', prompt: 'PRESS E TO LOOK' },
    cat: { type: 'home_piece', label: 'CAT', prompt: 'PRESS E TO STROKE' },
    lucky_cat: { type: 'home_piece', label: 'LUCKY CAT', prompt: 'PRESS E TO LOOK' },
    lemon_tree: { type: 'home_piece', label: 'LEMON TREE', prompt: 'PRESS E TO LOOK' },
    orrery: { type: 'home_piece', label: 'ORRERY', prompt: 'PRESS E TO LOOK' },
    nebula_tank: { type: 'home_piece', label: 'NEBULA TANK', prompt: 'PRESS E TO LOOK' },
    // chests keep things (js/storage.js opens them in the menu's Backpack; what's inside rides on the layout entry, `items`)
    crate: { type: 'chest', label: 'CRATE', prompt: 'PRESS E TO OPEN' },
    trunk: { type: 'chest', label: 'OLD TRUNK', prompt: 'PRESS E TO OPEN' },
    strongbox: { type: 'chest', label: 'STRONGBOX', prompt: 'PRESS E TO OPEN' }
  };
  // a chest with things in it, or a tank with fish in it: empty it before it's put away
  function full(q) { return !!(q && ((q.items && q.items.some(function (s) { return s && s.count > 0; })) || (q.fish && q.fish.length))); }
  function emptyFirst(q, held) {
    if (q.fish && q.fish.length) return 'TAKE THE FISH OUT FIRST' + (held ? ': PUT IT DOWN, PRESS E AT IT AND TAKE THEM OUT.' : ': PRESS E AT THE TANK AND TAKE THEM OUT.');
    return held ? 'EMPTY IT FIRST: PUT IT DOWN, OPEN IT AND TAKE WHAT\'S INSIDE.' : 'EMPTY IT FIRST: OPEN IT AND TAKE WHAT\'S INSIDE.';
  }
  var BOOKS = ['"THE SPORE SEAS, A NATURAL HISTORY" - THE PAGE ON MIDNIGHT IS MISSING.',
               '"KNOTS FOR THE NERVOUS SAILOR." SOMEONE HAS PRACTISED THE NOOSE.',
               '"WHAT THE LIGHTHOUSE SAW," A NOVEL. THE KEEPER DID IT.',
               '"ARCADIA AFTER DARK: A DRINKING GUIDE." EVERY PAGE STAINED.',
               '"THE WREN: A CREW ROSTER." FIVE NAMES, ONE CIRCLED.',
               '"HOW TO TALK TO DRAGONS (BRIEFLY)."',
               '"STAR IRON AND SONGSTONE," BY H. DUNMORE. SIGNED, GRUDGINGLY.'];

  var save = load();
  function load() {
    var d;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    d = d || {};
    d.owned = d.owned || {}; d.have = d.have || {}; d.layout = d.layout || {}; d.seen = d.seen || {};
    return d;
  }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode */ } }
  function say(label, text) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(label, text); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function owns(id) {
    if (HOMES[id] && HOMES[id].farm) return typeof BridgeHomestead !== 'undefined' && BridgeHomestead.owned();
    if (HOMES[id] && HOMES[id].holm) return typeof BridgeHolm !== 'undefined' && BridgeHolm.built('house');
    return !!(HOMES[id] && (HOMES[id].ship || save.owned[id]));
  }
  function layout(id) { return save.layout[id] || (save.layout[id] = []); }
  function placed(pid) {
    var n = 0;
    Object.keys(save.layout).forEach(function (h) { save.layout[h].forEach(function (p) { if (p.id === pid) n++; }); });
    return n;
  }
  function spare(pid) { return (save.have[pid] || 0) - placed(pid); }

  // ---- the furniture sheet ----------------------------------------------------------------------------
  var pieces = [], byId = {}, sheet = null, meta = null, ready = false, waiting = [];
  var made = [];            // pieces another module draws itself (add): they have their spr already, img and all
  function whenReady(fn) { if (ready) fn(); else waiting.push(fn); }
  function merge(P) {       // into the catalogue, beside the piece named in `after` (or at the end)
    if (byId[P.id]) return;
    var at = P.after && byId[P.after] ? pieces.indexOf(byId[P.after]) + 1 : pieces.length;
    while (at < pieces.length && made.indexOf(pieces[at]) >= 0) at++;          // after the ones added before it
    pieces.splice(at, 0, P); byId[P.id] = P;
  }
  /** A piece drawn live: {id, name, price, w, d, spr: {img, sx, sy, sw, sh, ax, ay}, live(q, now, theme), glow?, use?, after?}. */
  function add(P) {
    made.push(P);
    if (meta) merge(P);
  }
  (function loadSheet() {
    Promise.all([
      fetch('/bridge/assets/furniture.json?v=' + Date.now()).then(function (r) { return r.json(); }),
      fetch('/bridge/assets/scenes/furniture/scene.json?v=' + Date.now()).then(function (r) { return r.json(); })
    ]).then(function (res) {
      pieces = res[0].pieces; meta = res[1];
      pieces.forEach(function (p) { byId[p.id] = p; });
      made.forEach(merge);
      sheet = new Image();
      sheet.onload = function () {
        cut();
        ready = true;
        var w = waiting; waiting = [];
        w.forEach(function (f) { f(); });
      };
      sheet.src = '/bridge/assets/scenes/furniture/full.' + (meta.ext || 'png') + '?v=' + meta.rev;
    }).catch(function () { /* no furniture: homes still open, just bare */ });
  })();

  // each piece's sprite: the bounding box of its cell's opaque pixels, and where its footprint's corner sits in it
  function cut() {
    var cv = document.createElement('canvas');
    cv.width = sheet.width; cv.height = sheet.height;
    var c = cv.getContext('2d');
    c.drawImage(sheet, 0, 0);
    var data = c.getImageData(0, 0, cv.width, cv.height).data, W = cv.width;
    var ox = meta.originX || 0, oy = meta.originY || 0;
    pieces.forEach(function (p) {
      if (p.spr) return;                                   // drawn live, cut already
      var cx0 = Math.floor(p.x / 3) * 3 * 32 + ox, cy0 = Math.floor(p.y / 4) * 4 * 32 + oy;
      var x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (var y = cy0; y < cy0 + 128 && y < cv.height; y++) for (var x = cx0; x < cx0 + 96 && x < W; x++) {
        if (data[(y * W + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      if (x1 < 0) { x0 = cx0; y0 = cy0; x1 = cx0 + 31; y1 = cy0 + 31; }
      p.spr = { sx: x0, sy: y0, sw: x1 - x0 + 1, sh: y1 - y0 + 1, ax: p.x * 32 + ox, ay: p.y * 32 + oy };
    });
  }

  // a piece's picture for the tray, scaled to fit a box
  function thumb(p, box) {
    var cv = document.createElement('canvas');
    cv.width = box; cv.height = box;
    if (!p.spr) return cv;
    var c = cv.getContext('2d'), s = p.spr;
    var k = Math.min(box / s.sw, box / s.sh, 2);
    if (k >= 1) k = Math.floor(k);
    c.imageSmoothingEnabled = false;
    var w = Math.round(s.sw * k), h = Math.round(s.sh * k);
    c.drawImage(s.img || sheet, s.sx, s.sy, s.sw, s.sh, Math.round((box - w) / 2), Math.round(box - h - (box - h) / 4), w, h);
    return cv;
  }

  // ---- worlds -------------------------------------------------------------------------------------------
  var cur = null;           // the decoratable world loaded now: {id, data, base (collisions with no furniture)}
  function decorate(worldId, data) {
    // the doors into homes, on their streets
    Object.keys(HOMES).forEach(function (id) {
      var D = HOMES[id].door;
      if (!D || D.world !== worldId) return;
      var it = data.interactions.filter(function (i) { return i.label === D.label; })[0];
      if (!it) { it = { x: D.x, y: D.y, label: D.label }; data.interactions.push(it); }
      it.type = 'home_door'; it.homeId = id;
      it.prompt = save.owned[id] ? 'PRESS E TO GO IN' : 'PRESS E TO LOOK';
    });
    cur = null;
    if (!HOMES[worldId] || !data.collisions) return;
    cur = { id: worldId, data: data, base: data.collisions.map(function (r) { return r.slice(); }) };
    whenReady(function () { if (cur && cur.data === data) apply(); });
    if (!HOMES[worldId].ship && owns(worldId) && !save.seen[worldId]) {
      save.seen[worldId] = Date.now();
      if (HOMES[worldId].farm || HOMES[worldId].holm) (HOMES[worldId].gift || []).forEach(function (g) { save.have[g] = (save.have[g] || 0) + 1; });   // Edda (or the joiners) left you a start
      store();
      setTimeout(function () {
        if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast('Home', HOMES[worldId].name, 'Yours to furnish - press H', false);
      }, 900);
    }
  }

  // collisions and interactions from the layout (after any change)
  function apply() {
    if (!cur) return;
    var d = cur.data;
    for (var y = 0; y < d.height; y++) for (var x = 0; x < d.width; x++) d.collisions[y][x] = cur.base[y][x];
    for (var i = d.interactions.length - 1; i >= 0; i--) if (d.interactions[i]._piece) d.interactions.splice(i, 1);
    layout(cur.id).forEach(function (q) {
      var P = byId[q.id];
      if (!P) return;
      if (!P.walk) cells(P, q.x, q.y).forEach(function (c) { d.collisions[c[1]][c[0]] = 1; });
      interactionsFor(P, q).forEach(function (it) { d.interactions.push(it); });
    });
  }
  function cells(P, x, y) {
    var out = [];
    for (var j = 0; j < P.d; j++) for (var i = 0; i < P.w; i++) out.push([x + i, y + j]);
    return out;
  }
  function interactionsFor(P, q) {
    if (SEATS[P.id]) {
      var out = [];
      for (var i = 0; i < P.w; i++) {
        out.push({ x: q.x + i, y: q.y, type: 'dialog', action: 'sit', label: P.name.toUpperCase(), prompt: 'PRESS E TO SIT',
                   seat: [q.x + i + 0.5, q.y + 0.6], facing: 'down', dialog: '', _piece: q });
      }
      return out;
    }
    var U = USES[P.id] || P.use;
    if (!U) return [];
    var it = { x: q.x + (P.use ? Math.floor((P.w - 1) / 2) : 0), y: q.y + P.d - 1, _piece: q, piece: P.id };
    Object.keys(U).forEach(function (k) { it[k] = U[k]; });
    if (P.id === 'chess_table') it.target = '/chess?theme=' + (HOMES[cur.id].theme === 'parchment' ? 'lumar' : HOMES[cur.id].ship ? 'ship' : 'arcadia');
    return [it];
  }

  // ---- doors, buying, the pieces that do something ---------------------------------------------------------
  function use(inter) {
    if (inter.type === 'home_door') return door(inter);
    var P = byId[inter.piece] || {};
    var day = Math.floor(Date.now() / 86400000);
    switch (inter.piece) {
      case 'clock':
        var t = new Date(), hh = t.getHours(), mm = ('0' + t.getMinutes()).slice(-2);
        return say('GRANDFATHER CLOCK', 'TICK... TOCK. THE HANDS SAY ' + ((hh % 12) || 12) + ':' + mm + (hh < 12 ? ' IN THE MORNING' : hh < 18 ? ' IN THE AFTERNOON' : ' AT NIGHT') +
                   '. IT HAS NEVER ONCE BEEN WRONG, WHICH IS MORE THAN YOU CAN SAY FOR THE ONE IN THE TAVERN.');
      case 'cat':
        sfx('pickup');
        return say('CAT', ['THE CAT ALLOWS ONE STROKE. THEN ANOTHER. THEN IT BITES YOU, GENTLY, TO MAKE A POINT.',
                           'IT PURRS LIKE A SMALL ENGINE AND LOOKS AT THE DOOR, AS IF EXPECTING SOMEONE ELSE.',
                           'THE CAT IS ASLEEP. IT IS ALWAYS ASLEEP WHEN YOU HAVE SOMETHING TO TELL IT.',
                           'IT HEADBUTTS YOUR HAND. FOR A MOMENT, YOU ARE THE MOST IMPORTANT PERSON IN THE WORLD.'][Math.floor(Math.random() * 4)]);
      case 'bookshelf':
        return say('BOOKSHELF', 'YOU TAKE ONE DOWN: ' + BOOKS[Math.floor(Math.random() * BOOKS.length)]);
      case 'lucky_cat':
        if ((save.lucky || 0) < day) {
          save.lucky = day; store();
          if (typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins) BridgeProgression.awardCoins(5, 'lucky_cat');
          sfx('coin');
          return say('LUCKY CAT', 'ITS PAW WAVES. UNDER IT, WHERE THERE WAS NOTHING YESTERDAY: FIVE COINS. (+5)');
        }
        return say('LUCKY CAT', 'ITS PAW WAVES, AND WAVES. TODAY\'S LUCK IS ALREADY IN YOUR POCKET. COME BACK TOMORROW.');
      case 'lemon_tree':
        return say('LEMON TREE', 'A LEMON TREE IN A POT, AGAINST ALL ADVICE. IT SMELLS LIKE SOMEWHERE WARMER.');
      case 'orrery':
        return say('BRASS ORRERY', 'YOU WIND IT. THE WORLDS GO ROUND - LUMAR, ARCADIA, THE STATION\'S GIANT - AND, AT THE MIDDLE, A LITTLE BLACK BEAD THAT NEVER MOVES.');
      case 'nebula_tank':
        return say('NEBULA TANK', 'A JAR OF SOMETHING THAT LOOKS LIKE A STORM FAR AWAY. THE LABEL SAYS "DO NOT OPEN", WHICH IS FAIR.');
      case 'desk':                                            // your journal, written up at your own desk
        if (typeof BridgeQuests !== 'undefined' && BridgeQuests.open) return BridgeQuests.open();
        return say('DESK', 'A GOOD DESK. NOTHING TO WRITE YET.');
    }
    return say((P.name || 'IT').toUpperCase(), 'IT LOOKS GOOD THERE.');
  }

  function door(inter) {
    var id = inter.homeId, H = HOMES[id];
    if (!H) return;
    if (owns(id)) { sfx('door'); return BridgeWorld.enterWorld(id, H.door.spawn); }
    BridgeInteractions.execute({ type: 'menu', label: inter.label, dialog: H.pitch + '\n\n' + H.price.toLocaleString() + ' COINS, AND IT\'S YOURS.',
      options: [{ label: 'BUY IT - ' + H.price.toLocaleString() + ' COINS', action: 'home_buy', home: id }, { label: 'NOT NOW', action: 'close' }] });
  }

  function buy(id) {
    var H = HOMES[id];
    if (!H || owns(id)) return;
    if (typeof BridgeProgression === 'undefined' || !BridgeProgression.wagerCoins) return say(H.name.toUpperCase(), 'NOBODY HERE TO TAKE YOUR COIN.');
    BridgeProgression.wagerCoins(H.price, 'home:' + id).then(function (res) {
      if (!res || !res.ok) {
        return say(H.name.toUpperCase(), res && (res.reason === 'insufficient' || res.reason === 'no_balance')
          ? 'YOU NEED ' + H.price.toLocaleString() + ' COINS. MINE, FISH, DIG, PLAY - IT\'LL STILL BE HERE.' : 'THE SALE WON\'T GO THROUGH RIGHT NOW. TRY AGAIN IN A MOMENT.');
      }
      save.owned[id] = Date.now();
      (H.gift || []).forEach(function (g) { save.have[g] = (save.have[g] || 0) + 1; });
      store();
      sfx('success');
      var w = BridgeWorld.getWorld();
      if (w) (w.interactions || []).forEach(function (i) { if (i.homeId === id) i.prompt = 'PRESS E TO GO IN'; });
      say(H.name.toUpperCase(), H.bought + '\n\nINSIDE, PRESS H TO FURNISH IT.');
    });
  }

  // ---- placement rules -------------------------------------------------------------------------------------
  var DOORISH = { enter_world: 1, leave_world: 1, password_gate: 1, home_door: 1, shuttle: 1 };
  function keepClear() {           // tiles no piece may cover: doors and round them, spawns, people, anything you use
    var d = cur.data, out = {};
    function mark(x, y) { out[x + ',' + y] = 1; }
    d.interactions.forEach(function (it) {
      if (it._piece) return;
      mark(it.x, it.y);
      if (DOORISH[it.type]) for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) mark(it.x + dx, it.y + dy);
    });
    if (d.spawns && d.spawns.player) mark(d.spawns.player[0], d.spawns.player[1]);
    if (HOMES[cur.id].door) mark(HOMES[cur.id].door.spawn[0], HOMES[cur.id].door.spawn[1]);
    ((d.scene && d.scene.actors) || []).forEach(function (a) { mark(Math.round(a.x), Math.round(a.y)); });
    if (d.shuttle && d.shuttle.spawn) mark(d.shuttle.spawn[0], d.shuttle.spawn[1]);
    return out;
  }
  function overlaps(P, x, y, Q, q) {
    return x < q.x + Q.w && q.x < x + P.w && y < q.y + Q.d && q.y < y + P.d;
  }
  // what's reachable from where you stand: open cells, and the interactions next to them
  function reach(C) {
    var d = cur.data, W = d.width, H = d.height;
    var sx = BridgeCharacter.getX(), sy = BridgeCharacter.getY(), seen = {}, q = [[sx, sy]];
    seen[sx + ',' + sy] = 1;
    while (q.length) {
      var c = q.shift();
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (s) {
        var nx = c[0] + s[0], ny = c[1] + s[1], k = nx + ',' + ny;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[k] || C[ny][nx]) return;
        seen[k] = 1; q.push([nx, ny]);
      });
    }
    var used = {};
    d.interactions.forEach(function (it, i) {
      if (it._piece) return;
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) if (seen[(it.x + dx) + ',' + (it.y + dy)]) { used[i] = 1; return; }
      // over a counter: two tiles ahead with something solid between
      [[0, 2], [0, -2], [2, 0], [-2, 0]].forEach(function (s) { if (seen[(it.x + s[0]) + ',' + (it.y + s[1])]) used[i] = 1; });
    });
    return { cells: seen, used: used };
  }
  function check(pid, x, y) {
    var P = byId[pid], d = cur.data;
    if (!P) return 'NOTHING IN HAND';
    var clear = keepClear(), px = BridgeCharacter.getX(), py = BridgeCharacter.getY();
    var cs = cells(P, x, y);
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i];
      if (c[0] < 0 || c[1] < 0 || c[0] >= d.width || c[1] >= d.height || cur.base[c[1]][c[0]]) return 'IT HAS TO GO ON THE FLOOR';
      if (clear[c[0] + ',' + c[1]]) return 'KEEP THAT CLEAR - SOMETHING THERE NEEDS THE ROOM';
      if (!P.walk && c[0] === px && c[1] === py) return 'YOU\'RE STANDING THERE';
    }
    var L = layout(cur.id);
    for (var j = 0; j < L.length; j++) {
      var Q = byId[L[j].id];
      if (Q && !!Q.walk === !!P.walk && overlaps(P, x, y, Q, L[j])) return P.walk ? 'THERE\'S A RUG THERE ALREADY' : 'SOMETHING\'S ALREADY THERE';
    }
    if (P.walk) return null;
    // nothing cut off: every cell and everything you use still reachable
    var before = reach(d.collisions);
    var C = d.collisions.map(function (r) { return r.slice(); });
    cs.forEach(function (c) { C[c[1]][c[0]] = 1; });
    var after = reach(C), k;
    for (k in before.cells) {
      var p = k.split(',');
      if (!after.cells[k] && !cs.some(function (c) { return c[0] === +p[0] && c[1] === +p[1]; })) return 'THAT WOULD BLOCK THE WAY';
    }
    for (k in before.used) if (!after.used[k]) return 'THAT WOULD BLOCK SOMETHING YOU USE';
    return null;
  }

  // ---- furnishing ------------------------------------------------------------------------------------------
  var ed = null;            // {cx, cy, held: {id, from}|null, tab, sel, msg, el}
  function canEdit() {
    var id = BridgeWorld.getWorldId && BridgeWorld.getWorldId();
    return !!(cur && cur.id === id && owns(id) && ready && (typeof BridgeState === 'undefined' || BridgeState.getState() === 'world'));
  }
  function busy() { return !!document.querySelector('.world-dialog.visible, #world-dialog, .vp-panel.visible, #inv-menu.visible, .qj.visible'); }

  function edit() {
    if (ed) return finish();
    if (!canEdit() || busy()) return;
    if (BridgeCharacter.isSeated()) BridgeCharacter.stand();
    if (typeof BridgeControls !== 'undefined') BridgeControls.disable();
    var root = document.documentElement;
    root.classList.add('home-editing');
    if (root.classList.contains('touch')) root.classList.add('keys-mode');      // the stick moves the cursor, A puts down / picks up
    var f = BridgeCharacter.getFacing(), fx = { left: -1, right: 1 }[f] || 0, fy = { up: -1, down: 1 }[f] || 0;
    ed = { cx: BridgeCharacter.getX() + fx, cy: BridgeCharacter.getY() + fy, held: null, tab: 'yours', sel: 0, msg: '' };
    tray();
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointermove', onMove, true);
    document.addEventListener('pointerdown', onDown, true);
    sfx('open');
  }
  function finish() {
    if (!ed) return;
    if (ed.held && ed.held.from) { layout(cur.id).push(entry(ed.held, ed.held.from.x, ed.held.from.y)); apply(); }
    store();
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('pointermove', onMove, true);
    document.removeEventListener('pointerdown', onDown, true);
    if (ed.el) ed.el.remove();
    ed = null;
    BridgeWorld.reserveBottom(0);
    BridgeWorld.setFocus(null);
    document.documentElement.classList.remove('keys-mode', 'home-editing');
    if (typeof BridgeControls !== 'undefined') BridgeControls.enable();
    sfx('close');
  }

  function list() {             // the tray's cards: what you own (with what's spare), or the whole catalogue
    if (ed.tab === 'shop') return pieces.slice();
    var mine = pieces.filter(function (p) { return (save.have[p.id] || 0) > 0; });
    return mine.filter(function (p) { return spare(p.id) > 0; }).concat(mine.filter(function (p) { return spare(p.id) <= 0; }));     // spare ones first
  }
  function tray() {
    var H = HOMES[cur.id];
    if (!ed.el) {
      ed.el = document.createElement('div');
      ed.el.id = 'home-tray';
      ed.el.className = 'world-dialog wd-' + H.theme + ' wd-home visible';
      (document.getElementById('world-overlay') || document.body).appendChild(ed.el);
      ed.el.addEventListener('click', onTrayClick);
    }
    var L = list();
    var want = ed.held ? ed.held.id : ed.selId, at = want ? L.map(function (p) { return p.id; }).indexOf(want) : -1;
    if (at >= 0) ed.sel = at;                       // the selection follows the piece as the list reorders
    if (ed.sel >= L.length) ed.sel = Math.max(0, L.length - 1);
    ed.selId = L[ed.sel] && L[ed.sel].id;
    var html = '<div class="wd-body"><div class="hm-head"><span class="wd-title">' + esc(ed.tab === 'shop' ? H.shop : H.name.toUpperCase()) + '</span>' +
      '<span class="hm-tabs"><button class="hm-tab' + (ed.tab === 'yours' ? ' on' : '') + '" data-tab="yours">YOURS</button>' +
      '<button class="hm-tab' + (ed.tab === 'shop' ? ' on' : '') + '" data-tab="shop">SHOP</button>' +
      '<button class="hm-tab hm-done" data-done="1">DONE</button></span></div><div class="hm-cards">';
    if (!L.length) html += '<div class="hm-empty">NOTHING YET - THE SHOP HAS EVERYTHING. (TAB)</div>';
    L.forEach(function (p, i) {
      var n = spare(p.id);
      html += '<button class="hm-card' + (i === ed.sel ? ' sel' : '') + (ed.tab === 'yours' && n <= 0 ? ' out' : '') + '" data-i="' + i + '">' +
        '<span class="hm-pic" data-p="' + p.id + '"></span><span class="hm-name">' + esc(p.name) + '</span>' +
        '<span class="hm-sub">' + (ed.tab === 'shop' ? p.price + 'c' + ((save.have[p.id] || 0) ? ' · HAVE ' + save.have[p.id] : '') : n > 0 ? n + ' SPARE' : 'ALL PLACED') + '</span></button>';
    });
    html += '</div><div class="hm-msg">' + esc(ed.msg || hintFor()) + '</div>' +
      '<div class="wd-hint hm-keys"><span class="ip-key">←↑→↓</span>Move <span class="ip-key">E</span>' + (ed.tab === 'shop' ? 'Buy' : ed.held ? 'Put down' : 'Pick up') +
      ' <span class="ip-key">X</span>Put away <span class="ip-key">Z C</span>Choose <span class="ip-key">Tab</span>' + (ed.tab === 'shop' ? 'Yours' : 'Shop') +
      ' <span class="ip-key">Esc</span>Done</div></div>';
    ed.el.innerHTML = html;
    ed.el.querySelectorAll('.hm-pic').forEach(function (s) { s.appendChild(thumb(byId[s.getAttribute('data-p')], 44)); });
    var sel = ed.el.querySelector('.hm-card.sel');
    if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    frame();
  }
  function hintFor() {
    if (ed.tab === 'shop') return 'PICK SOMETHING TO BUY - IT COMES STRAIGHT TO YOUR HANDS.';
    if (ed.held) return 'PUT THE ' + byId[ed.held.id].name.toUpperCase() + ' WHERE YOU LIKE.';
    return 'CHOOSE A PIECE BELOW, OR PICK UP ONE IN THE ROOM TO MOVE IT.';
  }
  function note(m, bad) { if (!ed) return; ed.msg = m; if (bad) sfx('error'); tray(); }
  function frame() {              // keep the room above the tray, and the cursor in view
    if (!ed) return;
    if (ed.el) BridgeWorld.reserveBottom(ed.el.offsetHeight + 16);
    if (!ed.focus || Math.abs(ed.focus.x - ed.cx) > 3 || Math.abs(ed.focus.y - ed.cy) > 2) ed.focus = { x: ed.cx, y: ed.cy };
    BridgeWorld.setFocus(ed.focus);
  }

  function choose(i) {
    var L = list();
    if (!L.length) return;
    ed.sel = (i + L.length) % L.length;
    var p = L[ed.sel];
    ed.selId = p.id;
    if (ed.tab === 'yours') {
      if (ed.held && !ed.held.from) ed.held = null;
      if (!ed.held && spare(p.id) > 0) ed.held = { id: p.id, from: null };
    }
    ed.msg = '';
    tray();
  }

  function act() {
    if (!ed) return;
    if (ed.tab === 'shop') return shopBuy(list()[ed.sel]);
    if (ed.held) {
      var why = check(ed.held.id, ed.cx, ed.cy);
      if (why) return note(why, true);
      layout(cur.id).push(entry(ed.held, ed.cx, ed.cy));
      var id = ed.held.id, fresh = !ed.held.from;
      ed.held = null;
      apply(); store(); sfx('pickup');
      if (fresh && spare(id) > 0) ed.held = { id: id, from: null };          // another of the same, ready to go
      else {                                                                   // or the next thing you have spare
        var nx = list().filter(function (p) { return spare(p.id) > 0; })[0];
        ed.selId = nx ? nx.id : id;
      }
      return note('');
    }
    var q = under(ed.cx, ed.cy);
    if (q) {
      var L = layout(cur.id);
      L.splice(L.indexOf(q), 1);
      ed.held = { id: q.id, from: { x: q.x, y: q.y }, items: q.items, fish: q.fish };   // a chest takes its things with it, a tank its fish
      apply(); sfx('pickup');
      return note('');
    }
    var p = list()[ed.sel];
    if (p && spare(p.id) > 0) { ed.held = { id: p.id, from: null }; return act(); }     // the chosen piece, straight down
    note('NOTHING THERE TO PICK UP.', true);
  }
  function putAway() {
    if (!ed) return;
    if (ed.held && full(ed.held)) return note(emptyFirst(ed.held, true), true);
    if (ed.held) { ed.held = null; store(); sfx('close'); return note('PUT AWAY. IT\'S IN YOUR TRAY WHEN YOU WANT IT.'); }
    var q = under(ed.cx, ed.cy);
    if (!q) return note('NOTHING THERE TO PUT AWAY.', true);
    if (full(q)) return note(emptyFirst(q), true);
    var L = layout(cur.id);
    L.splice(L.indexOf(q), 1);
    apply(); store(); sfx('close');
    note('PUT AWAY.');
  }
  function entry(held, x, y) {     // a layout entry for the piece in hand (a chest keeps what's in it, a tank its fish)
    var e = { id: held.id, x: x, y: y };
    if (held.items) e.items = held.items;
    if (held.fish) e.fish = held.fish;
    return e;
  }
  function under(x, y) {          // the piece on a tile; furniture before the rug it stands on
    var L = layout(cur.id), hit = null;
    for (var i = L.length - 1; i >= 0; i--) {
      var Q = byId[L[i].id];
      if (!Q || x < L[i].x || y < L[i].y || x >= L[i].x + Q.w || y >= L[i].y + Q.d) continue;
      if (!Q.walk) return L[i];
      hit = hit || L[i];
    }
    return hit;
  }

  // buy a piece from elsewhere (the Ship's Chandler, js/storage.js): it goes in your tray, to put down with H
  function buyPiece(pid) {
    var P = byId[pid];
    if (!P || typeof BridgeProgression === 'undefined' || !BridgeProgression.wagerCoins) return Promise.resolve({ ok: false, reason: 'closed' });
    return BridgeProgression.wagerCoins(P.price, 'furniture:' + pid).then(function (res) {
      if (!res || !res.ok) return { ok: false, reason: res && (res.reason === 'insufficient' || res.reason === 'no_balance') ? 'insufficient' : 'failed' };
      save.have[pid] = (save.have[pid] || 0) + 1;
      store();
      return { ok: true };
    }).catch(function () { return { ok: false, reason: 'failed' }; });
  }

  function shopBuy(p) {
    if (!p) return;
    if (typeof BridgeProgression === 'undefined' || !BridgeProgression.wagerCoins) return note('THE SHOP IS SHUT.', true);
    note('...');
    BridgeProgression.wagerCoins(p.price, 'furniture:' + p.id).then(function (res) {
      if (!ed) return;
      if (!res || !res.ok) {
        return note(res && (res.reason === 'insufficient' || res.reason === 'no_balance') ? 'THAT\'S ' + p.price + ' COINS - MORE THAN YOU HAVE.' : 'THE SHOP CAN\'T TAKE YOUR COIN RIGHT NOW.', true);
      }
      save.have[p.id] = (save.have[p.id] || 0) + 1;
      store(); sfx('coin');
      ed.tab = 'yours';
      ed.held = { id: p.id, from: null };
      note('BOUGHT. NOW PUT THE ' + p.name.toUpperCase() + ' WHERE YOU LIKE.');
    });
  }

  function move(dx, dy, pointer) {   // (the camera follows the keys' cursor, not the mouse's: it would chase it)
    var d = cur.data;
    ed.cx = Math.max(0, Math.min(d.width - 1, ed.cx + dx));
    ed.cy = Math.max(0, Math.min(d.height - 1, ed.cy + dy));
    if (ed.msg) { ed.msg = ''; tray(); }
    if (!pointer) frame();
  }

  function onKey(e) {
    if (!ed) return;
    if (/INPUT|TEXTAREA/.test((e.target && e.target.tagName) || '')) return;
    var k = e.key, used = true;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') move(0, -1);
    else if (k === 'ArrowDown' || k === 's' || k === 'S') move(0, 1);
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') move(-1, 0);
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') move(1, 0);
    else if (k === 'e' || k === 'E' || k === 'Enter' || k === ' ') act();
    else if (k === 'x' || k === 'X' || k === 'Delete' || k === 'Backspace') putAway();
    else if (k === 'z' || k === 'Z' || k === ',') choose(ed.sel - 1);
    else if (k === 'c' || k === 'C' || k === '.') choose(ed.sel + 1);
    else if (k === 'Tab') { ed.tab = ed.tab === 'shop' ? 'yours' : 'shop'; ed.sel = 0; ed.selId = null; if (ed.held && !ed.held.from) ed.held = null; note(''); }
    else if (k === 'Escape' || k === 'h' || k === 'H') finish();
    else used = /^[a-zA-Z]$/.test(k);              // swallow the rest of the letter keys (journal, inventory...) while furnishing
    if (used) { e.preventDefault(); e.stopPropagation(); }
  }
  function tileAt(e) {
    var cv = document.getElementById('bridge-canvas'), v = BridgeWorld.getScreenView();
    if (!cv || !v || !v.ts) return null;
    var r = cv.getBoundingClientRect();
    return { x: Math.floor((e.clientX - r.left - v.offX) / v.ts), y: Math.floor((e.clientY - r.top - v.offY) / v.ts) };
  }
  // the room itself, not the tray or a pill over it (the world overlay lies over the canvas)
  function onRoom(e) {
    var t = e.target;
    return t && (t.id === 'bridge-canvas' || t.id === 'world-overlay' || (t.classList && t.classList.contains('world-hud')));
  }
  function onMove(e) {
    if (!ed || e.pointerType === 'touch' || !onRoom(e)) return;
    var t = tileAt(e);
    if (t && (t.x !== ed.cx || t.y !== ed.cy)) { ed.cx = t.x; ed.cy = t.y; move(0, 0, true); }
  }
  function onDown(e) {
    if (!ed || e.button > 0 || !onRoom(e)) return;
    var t = tileAt(e);
    if (!t) return;
    e.preventDefault(); e.stopPropagation();
    ed.cx = t.x; ed.cy = t.y;
    move(0, 0, true);
    act();
  }
  function onTrayClick(e) {
    e.stopPropagation();
    var b = e.target.closest('button');
    if (!b || !ed) return;
    if (b.getAttribute('data-done')) return finish();
    var tab = b.getAttribute('data-tab');
    if (tab) { if (tab !== ed.tab) { ed.tab = tab; ed.sel = 0; ed.selId = null; if (ed.held && !ed.held.from) ed.held = null; } return note(''); }
    var i = b.getAttribute('data-i');
    if (i == null) return;
    i = +i;
    if (ed.tab === 'shop') {
      if (i === ed.sel) return shopBuy(list()[i]);      // a second tap buys
      ed.sel = i; ed.selId = list()[i].id;
      return note('TAP AGAIN TO BUY THE ' + list()[i].name.toUpperCase() + ' - ' + list()[i].price + ' COINS.');
    }
    choose(i);
  }

  // ---- drawing (every scene world; only does anything in a place of yours) -------------------------------------
  function soften(t) {          // the room's light on a piece that's lit already: its colour, not all its darkness
    var m = /rgb\((\d+),(\d+),(\d+)\)/.exec(t || '');
    if (!m) return null;
    return 'rgb(' + [m[1], m[2], m[3]].map(function (v) { return Math.min(255, Math.round(80 + 0.85 * v)); }).join(',') + ')';
  }
  function drawPiece(ctx, sc, world, P, x, y, offX, offY, ts, now, alpha, q) {
    var s = P.spr, dx = Math.round(offX + x * ts + (s.sx - s.ax)), dy = Math.round(offY + y * ts + (s.sy - s.ay));
    var foot = y + P.d - 0.04, theme = cur && HOMES[cur.id] ? HOMES[cur.id].theme : 'parchment';
    if (alpha != null) {                                   // the one in your hands while furnishing (a tank with its own fish)
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.drawImage(P.live && q ? P.live(q, now, theme) : s.img || sheet, s.sx, s.sy, s.sw, s.sh, dx, dy, s.sw, s.sh);
      ctx.restore();
      return;
    }
    var img = P.live ? P.live(q, now, theme) : sheet;      // a piece that moves: this frame of it
    var tint = soften(BridgeScene.tintAt(sc, world, x + (P.w - 1) / 2, y + P.d - 1, now));
    var shadow = P.walk ? null : { x: Math.round(offX + (x + P.w / 2) * ts), y: Math.round(offY + (y + P.d) * ts) - 5, rx: Math.round(P.w * 12), ry: 4 };
    BridgeScene.drawOccluded(ctx, sc, img, s.sx, s.sy, s.sw, s.sh, dx, dy, foot, offX, offY, tint, shadow);
    var lit = P.glow && P.glow(q, now, theme);                // its own light, added over the room's
    if (lit) BridgeScene.drawOccluded(ctx, sc, lit, s.sx, s.sy, s.sw, s.sh, dx, dy, foot, offX, offY, null, null, 'lighter');
  }
  function items(world, offX, offY, ts, now, sc) {
    if (!ready || !cur || cur.data !== world) return [];
    var out = [], seatedOn = null;
    if (BridgeCharacter.isSeated()) {
      var p = BridgeCharacter.getRenderPos(), sx = p.x + 0.5, sy = p.y + 1 - 3 / 32;
      seatedOn = { x: sx, y: sy, foot: sy };
    }
    layout(cur.id).forEach(function (q) {
      var P = byId[q.id];
      if (!P || !P.spr) return;
      var key = P.walk ? -100 + q.y : q.y + P.d - 0.04;        // rugs under everyone
      if (seatedOn && seatedOn.x >= q.x && seatedOn.x < q.x + P.w && seatedOn.y >= q.y && seatedOn.y < q.y + P.d) key = seatedOn.foot - 0.01;
      out.push({ footRow: key, draw: function (ctx) { drawPiece(ctx, sc, world, P, q.x, q.y, offX, offY, ts, now, null, q); } });
    });
    return out;
  }
  function over(ctx, world, offX, offY, ts, now) {
    pillSync();
    if (!ed || !cur || cur.data !== world) return;
    var d = cur.data, pulse = 0.5 + 0.5 * Math.sin(now / 260);
    // the floor you can furnish, faintly
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (var y = 0; y < d.height; y++) for (var x = 0; x < d.width; x++) {
      if (cur.base[y][x]) continue;
      ctx.fillRect(Math.round(offX + x * ts) + 1, Math.round(offY + y * ts) + 1, ts - 2, ts - 2);
    }
    var P = ed.held && byId[ed.held.id];
    if (P && P.spr) {
      var ok = !check(P.id, ed.cx, ed.cy);
      cells(P, ed.cx, ed.cy).forEach(function (c) {
        ctx.fillStyle = ok ? 'rgba(90,230,140,0.28)' : 'rgba(240,80,80,0.32)';
        ctx.fillRect(Math.round(offX + c[0] * ts), Math.round(offY + c[1] * ts), ts, ts);
      });
      drawPiece(ctx, null, world, P, ed.cx, ed.cy, offX, offY, ts, now, 0.55 + 0.25 * pulse, ed.held.fish ? ed.held : null);
    }
    // the cursor
    var cx = Math.round(offX + ed.cx * ts), cy = Math.round(offY + ed.cy * ts), w = (P ? P.w : 1) * ts, h = (P ? P.d : 1) * ts;
    ctx.strokeStyle = 'rgba(255,240,200,' + (0.6 + 0.4 * pulse).toFixed(2) + ')';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx + 0.5, cy + 0.5, w - 1, h - 1);
    var hov = !P && under(ed.cx, ed.cy);
    if (hov) {
      var Q = byId[hov.id];
      ctx.strokeStyle = 'rgba(255,217,138,0.9)';
      ctx.strokeRect(Math.round(offX + hov.x * ts) + 1.5, Math.round(offY + hov.y * ts) + 1.5, Q.w * ts - 3, Q.d * ts - 3);
    }
  }
  // Arcadia's skyline and rain through the apartment's strip window (scene.sky, in screen tiles)
  var skyCv = null;
  function behind(ctx, world, offX, offY, ts, now) {
    if (!cur || cur.data !== world || HOMES[cur.id].theme !== 'neon' || !world.scene || !world.scene.sky || typeof BridgeSkyline === 'undefined') return;
    var S = world.scene.sky;
    var x = Math.round(offX + S[0] * ts), y = Math.round(offY + S[1] * ts), w = Math.round((S[2] - S[0]) * ts), h = Math.round((S[3] - S[1]) * ts);
    var H = Math.max(140, h * 3);
    if (!skyCv) skyCv = document.createElement('canvas');
    if (skyCv.width !== w || skyCv.height !== H) { skyCv.width = w; skyCv.height = H; }
    var c = skyCv.getContext('2d');
    c.imageSmoothingEnabled = false;
    var real = BridgeWorld.getView;
    var vOffY = Math.round((0.55 * H - H / 2) / 0.55 + H / 2 - 6 * 32);
    BridgeWorld.getView = function () { return { offX: w / 2 - 16 * 32, offY: vOffY, ts: 32, w: w, h: H }; };
    try {
      BridgeSkyline.draw(c, w, H, now, { baseRow: 6, railRow: 7, centerCol: 16 });
      if (BridgeSkyline.rain) BridgeSkyline.rain(c, w, H, now, { drops: 40 });
    } finally { BridgeWorld.getView = real; }
    ctx.drawImage(skyCv, 0, Math.round(H * 0.42 - h / 2), w, h, x, y, w, h);
  }
  if (typeof BridgeWorld !== 'undefined') BridgeWorld.registerSceneHooks('*', { behind: behind, items: items, over: over });

  // ---- the Furnish pill and H ----------------------------------------------------------------------------------
  var pill = null, pillOn = null;
  function pillSync() {
    if (!pill) return;
    var on = canEdit() && !ed;
    if (on !== pillOn) { pillOn = on; pill.style.display = on ? 'flex' : 'none'; }
  }
  function init() {
    pill = document.createElement('button');
    pill.id = 'home-pill';
    pill.innerHTML = '<span class="ip-key">H</span> Furnish';
    pill.style.display = 'none';
    pill.addEventListener('click', function (e) { e.stopPropagation(); edit(); });
    document.body.appendChild(pill);
    if (typeof BridgeState !== 'undefined' && BridgeState.onChange) {
      BridgeState.onChange(function (s) { if (s !== 'world' && ed) finish(); pillOn = null; if (s !== 'world') pill.style.display = 'none'; });
    }
    document.addEventListener('keydown', function (e) {
      if (ed || (e.key !== 'h' && e.key !== 'H') || /INPUT|TEXTAREA/.test((e.target && e.target.tagName) || '')) return;
      if (!canEdit() || busy()) return;
      e.preventDefault();
      edit();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  return { decorate: decorate, use: use, buy: buy, edit: edit, done: finish, owns: owns, editing: function () { return !!ed; },
           reload: function () { save = load(); if (cur && ready) apply(); },      // (a partner's change: its pieces and what they do, afresh)
           pieces: function () { return pieces; }, piece: function (id) { return byId[id] || null; }, spare: spare, buyPiece: buyPiece, persist: store, add: add,
           // the piece of this kind on this spot in the place you're in, as saved now (an interaction's may be an old copy)
           at: function (pid, x, y) { return cur ? layout(cur.id).filter(function (q) { return q.id === pid && q.x === x && q.y === y; })[0] || null : null; },
           HOMES: HOMES, _save: function () { return save; }, _check: function (pid, x, y) { return check(pid, x, y); } };
})();
