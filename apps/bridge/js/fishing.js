/**
 * BridgeFishing — fishing off Lumar's piers (interactions of type 'fish',
 * added from assets/fishing.json as a world loads).
 *
 * Hold to cast (let go at the top of the swing to cast far — far casts find
 * the rarer fish), wait for the bobber to go under, strike, then reel: hold
 * to lift the catch zone, let go to drop it, and keep the fish inside it
 * until the line's full. Each spot draws from its island's pool: silverfin
 * everywhere, bluefin and rays off Sapphire, shrimp in Rose Cove, ember
 * snappers and coins from the Heron off Crimson, moon eels round Midnight —
 * and star pearls in the moon pool; perch and the odd sun carp in the farm pond
 * on Verdance, char and frostfin through the ice on Fellhaven's pond. Old boots.
 * Messages in bottles. And from a boat at sea (js/sloop.js: slow her right
 * down and cast a line): each sea's own deep water (`sea_<pal>` pools), with
 * two fish only a boat finds — the spore tuna and, deep down, the lantern angler.
 *
 * How rare a catch is (js/fishart.js TIER: common, uncommon, rare, legendary)
 * sets how it fights (FIGHTS: rarer ones bite and let go faster, and fight
 * longer and harder) and how it's shown: every catch comes up on a card — the
 * fish drawn big (BridgeFishArt), its rarity, its size, NEW if it's your first
 * — rays and sparks behind the rare ones, a fanfare for a legend. Each sea
 * has a rare fish of its own, and one legend that only ever takes a line
 * from a boat. From a boat the catch goes in her fish hold (the sloop passes
 * `hold` in: js/fleet.js counts it, js/sloop.js lands it at the next port).
 *
 * What you've caught (how many, the biggest) and the messages you've read
 * are kept in localStorage (bridge_fish) and listed in the journal.
 *
 * It happens in the world too: you turn to the water, the rod swings back as
 * you charge and the line arcs out; the bobber rides the swell where it lands,
 * ticks on a nibble, goes under on a bite, is dragged about as you reel, and
 * whatever you land comes flying in over the rail (the `items` hook on the
 * lumar, verdance and hoarfell tilesets). The panel steps to the top of the
 * screen when you're casting toward the bottom of it.
 */
var BridgeFishing = (function () {
  var KEY = 'bridge_fish';
  var POOLS = {
    harbour:  [['silverfin', 50], ['spore_minnow', 25], ['harbour_crab', 10], ['bluefin', 4], ['old_boot', 10], ['bottle', 5]],
    sapphire: [['silverfin', 30], ['bluefin', 30], ['glowtail', 10], ['sapphire_ray', 10], ['old_boot', 10], ['bottle', 10]],
    rose:     [['silverfin', 30], ['rose_shrimp', 35], ['glowtail', 15], ['coral_dragonet', 4], ['old_boot', 10], ['bottle', 10]],
    crimson:  [['ember_snapper', 35], ['silverfin', 25], ['heron_coin', 15], ['cinder_grouper', 4], ['old_boot', 15], ['bottle', 10]],
    midnight: [['glowtail', 30], ['silverfin', 25], ['moon_eel', 20], ['starfin', 4], ['old_boot', 10], ['bottle', 15]],
    moonpool: [['moon_eel', 50], ['glowtail', 35], ['star_pearl', 15]],
    pond:     [['pond_perch', 60], ['sun_carp', 12], ['old_boot', 20], ['bottle', 8]],
    ice:      [['arctic_char', 62], ['frostfin', 18], ['old_boot', 20]],
    // out at sea, from the boat: deeper water, bigger fish, each sea's rare one more often - and its legend
    sea_emerald:  [['silverfin', 30], ['spore_tuna', 22], ['bluefin', 12], ['glowtail', 10], ['jade_marlin', 7], ['lantern_angler', 3], ['old_mossback', 2.5], ['old_boot', 6], ['bottle', 8]],
    sea_sapphire: [['bluefin', 28], ['spore_tuna', 20], ['sapphire_ray', 12], ['silverfin', 14], ['glass_swordfish', 7], ['lantern_angler', 4], ['crownfin', 2.5], ['old_boot', 5], ['bottle', 8]],
    sea_rose:     [['rose_shrimp', 24], ['spore_tuna', 18], ['glowtail', 18], ['silverfin', 14], ['coral_dragonet', 8], ['lantern_angler', 4], ['dawnveil', 2.5], ['old_boot', 5], ['bottle', 9]],
    sea_crimson:  [['ember_snapper', 32], ['spore_tuna', 14], ['silverfin', 14], ['heron_coin', 9], ['cinder_grouper', 9], ['lantern_angler', 6], ['emberjaw', 2.5], ['old_boot', 6], ['bottle', 9]],
    sea_midnight: [['moon_eel', 26], ['glowtail', 22], ['lantern_angler', 13], ['starfin', 8], ['silverfin', 10], ['nightglass', 2.5], ['old_boot', 7], ['bottle', 11]]
  };
  // how each rarity fights (js/fishart.js TIER): the catch zone's height, how fast the line comes in and pays out,
  // where it starts, how long you've got to strike. Tuned against a simulated player with a fair reaction time:
  // commons always land, a rare one about half the time, a legend is a long fight you'll lose as often as not.
  var FIGHTS = [
    { zone: 0.32, gain: 0.4, drain: 1, start: 0.32, strike: 850 },
    { zone: 0.31, gain: 0.38, drain: 1, start: 0.32, strike: 800 },
    { zone: 0.31, gain: 0.32, drain: 0.9, start: 0.3, strike: 700 },
    { zone: 0.3, gain: 0.22, drain: 0.65, start: 0.3, strike: 640 }
  ];
  function tierOf(id) { return typeof BridgeFishArt !== 'undefined' ? BridgeFishArt.tier(id) : 0; }
  var JUNK = ['old_boot', 'heron_coin', 'star_pearl', 'bottle'];        // not fish: no sizes, no records, never in the fish hold
  // how each one fights on the line: speed it darts, how wild, the sizes it comes in (cm)
  var FIGHT = {
    silverfin: [0.8, 0.25, 18, 34], spore_minnow: [1.1, 0.4, 6, 12], harbour_crab: [0.5, 0.15, 10, 22],
    rose_shrimp: [1.0, 0.35, 8, 16], bluefin: [1.3, 0.45, 40, 90], glowtail: [1.2, 0.6, 20, 40],
    ember_snapper: [1.1, 0.4, 30, 60], sapphire_ray: [1.25, 0.5, 50, 110], moon_eel: [1.6, 0.7, 60, 140],
    star_pearl: [1.6, 0.8, 1, 2],
    coral_dragonet: [1.55, 0.85, 8, 18], cinder_grouper: [1.35, 0.6, 60, 150], starfin: [1.65, 0.8, 30, 60], jade_marlin: [1.7, 0.7, 150, 320],
    glass_swordfish: [1.65, 0.75, 140, 300], old_mossback: [1.45, 0.75, 240, 310], dawnveil: [1.5, 0.85, 280, 360], emberjaw: [1.6, 0.85, 160, 210],
    crownfin: [1.55, 0.8, 300, 380], nightglass: [1.5, 0.95, 180, 230], pond_perch: [0.7, 0.25, 12, 28], sun_carp: [1.2, 0.55, 30, 70], arctic_char: [0.9, 0.35, 25, 60], frostfin: [1.4, 0.6, 8, 16], spore_tuna: [1.4, 0.5, 60, 140], lantern_angler: [1.5, 0.75, 30, 70], old_boot: [0.25, 0.0, 26, 31], heron_coin: [0.3, 0.05, 3, 4], bottle: [0.35, 0.05, 20, 30]
  };
  var BOTTLES = [
    "IF YOU FIND THIS, I AM STILL ON THE STACK OFF CRIMSON. BRING ROPE. - H.M.",
    "TO WHOEVER IS LISTENING AT THE MOON POOL: WE HEAR YOU TOO.",
    "GRAN WILDE'S FISH PIE: FISH. PIE. TELL NOBODY.",
    "DAY FORTY ON THE ROCK. THE CRAB AND I HAVE COME TO AN UNDERSTANDING.",
    "E.B. WAS HERE. THE SEA WAS GREEN AND I WAS NOT AFRAID.",
    "WHOEVER TOOK MY BOOT: I HAVE THE OTHER ONE. WE CAN WORK SOMETHING OUT.",
    "THE DRAGON IS NOT ANGRY. THE DRAGON IS WAITING. THERE IS A DIFFERENCE.",
    "IF THE SPORES GLOW BRIGHTER TONIGHT, SOMETHING IS COMING UP FROM THE DEEP. GO INSIDE.",
    "THE ROSE COVE WINDMILL CHIMES IN A PATTERN. IT ISN'T RANDOM. IT'S A NAME.",
    "I THREW THIS IN THE SEA AT ARCADIA. HOW DID IT GET HERE?",
    "BRAM - I'LL COME BACK FOR YOU. KEEP THE CORNER WARM. - E.",
    "THE SEA REMEMBERS EVERY SHIP THAT CROSSES IT. SOME NIGHTS IT SAYS THEIR NAMES."
  ];

  var log = { caught: {}, bottles: [], casts: 0 };
  try { log = Object.assign(log, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* fresh */ }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(log)); } catch (e) { /* private mode */ } }

  var spots = null;
  fetch('/bridge/assets/fishing.json?v=' + Date.now()).then(function (r) { return r.json(); })
    .then(function (d) { spots = d; }).catch(function () { spots = {}; });

  // fishing spots join the world's interactions as it loads
  function decorate(worldId, data) {
    (spots && spots[worldId] || []).forEach(function (s) {
      data.interactions.push({ x: s.x, y: s.y, type: 'fish', label: s.label || 'OFF THE PIER', prompt: 'PRESS E TO FISH', pool: s.pool });
    });
  }

  // ---- the panel -----------------------------------------------------------------------------------
  // A little pixel scene of the water, side on: the pier (or the boat's rail, or the ice) at the left, your rod over
  // it, the bobber out on the surface, the hook below it, and fish shadows going about their business — one of them
  // comes for your hook before it bites (a bigger shadow for a rarer fish). Drawn at NW × NH native pixels and shown
  // at a whole multiple, like the world. The water takes the colour of the sea you're fishing.
  var el = null, cv = null, ctx = null, raf = 0, st = null, held = false, keyDown = false;
  var NW = 210, NH = 76, SURF = 26;                              // native size; the water's surface row
  var PERFECT_CAST = 0.88;                                       // let go above this on the swing: a perfect cast
  var buf = null, bctx = null, bgKey = '', bg = null;

  var WATER = {                                                  // the water by where you are: four depths, the surface, glints
    emerald:  { w: ['#1a5a48', '#12443a', '#0a2c26', '#041612'], s: '#4ab08a', g: '#78f4c8' },
    sapphire: { w: ['#1a3a6a', '#132c54', '#0b1c3a', '#050e20'], s: '#4a7ad0', g: '#9ad0ff' },
    rose:     { w: ['#5a2a5a', '#46204a', '#2e1434', '#18081c'], s: '#b06ab0', g: '#ffb0ec' },
    crimson:  { w: ['#5a1a1e', '#461418', '#2e0c10', '#160406'], s: '#b04a3a', g: '#ffb488' },
    midnight: { w: ['#262850', '#1c1c3e', '#12122c', '#08081a'], s: '#6060b0', g: '#c8c0ff' },
    moonpool: { w: ['#2e3e62', '#223252', '#16223c', '#0a1222'], s: '#a8b8e8', g: '#f4f4ff' },
    pond:     { w: ['#3a7a70', '#2e655c', '#22504a', '#183a34'], s: '#8ad0c0', g: '#fffbe0', day: true },
    ice:      { w: ['#1e4a6a', '#163a58', '#0e2a44', '#081a2e'], s: '#a8d4ea', g: '#e8f8ff', ice: true }
  };
  var POOL_SEA = { harbour: 'emerald', sea_emerald: 'emerald', sapphire: 'sapphire', sea_sapphire: 'sapphire', rose: 'rose', sea_rose: 'rose',
                   crimson: 'crimson', sea_crimson: 'crimson', midnight: 'midnight', sea_midnight: 'midnight', moonpool: 'moonpool', pond: 'pond', ice: 'ice' };
  function look() { return WATER[POOL_SEA[st.pool] || 'emerald']; }
  var TIER_COL = ['#e8e0c0', '#80c8ff', '#d8a0ff', '#ffd060'];

  function name(id) {
    if (id === 'bottle') return 'Message in a bottle';
    var it = typeof BridgeItems !== 'undefined' && BridgeItems.get(id);
    return it ? it.name : id;
  }

  function pick(pool, power) {
    var lucky = typeof BridgeInventory !== 'undefined' && BridgeInventory.getCount && BridgeInventory.getCount('lucky_horseshoe') > 0;
    var sky = typeof BridgeWeather !== 'undefined' && BridgeWeather.fishLuck ? BridgeWeather.fishLuck(pool) : 1;   // they bite in the rain and the storm
    var list = (POOLS[pool] || POOLS.harbour).map(function (e) {
      var rare = tierOf(e[0]) >= 2;
      return [e[0], e[1] * (rare && power > 0.7 ? 1.6 : 1) * (rare && lucky ? 1.2 : 1) * (rare && rod() ? 1.1 : 1) * (rare ? sky : 1)];
    });
    var total = list.reduce(function (a, e) { return a + e[1]; }, 0), r = Math.random() * total;
    for (var i = 0; i < list.length; i++) { r -= list[i][1]; if (r <= 0) return list[i][0]; }
    return list[0][0];
  }
  function sfx(n) { if (n && typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }
  // the greenheart rod (made at your workshop, js/workshop.js), carried: a quicker bite, more room on the reel
  function rod() { return typeof BridgeInventory !== 'undefined' && BridgeInventory.getCount && BridgeInventory.getCount('greenheart_rod') > 0; }
  function touch() { return document.documentElement.classList.contains('touch'); }

  function set(phase, extra) {
    st.phase = phase; st.t0 = performance.now();
    sfx({ wait: 'splash', bite: 'plop', caught: 'catch', lost: 'fail' }[phase]);
    if (extra) Object.keys(extra).forEach(function (k) { st[k] = extra[k]; });
    var big = st.catchId && phase !== 'wait' ? tierOf(st.catchId) : 0, k = touch() ? '' : 'Space ';
    var hint = { ready: touch() ? 'Hold to cast · let go in the gold' : 'Hold Space to cast · let go in the gold', charge: 'Let go…',
                 wait: 'Wait for a bite - don\'t strike early', bite: big >= 3 ? 'STRIKE! It\'s enormous!' : big >= 2 ? 'Strike! Something big!' : 'Strike!',
                 reel: big >= 3 ? 'A monster - hold ' + k + 'to lift the bar, keep the fish in it' : 'Hold ' + k + 'to lift the bar · keep the fish in it',
                 caught: (touch() ? 'Hold' : 'Hold Space') + ' to cast again · Esc to stop', lost: (touch() ? 'Hold' : 'Hold Space') + ' to cast again · Esc to stop' }[phase] || '';
    el.querySelector('.fi-hint').textContent = hint;
  }
  // a word that pops up over the water: PERFECT CAST, TREASURE, TOO SOON…
  function pop(text, kind) {
    var p = document.createElement('div');
    p.className = 'fi-pop' + (kind ? ' fi-pop-' + kind : '');
    p.textContent = text;
    el.appendChild(p);
    setTimeout(function () { p.remove(); }, 1300);
  }

  function press() {
    held = true;
    if (!st || card) return;
    if (st.phase === 'ready' || ((st.phase === 'caught' || st.phase === 'lost') && performance.now() > (st.calm || 0))) set('charge');
    else if (st.phase === 'bite') hook();
    else if (st.phase === 'wait' && performance.now() - st.t0 > 500) { pop('TOO SOON', 'bad'); set('lost', { msg: 'Too soon - you pulled it out of the water.', snap: false }); }
  }

  function release() {
    held = false;
    if (st && st.phase === 'charge') {
      var t = (performance.now() - st.t0) / 1200;
      var power = 1 - Math.abs((t % 2) - 1);              // the swing goes up and down; let go near the top
      var perfect = power >= PERFECT_CAST;
      if (perfect) { power = 1; pop('PERFECT CAST!', 'good'); sfx('blip'); }
      log.casts += 1; store();
      if (fishes[0]) { fishes[0].s = 3 + Math.floor(Math.random() * 3); fishes[0].x = Math.random() < 0.5 ? -10 : NW + 10; }   // a new one to come for it
      var lucky = typeof BridgeInventory !== 'undefined' && BridgeInventory.getCount && BridgeInventory.getCount('lucky_horseshoe') > 0;
      var wait = (1500 + Math.random() * 3500) * (lucky ? 0.6 : 1) * (rod() ? 0.85 : 1) * (perfect ? 0.8 : 1);   // the horseshoe (and the rod): they bite sooner
      // what takes the hook is decided as it lands (so its shadow can come for it, bigger for a rarer fish)
      set('wait', { power: power, perfect: perfect, wait: wait, nibbles: [], catchId: pick(st.pool, power), treasure: null, snap: false, hooked: false });
      var n = Math.floor(Math.random() * 3);
      for (var i = 0; i < n; i++) st.nibbles.push(500 + Math.random() * (st.wait - 900));
    }
  }

  function hook() {
    var id = st.catchId || pick(st.pool, st.power), f = FIGHT[id] || FIGHT.silverfin, F = FIGHTS[tierOf(id)];
    var fast = performance.now() - st.t0 < st.window * 0.45;      // struck the instant it went under: a perfect hook
    if (fast) { pop('PERFECT HOOK!', 'good'); sfx('blip'); }
    // now and then something else is down there too: a chest, drifting in the reel - hold the bar on it to bring it up
    var lucky = typeof BridgeInventory !== 'undefined' && BridgeInventory.getCount && BridgeInventory.getCount('lucky_horseshoe') > 0;
    var chest = Math.random() < 0.1 + 0.1 * (st.power || 0) + (lucky ? 0.05 : 0) ? { at: 1200 + Math.random() * 2200, y: 0.15 + Math.random() * 0.65, got: 0, done: false, shown: false } : null;
    set('reel', { catchId: id, fight: f, tune: F, zoneH: F.zone * (rod() ? 1.12 : 1), zone: 0.1, zv: 0, fish: 0.5, ft: 0.5, progress: Math.min(0.6, F.start + (fast ? 0.12 : 0)),
                  last: performance.now(), treasure: chest, hooked: true, out: 0 });
  }

  // what a chest holds: coins mostly, sea glass, silver from the Heron, now and then a pearl
  function openChest() {
    var r = Math.random(), it = null, n = 1, coins = 0;
    if (r < 0.4) coins = 20 + Math.floor(Math.random() * 41);
    else if (r < 0.65) { it = 'sea_glass'; n = 1 + Math.floor(Math.random() * 3); }
    else if (r < 0.8) { it = 'silver_nail'; n = 1 + Math.floor(Math.random() * 2); }
    else if (r < 0.93) it = 'heron_coin';
    else it = 'star_pearl';
    var plan = typeof BridgeWorkshop !== 'undefined' && BridgeWorkshop.chestFind ? BridgeWorkshop.chestFind() : null;   // a rod-maker's plan, in an oilskin tube
    if (plan) { it = plan; n = 1; coins = 0; }
    if (it && typeof BridgeInventory !== 'undefined' && BridgeInventory.addItem(it, n) === false) {   // no room: what it's worth instead
      var v = (BridgeItems.get(it) || {}).value || 10;
      coins = v * n; it = null;
    }
    if (coins && typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins) BridgeProgression.awardCoins(coins, 'fishing:treasure');
    return it ? n + ' × ' + name(it) : coins + ' coins';
  }

  function land() {
    var id = st.catchId, f = st.fight, tier = tierOf(id), junk = JUNK.indexOf(id) >= 0;
    var size = Math.round(f[2] + Math.pow(Math.random(), 1.6) * (f[3] - f[2]));
    var msg, first = false, best = false, where = '';
    if (id === 'bottle') {
      var unread = BOTTLES.map(function (b, i) { return i; }).filter(function (i) { return log.bottles.indexOf(i) < 0; });
      var k = unread.length ? unread[Math.floor(Math.random() * unread.length)] : Math.floor(Math.random() * BOTTLES.length);
      first = log.bottles.indexOf(k) < 0;
      if (first) log.bottles.push(k);
      msg = '“' + BOTTLES[k] + '”';
    } else {
      var c = log.caught[id] || (log.caught[id] = { n: 0, best: 0 });
      first = c.n === 0;
      c.n += 1;
      best = !junk && size > c.best;
      if (best) c.best = size;
      var hold = st.hold && !junk ? st.hold : null;                       // at sea, fish go in her fish hold
      if (hold) {
        if (hold.room()) { hold.put(id); var hc = hold.count(); where = 'Into the fish hold · ' + hc[0] + ' / ' + hc[1]; }
        else where = 'The fish hold\'s full - you let it go';
      } else {
        var kept = typeof BridgeInventory !== 'undefined' ? BridgeInventory.addItem(id, 1) : true;
        if (kept === false && BridgeInventory.offer && !st.boat) { st.makeRoom = id; where = 'Your pack is full - make room for it'; }   // put the card away: the swap
        else where = kept === false ? 'No room in your pack, so you let it go' : 'Into your pack';
      }
      msg = (junk ? '' : size + ' cm' + (best && c.n > 1 ? ' - your biggest yet! ' : '. ')) + where + '.';
    }
    var chest = st.treasure && st.treasure.done ? openChest() : null;
    store();
    set('caught', { result: id, msg: msg, leapTier: tier });
    reveal({ id: id, tier: tier, size: junk ? 0 : size, best: best && !first, first: first, where: where, quote: id === 'bottle' ? msg : null, chest: chest });
  }

  // ---- the catch, up on a card: the fish drawn big, its rarity, its size, NEW the first time -------------------------
  // It takes no notice of keys or taps for a while (longer for the rare ones), and pressing during that only makes it
  // wait longer — someone still hammering the reel keeps it up until they stop; then a fresh press puts it away.
  var card = null, cardTimer = 0, LOCK = [1400, 1700, 2300, 3000], STAY = [3000, 3500, 5000, 7000];   // STAY: how long it stays once it's ready
  function hush(c) { c.lockUntil = Math.max(c.lockUntil, performance.now() + 600); c.armed = false; }   // a press too soon: wait on
  function reveal(o) {
    hideCard(true);
    var T = typeof BridgeFishArt !== 'undefined' ? BridgeFishArt.TIERS[o.tier] : { name: '', col: '#e8dcc4' };
    var it = typeof BridgeItems !== 'undefined' && BridgeItems.get(o.id);
    card = document.createElement('div');
    card.id = 'fish-reveal';
    card.className = 'fr-tier-' + o.tier;
    card.style.setProperty('--fr', T.col);
    card.style.setProperty('--fr-a', rgba(T.col, 0.35));
    card.innerHTML = '<div class="fr-burst"></div><div class="fr-card">' + (o.first ? '<div class="fr-new">NEW!</div>' : '') +
      '<div class="fr-art"></div><div class="fr-tier"></div><div class="fr-name"></div><div class="fr-size"></div><div class="fr-where"></div>' +
      (o.chest ? '<div class="fr-chest"></div>' : '') + '<div class="fr-go"></div></div>';
    var art = card.querySelector('.fr-art'), cv2 = typeof BridgeFishArt !== 'undefined' && BridgeFishArt.canvas(o.id, 48, 24, 5);
    if (cv2) art.appendChild(cv2);
    else {                                                             // crabs, boots, coins, pearls, bottles: their own icon, big
      var ic = document.createElement('canvas'); ic.width = 96; ic.height = 96; ic.className = 'fr-icon';
      var ix = ic.getContext('2d'); ix.imageSmoothingEnabled = false;
      if (it && it.draw) it.draw(ix, 0, 0, 96);
      else { ix.fillStyle = '#4aa880'; ix.fillRect(36, 16, 24, 64); ix.fillStyle = '#e8e0c8'; ix.fillRect(40, 28, 16, 28); ix.fillStyle = '#8a6a40'; ix.fillRect(42, 8, 12, 10); }
      art.appendChild(ic);
    }
    card.querySelector('.fr-tier').textContent = o.id === 'bottle' ? 'Flotsam' : T.name;
    card.querySelector('.fr-name').textContent = name(o.id);
    card.querySelector('.fr-size').textContent = o.quote || (o.size ? o.size + ' cm' + (o.best ? ' · your biggest yet!' : '') : '');
    var worth = it && it.value > 1 && o.id !== 'old_boot' && !/let it go|make room/.test(o.where) ? 'worth about ' + it.value : '';
    card.querySelector('.fr-where').textContent = [o.where, worth].filter(Boolean).join(' · ');
    if (o.chest) card.querySelector('.fr-chest').textContent = 'And a chest from the deep: ' + o.chest;
    card.querySelector('.fr-go').textContent = touch() ? 'Tap to carry on' : 'Space · carry on';
    if (o.tier >= 2) {                                                 // sparks flying off it
      var fc = card.querySelector('.fr-card');
      for (var i = 0; i < (o.tier >= 3 ? 26 : 12); i++) {
        var sp = document.createElement('span'), a = Math.random() * Math.PI * 2, r = 90 + Math.random() * (o.tier >= 3 ? 190 : 120);
        sp.className = 'fr-spark';
        sp.style.left = (40 + Math.random() * 20) + '%'; sp.style.top = (30 + Math.random() * 20) + '%';
        sp.style.setProperty('--dx', Math.round(Math.cos(a) * r) + 'px'); sp.style.setProperty('--dy', Math.round(Math.sin(a) * r) + 'px');
        sp.style.animationDelay = (0.15 + Math.random() * (o.tier >= 3 ? 0.9 : 0.4)).toFixed(2) + 's';
        fc.appendChild(sp);
      }
    }
    if (o.tier >= 3) { var fl = document.createElement('div'); fl.className = 'fr-flash'; card.appendChild(fl); }
    var c0 = card;
    c0.lockUntil = performance.now() + (LOCK[o.tier] || 900);
    c0.armed = false;
    card.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); if (c0.classList.contains('fr-ready')) hideCard(); else hush(c0); });
    document.body.appendChild(card);
    sfx(o.tier >= 3 ? 'fanfare' : o.tier >= 2 ? 'rarecatch' : o.first ? 'success' : null);
    if (o.chest) setTimeout(function () { sfx('coin'); }, 500);
    clearTimeout(cardTimer);
    c0.tier = o.tier;                                              // (it goes by itself a while after it's ready - frame())
  }
  function hideCard(now) {
    clearTimeout(cardTimer);
    var c = card; card = null;
    if (!c) return;
    if (st) st.calm = performance.now() + 300;                     // the next cast waits a moment, for a fresh press
    if (st && st.makeRoom && !now) {                                // a catch your pack couldn't take: put the rod down, make room
      var id = st.makeRoom; st.makeRoom = null;
      close();
      BridgeInventory.offer(id, 1, { title: 'You caught it - but your pack is full',
        onTake: function () { sfx('pickup'); }, onDecline: function () { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast('Let go', name(id), 'Back into the water it goes', false); } });
    }
    if (now) { c.remove(); return; }
    c.classList.add('fr-out');
    setTimeout(function () { c.remove(); }, 320);
  }
  function rgba(hex, a) { var p = parseInt(hex.slice(1), 16); return 'rgba(' + ((p >> 16) & 255) + ',' + ((p >> 8) & 255) + ',' + (p & 255) + ',' + a + ')'; }

  // ---- each frame: the fight ----------------------------------------------------------------------------------------
  var fishes = [];                                               // shadows going about their business under the water
  function frame(now) {
    if (!st) return;
    var dt = Math.min(0.05, (now - (st.lastFrame || now)) / 1000);
    st.lastFrame = now;
    var e = now - st.t0;
    if (st.phase === 'wait') {
      if (e > st.wait) set('bite', { window: FIGHTS[tierOf(st.catchId)].strike });
    } else if (st.phase === 'bite') {
      if (e > st.window) { pop('IT GOT AWAY', 'bad'); set('lost', { msg: 'Too slow - it spat the hook.', snap: false }); }
    } else if (st.phase === 'reel') {
      var f = st.fight;
      // the fish darts toward a target that keeps moving
      if (Math.random() < dt * (0.6 + f[1] * 3)) st.ft = Math.max(0.05, Math.min(0.95, st.ft + (Math.random() - 0.5) * (0.4 + f[1])));
      st.fish += (st.ft - st.fish) * Math.min(1, dt * f[0] * 2.2);
      // tuned for a calm game: commons nearly always land, moon eels and pearls make you work
      st.zv += (held ? 1.6 : -1.4) * dt;
      st.zv = Math.max(-0.8, Math.min(0.8, st.zv));
      st.zone += st.zv * dt;
      if (st.zone < 0) { st.zone = 0; st.zv = Math.max(0, -st.zv * 0.3); }
      var Z = st.zoneH, T = st.tune;
      if (st.zone > 1 - Z) { st.zone = 1 - Z; st.zv = Math.min(0, -st.zv * 0.3); }
      var inside = st.fish >= st.zone && st.fish <= st.zone + Z;
      st.inside = inside;
      st.out = inside ? 0 : st.out + dt;
      st.progress += (inside ? T.gain : -0.2 * (0.6 + f[0] * 0.4) * T.drain) * dt;
      if (inside && Math.random() < dt * 6) sfx('click');            // the reel ticking in
      var tr = st.treasure;
      if (tr && !tr.done && e > tr.at) {
        if (!tr.shown) { tr.shown = true; pop('A CHEST!', 'gold'); }
        if (tr.y >= st.zone && tr.y <= st.zone + Z) { tr.got += dt / 1.4; if (tr.got >= 1) { tr.done = true; pop('TREASURE!', 'gold'); sfx('coin'); } }
      }
      if (st.progress >= 1) land();
      else if (st.progress <= 0) { pop('SNAP!', 'bad'); set('lost', { msg: 'The line snaps.', snap: true }); }
    }
    if (card && !card.classList.contains('fr-ready') && now >= card.lockUntil) {
      card.classList.add('fr-ready'); if (!keyDown) card.armed = true;
      clearTimeout(cardTimer); cardTimer = setTimeout(hideCard, STAY[card.tier] || 3000);
    }
    swim(dt, now);
    draw(now);
    raf = requestAnimationFrame(frame);
  }
  function swim(dt, now) {
    if (!fishes.length) for (var i = 0; i < 5; i++) fishes.push({ x: Math.random() * NW, y: SURF + 12 + Math.random() * (NH - SURF - 18), v: (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 6), s: 3 + Math.floor(Math.random() * 3) });
    var hk = hookAt(now), taker = st.phase === 'wait' && now - st.t0 > st.wait - 1400 ? fishes[0] : null;
    fishes.forEach(function (f, i) {
      if (f === taker) {                                            // the one that wants your bait: it comes in, slows, noses it
        var tx = hk.x - (f.v > 0 ? f.s + 3 : -(f.s + 3)), ty = hk.y + 1;
        f.x += (tx - f.x) * Math.min(1, dt * 1.6); f.y += (ty - f.y) * Math.min(1, dt * 1.6);
        f.s = 3 + tierOf(st.catchId) * 2;
        f.v = (hk.x - f.x) >= 0 ? Math.abs(f.v) : -Math.abs(f.v);
        return;
      }
      if (onLine() && i === 0) return;                                            // it's at your hook, or on your line
      f.x += f.v * dt;
      f.y += Math.sin(now / 900 + i * 2) * dt * 2;
      if (f.x < -12) f.x = NW + 10; if (f.x > NW + 12) f.x = -10;
    });
  }
  // where things are on the panel: the bobber (out along the cast, then reeled in), the hook below it
  function bobberX() {
    var bx = 64 + (st.power != null ? st.power : 0.5) * 104;
    if (st.phase === 'reel') bx -= (bx - 46) * st.progress * 0.7;
    return bx;
  }
  function onLine() { return st.phase === 'bite' || st.phase === 'reel' || st.phase === 'caught'; }
  function hookAt(now) { var bx = bobberX(); return { x: bx, y: SURF + 14 + Math.round((st.power || 0.5) * 8) }; }

  // ---- drawing (native pixels) ---------------------------------------------------------------------------------------
  function P(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); }
  function line(c, x0, y0, x1, y1, col) {                         // a one-pixel line, stepped
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
    c.fillStyle = col;
    for (var n = 0; n < 400; n++) {
      c.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  function sag(c, x0, y0, x1, y1, drop, col) {                    // a line that hangs between two points
    var px = x0, py = y0;
    for (var i = 1; i <= 12; i++) {
      var t = i / 12, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t + Math.sin(Math.PI * t) * drop;
      line(c, px, py, x, y, col); px = x; py = y;
    }
  }
  function dither(c, x, y, w, h, a, b2, k) {                       // two colours, ordered-dithered k (0..1) toward b2
    var M = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) {
      c.fillStyle = (M[(yy % 4) * 4 + (xx % 4)] + 0.5) / 16 < k ? b2 : a;
      c.fillRect(x + xx, y + yy, 1, 1);
    }
  }
  // the still part: sky, water by depth, the pier or the boat or the ice — made once per place
  function background(L) {
    var key = (POOL_SEA[st.pool] || 'emerald') + (st.boat ? 'b' : '');
    if (bg && bgKey === key) return bg;
    bgKey = key; bg = document.createElement('canvas'); bg.width = NW; bg.height = NH;
    var c = bg.getContext('2d');
    // above the water
    if (L.ice) { P(c, 0, 0, NW, SURF, '#cfe4f2'); dither(c, 0, SURF - 6, NW, 6, '#cfe4f2', '#9cc0da', 0.5); P(c, 0, SURF - 1, NW, 1, '#7aa4c4'); }
    else if (L.day) { P(c, 0, 0, NW, SURF, '#9ccfe6'); dither(c, 0, 10, NW, SURF - 10, '#9ccfe6', '#c6e6f0', 0.5); }
    else { P(c, 0, 0, NW, SURF, '#070c16'); dither(c, 0, 12, NW, SURF - 12, '#070c16', '#0e1830', 0.5);
      for (var s = 0; s < 22; s++) P(c, (s * 53 + 7) % NW, (s * 29) % (SURF - 6), 1, 1, s % 4 ? 'rgba(200,230,255,0.5)' : 'rgba(255,240,200,0.8)'); }
    // the water, darkening with depth
    var bands = L.w, h = NH - SURF, band = Math.ceil(h / 4);
    for (var i = 0; i < 4; i++) {
      var y0 = SURF + i * band, hh = Math.min(band, NH - y0);
      P(c, 0, y0, NW, hh, bands[i]);
      if (i < 3) dither(c, 0, y0 + hh - 3, NW, 3, bands[i], bands[i + 1], 0.5);
    }
    // the bed, far down: a few stones and weed
    for (var k = 0; k < 9; k++) { var wx = (k * 37 + 11) % NW; P(c, wx, NH - 3, 4 + k % 3, 3, 'rgba(0,0,0,0.35)'); if (k % 2) for (var j = 0; j < 5; j++) P(c, wx + 1 + (j % 2), NH - 4 - j, 1, 1, 'rgba(40,90,60,0.6)'); }
    // what you're standing on
    if (st.boat) {                                                  // her rail and topsides, curving down into the water
      for (var y = 10; y < SURF + 6; y++) { var hw = 16 - Math.round(Math.pow((y - 10) / (SURF - 4), 2) * 8); P(c, 0, y, hw, 1, y < 13 ? '#7a4e22' : (y % 4 ? '#4a2e14' : '#3a2410')); }
      P(c, 0, 9, 17, 2, '#a07040');
    } else if (L.ice) {                                             // the hole in the ice, and you on the lip of it
      P(c, 0, SURF - 6, 30, 6, '#e8f4fc');
    } else {                                                        // the pier: planks, posts down into the water
      var wood = L.day ? ['#9a7a4e', '#7a5a38', '#5a3e22'] : ['#6a4422', '#4a2e14', '#2a1808'];
      P(c, 0, 16, 34, 3, wood[0]); P(c, 0, 19, 34, 2, wood[1]); P(c, 0, 21, 34, 1, wood[2]);
      [4, 18, 30].forEach(function (x) { P(c, x, 22, 3, NH - 22, wood[2]); P(c, x, 22, 1, NH - 22, wood[1]); });
    }
    return bg;
  }

  function draw(now) {
    var L = look();
    if (!buf) { buf = document.createElement('canvas'); buf.width = NW; buf.height = NH; bctx = buf.getContext('2d'); }
    var c = bctx, ph = st.phase, e = now - st.t0;
    c.drawImage(background(L), 0, 0);
    // light on the water: the surface line breaking up, glints, rays in the day
    for (var x = 0; x < NW; x += 2) {
      var w = Math.sin(x / 9 + now / 600) + Math.sin(x / 4 - now / 900) * 0.5;
      P(c, x, SURF + (w > 0.9 ? -1 : 0), 2, 1, L.s);
    }
    for (var g = 0; g < 10; g++) {
      var gx = (g * 47 + now * 0.004 * (1 + g % 3)) % NW, gy = SURF + 2 + (g * 13) % 30, on = Math.sin(now / 500 + g * 1.7) > 0.4;
      if (on) P(c, gx, gy, 1, 1, L.g);
    }
    if (L.day) for (var r2 = 0; r2 < 4; r2++) { c.fillStyle = 'rgba(255,250,220,0.06)'; c.beginPath(); var rx = 40 + r2 * 48 + Math.sin(now / 3000 + r2) * 6; c.moveTo(rx, SURF); c.lineTo(rx + 8, SURF); c.lineTo(rx + 26, NH); c.lineTo(rx + 14, NH); c.fill(); }
    // the fish shadows
    var hk = hookAt(now);
    fishes.forEach(function (f, i) {
      if (onLine() && i === 0) return;
      shadow(c, f.x, f.y, f.s, f.v > 0 ? 1 : -1, 'rgba(0,0,0,0.42)');
    });
    // the rod: over your shoulder as you charge, out over the water, bent while you reel
    var base = st.boat ? [10, 12] : L.ice ? [12, SURF - 7] : [12, 14], tip;
    if (ph === 'charge') { var p = 1 - Math.abs(((e / 1200) % 2) - 1); tip = [base[0] - 4 - p * 6, base[1] - 10 - p * 3]; }
    else if (ph === 'reel') { var bend = Math.sin(now / 50) * (st.inside ? 1 : 2); tip = [base[0] + 18, base[1] - 4 + st.progress * 2 + bend]; }
    else tip = [base[0] + 20, base[1] - 10];
    line(c, base[0], base[1], tip[0], tip[1], '#4a2e14'); line(c, base[0], base[1] - 1, (base[0] + tip[0]) / 2, (base[1] + tip[1]) / 2 - 1, '#c89058');
    P(c, base[0] + (tip[0] - base[0]) * 0.2 - 1, base[1] + (tip[1] - base[1]) * 0.2 - 1, 2, 2, '#c8c0b0');
    // the cast: the swing gauge, with the gold where a perfect cast lies
    if (ph === 'charge') {
      var pw = 1 - Math.abs(((e / 1200) % 2) - 1), gx0 = 40, gy0 = 6, gw = 70;
      P(c, gx0 - 1, gy0 - 1, gw + 2, 6, '#000');
      P(c, gx0, gy0, gw, 4, '#1a1410');
      P(c, gx0 + Math.round(gw * PERFECT_CAST), gy0, gw - Math.round(gw * PERFECT_CAST), 4, '#5a4a10');
      P(c, gx0, gy0, Math.round(gw * pw), 4, pw >= PERFECT_CAST ? '#ffe070' : pw > 0.6 ? '#90e8a0' : '#60c0d0');
      if (pw >= PERFECT_CAST && Math.floor(now / 80) % 2) P(c, gx0 + gw - 2, gy0 - 3, 3, 2, '#fff6c0');
    }
    var out = ph === 'wait' || ph === 'bite' || ph === 'reel';
    var bx = bobberX(), by = SURF;
    if (out) {
      var fly = ph === 'wait' ? Math.min(1, e / 450) : 1;
      var qx = bx, qy = by - 2;
      if (fly < 1) { qx = tip[0] + (bx - tip[0]) * fly; qy = tip[1] + (by - 2 - tip[1]) * fly - Math.sin(Math.PI * fly) * 16; }
      var dip = 0;
      if (ph === 'wait') st.nibbles.forEach(function (n) { if (e > n && e < n + 220) dip = 1; });
      if (ph === 'bite') dip = 3;
      if (ph === 'reel') { qx = bx + Math.sin(now / 70) * (st.inside ? 1 : 3); dip = 2; }
      var bob = fly < 1 || dip ? 0 : Math.round(Math.sin(now / 420));
      sag(c, tip[0], tip[1], qx, qy + bob + dip, ph === 'reel' || ph === 'bite' ? 1 : 6, ph === 'reel' && !st.inside ? '#ffb0a0' : 'rgba(232,232,214,0.9)');
      if (fly >= 1) {
        line(c, qx, by + 1, hk.x, hk.y, 'rgba(232,232,214,0.25)');             // the line below, down to the hook
        if (ph !== 'reel') { P(c, hk.x - 1, hk.y, 2, 1, '#c8c8c0'); P(c, hk.x, hk.y + 1, 1, 1, '#c8c8c0'); P(c, hk.x - 1, hk.y - 1, 1, 1, '#e86060'); }
        // rings: the splash as it lands, a nibble, a bite
        var ring = function (t, a) {
          if (t < 0 || t > 1) return;
          var rw = Math.round(2 + t * 10);
          c.fillStyle = 'rgba(230,245,240,' + (a * (1 - t)).toFixed(2) + ')';
          c.fillRect(Math.round(qx - rw), by, rw * 2 + 1, 1);
        };
        if (ph === 'wait') { ring((e - 450) / 700, 0.9); st.nibbles.forEach(function (n) { ring((e - n) / 400, 0.7); }); }
        if (ph === 'bite') { ring((e % 260) / 260, 0.9); ring(((e + 130) % 260) / 260, 0.6); }
      }
      // the bobber: red and white, riding the surface (under it, on a bite)
      if (ph !== 'reel') { P(c, qx - 1, qy + bob + dip - 2, 3, 2, '#f0ece0'); P(c, qx - 1, qy + bob + dip, 3, 2, '#d83030'); }
      if (ph === 'bite') {
        // the strike window, closing in round it, and the "!"
        var k2 = Math.max(0, 1 - e / st.window), R = 3 + Math.round(k2 * 10);
        c.fillStyle = k2 > 0.55 ? '#ffe070' : '#ff9060';
        for (var a2 = 0; a2 < 24; a2++) { var an = a2 / 24 * Math.PI * 2; c.fillRect(Math.round(qx + Math.cos(an) * R), Math.round(by - 1 + Math.sin(an) * R * 0.5), 1, 1); }
        var hop = Math.round(Math.abs(Math.sin(e / 70)) * 2);
        P(c, qx - 1, by - 15 - hop, 3, 7, '#ffe070'); P(c, qx - 1, by - 6 - hop, 3, 2, '#ffe070'); P(c, qx + 2, by - 15 - hop, 1, 7, '#a07020');
        shadow(c, hk.x + Math.sin(e / 40) * 2, hk.y + 1, 3 + tierOf(st.catchId) * 2, 1, 'rgba(0,0,0,0.6)');
      }
      if (ph === 'reel') {
        // the fish on the line, thrashing below the bobber: out of the bar, it fights harder (and the line goes red)
        var tr0 = tierOf(st.catchId), fx = qx + (st.fish - 0.5) * 26, fy = SURF + 6 + (1 - st.fish) * 14;
        line(c, qx, by + 1, fx, fy, 'rgba(232,232,214,0.6)');
        shadow(c, fx, fy, 3 + tr0 * 2, Math.sin(now / 90) > 0 ? 1 : -1, 'rgba(0,0,0,0.65)');
        if (tr0 >= 3) { c.fillStyle = 'rgba(255,208,96,' + (0.2 + 0.15 * Math.sin(now / 100)).toFixed(2) + ')'; c.fillRect(Math.round(fx - 10), Math.round(fy - 3), 20, 6); }
        if (!st.inside) for (var sp = 0; sp < 4; sp++) P(c, qx + Math.cos(now / 60 + sp * 1.6) * 5, by - 1 - Math.abs(Math.sin(now / 70 + sp)) * 4, 1, 1, '#f0faf8');
        gauge(c, now);
      }
    }
    if (ph === 'caught' && e < 900 && st.result) {
      // up it comes, out of the water in an arc and onto the boards
      var t = e / 900, lx = bx + (16 - bx) * t, ly = SURF - Math.sin(Math.PI * t) * 22 - t * 6;
      line(c, tip[0], tip[1], lx, ly - 2, 'rgba(232,232,214,0.9)');
      fishSprite(c, lx, ly, TIER_COL[st.leapTier || 0], t * 9);
      if (t < 0.3) for (var d = 0; d < 8; d++) P(c, bx + Math.cos(d) * (3 + t * 30), SURF - t * 30 * Math.abs(Math.sin(d * 2)), 1, 1, '#f0faf8');
    }
    if (ph === 'lost' && e < 900) {
      if (st.snap) {                                                // the line parts: two loose ends falling
        var t3 = e / 900;
        sag(c, tip[0], tip[1], tip[0] + 18, tip[1] + 6 + t3 * 14, 3, 'rgba(232,232,214,' + (1 - t3).toFixed(2) + ')');
      }
      shadow(c, bx + e / 18, SURF + 12 + e / 60, 3 + tierOf(st.catchId) * 2, 1, 'rgba(0,0,0,' + (0.6 * (1 - e / 900)).toFixed(2) + ')');
    }
    // onto the screen at a whole multiple, crisp
    var dpr = window.devicePixelRatio || 1, cssW = cv.clientWidth || NW * 2, k = Math.max(1, Math.round(cssW * dpr / NW));
    if (cv.width !== NW * k) { cv.width = NW * k; cv.height = NH * k; }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, 0, 0, NW * k, NH * k);
    var res = el.querySelector('.fi-result');
    if ((ph === 'caught' || ph === 'lost') && !card) {
      if (res.getAttribute('data-for') !== String(st.t0)) {
        res.setAttribute('data-for', String(st.t0));
        res.innerHTML = '';
        if (ph === 'caught') {
          var ic = document.createElement('canvas'); ic.width = 48; ic.height = 48; ic.className = 'fi-icon';
          var it = st.result !== 'bottle' && typeof BridgeItems !== 'undefined' && BridgeItems.get(st.result);
          var ix = ic.getContext('2d'); ix.imageSmoothingEnabled = false;
          if (it && it.draw) it.draw(ix, 0, 0, 48);
          else { ix.fillStyle = '#4aa880'; ix.fillRect(18, 8, 12, 32); ix.fillStyle = '#e8e0c8'; ix.fillRect(20, 14, 8, 14); ix.fillStyle = '#8a6a40'; ix.fillRect(21, 4, 6, 5); }
          res.appendChild(ic);
        }
        var tx = document.createElement('div'); tx.className = 'fi-text';
        tx.innerHTML = (ph === 'caught' ? '<b>' + esc(name(st.result)) + '</b><br>' : '') + esc(st.msg || '');
        res.appendChild(tx);
      }
      res.style.display = '';
    } else res.style.display = 'none';
  }
  // a fish's shadow, s pixels long, facing d (1 right, -1 left)
  function shadow(c, x, y, s, d, col) {
    c.fillStyle = col;
    x = Math.round(x); y = Math.round(y);
    c.fillRect(x - s, y - 1, s * 2, 3); c.fillRect(x - s + 1, y - 2, s * 2 - 2, 1); c.fillRect(x - s + 1, y + 2, s * 2 - 2, 1);
    var tx = d > 0 ? x - s - 2 : x + s; c.fillRect(tx, y - 2, 2, 1); c.fillRect(tx, y + 2, 2, 1); c.fillRect(d > 0 ? x - s - 1 : x + s, y - 1, 1, 3);
  }
  // a little fish in a colour (the reel's marker, and the catch leaping out)
  function fishSprite(c, x, y, col, turn) {
    x = Math.round(x); y = Math.round(y);
    var d = Math.cos(turn || 0) >= 0 ? 1 : -1;
    P(c, x - 4, y - 2, 8, 4, '#101010');
    P(c, x - 3, y - 1, 6, 2, col);
    P(c, d > 0 ? x - 6 : x + 4, y - 2, 2, 4, '#101010'); P(c, d > 0 ? x - 5 : x + 4, y - 1, 1, 2, col);
    P(c, d > 0 ? x + 2 : x - 3, y - 1, 1, 1, '#101010');
  }
  // the reel: the bar you hold up (green, bright while the fish is in it), the fish, a chest if there is one, the line
  function gauge(c, now) {
    var gx = NW - 24, gy = 4, gw = 12, gh = NH - 8, tr = tierOf(st.catchId);
    P(c, gx - 2, gy - 2, gw + 12, gh + 4, '#0a0806');
    P(c, gx - 1, gy - 1, gw + 2, gh + 2, '#5a4422');
    P(c, gx, gy, gw, gh, '#0e2420');
    for (var y = gy + 4; y < gy + gh; y += 6) P(c, gx, y, gw, 1, 'rgba(255,255,255,0.04)');
    var zh = Math.round(gh * st.zoneH), zy = Math.round(gy + gh * (1 - st.zone - st.zoneH));
    P(c, gx, zy, gw, zh, st.inside ? 'rgba(110,250,190,0.55)' : 'rgba(96,200,160,0.32)');
    P(c, gx, zy, gw, 1, '#c8ffe8'); P(c, gx, zy + zh - 1, gw, 1, '#c8ffe8');
    var trs = st.treasure;
    if (trs && trs.shown && !trs.done) {
      var ty = Math.round(gy + gh * (1 - trs.y));
      P(c, gx + 3, ty - 2, 6, 4, '#2a1808'); P(c, gx + 4, ty - 1, 4, 2, '#e0a030'); P(c, gx + 5, ty - 1, 2, 1, '#fff0a0');
      P(c, gx + 1, ty + 3, gw - 2, 1, '#1a1410'); P(c, gx + 1, ty + 3, Math.round((gw - 2) * trs.got), 1, '#ffe070');
    }
    var fy = gy + gh * (1 - st.fish), jit = st.inside ? 0 : Math.round(Math.sin(now / 40) * 1);
    fishSprite(c, gx + gw / 2 + jit, fy, TIER_COL[tr], Math.sin(now / 300));
    // how much line you've got back
    P(c, gx + gw + 3, gy, 4, gh, '#1a1410');
    var ph2 = Math.round(gh * st.progress);
    P(c, gx + gw + 3, gy + gh - ph2, 4, ph2, st.progress > 0.66 ? '#80ffb0' : st.progress > 0.33 ? '#ffe080' : '#ff8060');
  }

  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function onKey(e) {
    var act = ['e', 'E', ' ', 'Enter'].indexOf(e.key) >= 0;
    if (act) keyDown = e.type === 'keydown';
    if (card) {
      var ready = card.classList.contains('fr-ready');
      if (e.key === 'Escape' && e.type === 'keydown') { e.preventDefault(); e.stopPropagation(); if (ready) hideCard(); return; }
      if (act) {
        e.preventDefault(); e.stopPropagation();
        if (e.type === 'keyup') { if (ready) card.armed = true; held = false; return; }
        if (e.repeat) return;
        if (ready && card.armed) hideCard(); else hush(card);
      }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (act) {
      e.preventDefault(); e.stopPropagation();
      if (e.type === 'keydown' && !e.repeat) press();
      if (e.type === 'keyup') release();
    }
  }

  function open(inter) {
    if (!el) {
      el = document.createElement('div');
      el.id = 'fishing';
      el.innerHTML = '<div class="fi-head"><span class="fi-title">Fishing</span><span class="fi-hint"></span>' +
        '<button class="qj-close fi-close" aria-label="Close"><span class="ip-key">Esc</span></button></div>' +
        '<canvas class="fi-water"></canvas><div class="fi-result" style="display:none"></div>';
      document.body.appendChild(el);
      cv = el.querySelector('.fi-water'); ctx = cv.getContext('2d');
      cv.style.width = '100%';
      var down = function (e) { e.preventDefault(); if (card) { if (card.classList.contains('fr-ready')) hideCard(); else hush(card); return; } press(); };
      var up = function (e) { e.preventDefault(); release(); };
      cv.addEventListener('pointerdown', down);
      cv.addEventListener('pointerup', up);
      cv.addEventListener('pointercancel', up);
      cv.addEventListener('pointerleave', function () { if (held) release(); });
      el.querySelector('.fi-close').addEventListener('click', close);
    }
    st = { pool: (inter && inter.pool) || 'harbour', boat: !!(inter && inter.boat), hold: inter && inter.hold || null };
    held = false; keyDown = false; fishes = []; bg = null;
    if (st.boat) cast = null; else aimAt(inter);           // from a boat, js/sloop.js draws the line off her side
    set('ready');
    el.classList.toggle('fi-top', !!(cast && cast.dy > 0.35) || st.boat);   // (from a boat the line goes out in front of her)
    el.classList.toggle('fi-boat', st.boat);
    el.querySelector('.fi-title').textContent = st.boat ? 'Fishing from the boat' : 'Fishing';
    el.classList.add('visible');
    if (typeof BridgeControls !== 'undefined') BridgeControls.disable();
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('keyup', onKey, true);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  function close() {
    if (!el || !el.classList.contains('visible')) return;
    el.classList.remove('visible');
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('keyup', onKey, true);
    cancelAnimationFrame(raf);
    var boat = st && st.boat;
    st = null; cast = null;
    hideCard();
    if (!boat && typeof BridgeControls !== 'undefined') BridgeControls.enable();   // at sea the passage keeps the controls
  }

  // ---- in the world: the rod, the line, the bobber out on the water -------------------------------------
  var cast = null;
  function aimAt(inter) {
    cast = null;
    if (typeof BridgeCharacter === 'undefined' || !inter) return;
    var px = BridgeCharacter.getX(), py = BridgeCharacter.getY(), dx = inter.x - px, dy = inter.y - py;
    if (!dx && !dy) {
      var f = BridgeCharacter.getFacing();
      dx = f === 'left' ? -1 : f === 'right' ? 1 : 0; dy = f === 'up' ? -1 : f === 'down' || !dx ? 1 : 0;
    }
    var n = Math.hypot(dx, dy); dx /= n; dy /= n;
    var face = Math.abs(dx) > Math.abs(dy) + 0.01 ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    BridgeCharacter.setFacing(face);
    var pool = (inter.pool || 'harbour');
    cast = { px: px + 0.5, py: py + 0.5, dx: dx, dy: dy, face: face, side: Math.random() - 0.5,
             reach: pool === 'ice' ? [Math.hypot(inter.x - px, inter.y - py), 0] : pool === 'pond' ? [1.3, 1.3] : [1.7, 2.6],
             wz: pool === 'ice' ? 0.05 : pool === 'pond' ? 0.14 : 0.24 };       // how far below the floor the surface lies (tiles)
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function worldItems(world, offX, offY, ts, now) {
    if (!st || !cast || typeof BridgeCharacter === 'undefined') return [];
    var rp = BridgeCharacter.getRenderPos(), foot = rp.y + 1 - 3 / 32;
    return [{ footRow: foot + (cast.face === 'up' ? -0.02 : 0.02), draw: function (c) { drawCast(c, offX, offY, ts, now, rp, foot); } }];
  }
  function drawCast(c, offX, offY, ts, now, rp, foot) {
    var ph = st.phase, e = now - st.t0, k = cast, sx = k.face === 'left' ? -1 : k.face === 'right' ? 1 : 0;
    var cx = Math.round(offX + (rp.x + 0.5) * ts), fy = Math.round(offY + foot * ts);
    var hand = k.face === 'up' ? [cx - 5, fy - 21] : k.face === 'down' ? [cx + 6, fy - 17] : [cx + sx * 7, fy - 18];
    drawLine(c, k, hand, offX, offY, ts, now, [cx, fy - 50]);
  }
  // the rod in your hand, the line, the bobber on the water - and the catch flying in. `k` is the cast: where you stand
  // (px, py, in tiles), which way it goes (dx, dy), how far (reach), how far below you the water lies (wz); `bang` is
  // where the "!" goes when something bites. js/sloop.js draws its own cast off the boat's side with it.
  function drawLine(c, k, hand, offX, offY, ts, now, bang) {
    var ph = st.phase, e = now - st.t0;
    // where the bobber lies: out along the cast, further for a strong one
    var pw = st.power != null ? st.power : 0.5, d = k.reach[0] + k.reach[1] * pw;
    var tx = k.px + k.dx * d - k.dy * k.side * 0.6, ty = k.py + k.dy * d + k.dx * k.side * 0.6;
    var bx = offX + tx * ts, by = offY + (ty + k.wz) * ts + 4;
    // the rod: out over the water, back over the shoulder as you charge, bent while you reel
    var ox = k.dx * 15, oy = k.dy * 7;
    var tip;
    if (ph === 'charge') { var p = 1 - Math.abs(((e / 1200) % 2) - 1); tip = [hand[0] - k.dx * (4 + 8 * p), hand[1] - k.dy * 4 - 18 - 3 * p]; }
    else if (ph === 'reel') { var w = Math.sin(now / 55) * 1.5; tip = [hand[0] + ox * 0.7 + w, hand[1] + oy * 0.7 - 9 + Math.abs(w)]; }
    else if (ph === 'caught' || ph === 'lost') tip = [hand[0] + k.dx * 5, hand[1] - 20];
    else tip = [hand[0] + ox, hand[1] + oy - 13];
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = '#4a2e14'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(hand[0], hand[1]); c.lineTo(tip[0], tip[1]); c.stroke();
    c.strokeStyle = '#c89058'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(hand[0], hand[1] - 1); c.lineTo(lerp(hand[0], tip[0], 0.85), lerp(hand[1], tip[1], 0.85) - 1); c.stroke();
    c.fillStyle = '#c8c0b0'; c.fillRect(Math.round(hand[0] + (tip[0] - hand[0]) * 0.18) - 1, Math.round(hand[1] + (tip[1] - hand[1]) * 0.18) - 1, 2, 2);   // the reel
    // the line and the bobber
    var out = ph === 'wait' || ph === 'bite' || ph === 'reel';
    if (out) {
      var fly = ph === 'wait' ? Math.min(1, e / 520) : 1;
      var qx = bx, qy = by, dip = 0, under = false;
      if (ph === 'reel') {
        var nearX = offX + (k.px + k.dx * 0.9) * ts, nearY = offY + (k.py + k.dy * 0.9 + k.wz) * ts + 4;
        qx = lerp(bx, nearX, Math.min(0.85, st.progress * 0.9)) + Math.sin(now / 90) * 3 * (1 - st.progress);
        qy = lerp(by, nearY, Math.min(0.85, st.progress * 0.9)) + Math.cos(now / 70) * 1.5;
        under = true;
      }
      if (fly < 1) {                                                   // still in the air
        qx = lerp(tip[0], bx, fly); qy = lerp(tip[1], by, fly) - Math.sin(Math.PI * fly) * 26;
      }
      if (ph === 'wait') st.nibbles.forEach(function (n) { if (e > n && e < n + 260) dip = 2; });
      if (ph === 'bite') under = true;
      var bob = fly < 1 || under ? 0 : Math.round(Math.sin(now / 420) * 0.8);
      c.strokeStyle = 'rgba(232,232,214,0.75)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(tip[0], tip[1]);
      var tight = ph === 'reel' || ph === 'bite';
      c.quadraticCurveTo((tip[0] + qx) / 2, Math.max(tip[1], qy) + (tight ? 0 : 7), qx, qy + bob + dip);
      c.stroke();
      // rings on the water: the splash as it lands, a nibble, the thrash of a fish on the line
      var ring = function (x, y, t, a) {
        if (t < 0 || t > 1) return;
        c.strokeStyle = 'rgba(220,240,235,' + (a * (1 - t)).toFixed(2) + ')';
        c.beginPath(); c.ellipse(x, y + 1, 2 + t * 9, (2 + t * 9) * 0.38, 0, 0, Math.PI * 2); c.stroke();
      };
      if (fly >= 1) {
        if (ph === 'wait') { ring(bx, by, (e - 520) / 700, 0.9); ring(bx, by, ((now % 2400) / 2400), 0.35); }
        st.nibbles && ph === 'wait' && st.nibbles.forEach(function (n) { ring(bx, by, (e - n) / 500, 0.7); });
        if (ph === 'bite') { ring(bx, by, (e % 300) / 300, 0.9); ring(bx, by, ((e + 150) % 300) / 300, 0.6); }
        if (ph === 'reel') {
          ring(qx, qy, (now % 380) / 380, 0.8);
          c.fillStyle = 'rgba(240,250,250,0.85)';
          for (var i = 0; i < 4; i++) { var a = now / 80 + i * 1.7; c.fillRect(Math.round(qx + Math.cos(a) * 4), Math.round(qy - 2 - Math.abs(Math.sin(a)) * 4), 1, 1); }
        }
      }
      if (!under) {
        c.fillStyle = '#f0ece0'; c.fillRect(Math.round(qx) - 1, Math.round(qy + bob + dip) - 4, 3, 2);
        c.fillStyle = '#d83030'; c.fillRect(Math.round(qx) - 1, Math.round(qy + bob + dip) - 2, 3, 2);
      } else if (ph === 'bite') {
        c.fillStyle = '#ffe080'; c.font = 'bold 11px "Pixelify Sans", monospace'; c.textAlign = 'center';
        c.fillText('!', bang[0], bang[1] - Math.abs(Math.sin(e / 90)) * 3);
      }
    }
    // the catch flies in over the rail
    if (ph === 'caught' && e < 700 && st.result) {
      var t = e / 700, fx = lerp(bx, hand[0], t), fyy = lerp(by, hand[1] - 4, t) - Math.sin(Math.PI * t) * 30;
      c.strokeStyle = 'rgba(232,232,214,0.75)'; c.beginPath(); c.moveTo(tip[0], tip[1]); c.lineTo(fx, fyy - 4); c.stroke();
      var it = st.result !== 'bottle' && typeof BridgeItems !== 'undefined' && BridgeItems.get(st.result);
      if (it && it.draw) { c.save(); c.translate(Math.round(fx) - 6, Math.round(fyy) - 6); it.draw(c, 0, 0, 12); c.restore(); }
      else { c.fillStyle = '#a8d8c0'; c.fillRect(Math.round(fx) - 2, Math.round(fyy) - 4, 4, 8); }
      if (t < 0.25) { c.fillStyle = 'rgba(240,250,250,0.8)'; for (var j = 0; j < 6; j++) c.fillRect(Math.round(bx + Math.cos(j) * (4 + t * 30)), Math.round(by - t * 40 * Math.abs(Math.sin(j * 2))), 1, 1); }
    }
    c.restore();
  }
  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) {
    ['lumar', 'verdance', 'hoarfell'].forEach(function (t) { BridgeWorld.registerSceneHooks(t, { items: worldItems }); });
  }

  // for the journal: what you've caught, the messages you've read
  function journal() {
    return {
      fish: Object.keys(log.caught).map(function (id) { return { id: id, name: name(id), n: log.caught[id].n, best: log.caught[id].best, tier: tierOf(id) }; }),
      bottles: log.bottles.map(function (i) { return BOTTLES[i]; })
    };
  }

  return { decorate: decorate, open: open, close: close, journal: journal, _state: function () { return st; }, _cast: function () { return cast; },
           size: function (id) { var f = FIGHT[id]; return f ? [f[2], f[3]] : null; },       // the sizes it comes in, cm (js/aquarium.js)
           drawLine: function (c, k, hand, offX, offY, ts, now, bang) { if (st && st.t0 != null) drawLine(c, k, hand, offX, offY, ts, now, bang); },
           isOpen: function () { return !!st; } };
})();
