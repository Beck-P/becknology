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
  var el = null, cv = null, ctx = null, raf = 0, st = null, held = false;
  var W = 420, H = 150;

  function name(id) {
    if (id === 'bottle') return 'Message in a bottle';
    var it = typeof BridgeItems !== 'undefined' && BridgeItems.get(id);
    return it ? it.name : id;
  }

  function pick(pool, power) {
    var lucky = typeof BridgeInventory !== 'undefined' && BridgeInventory.getCount && BridgeInventory.getCount('lucky_horseshoe') > 0;
    var list = (POOLS[pool] || POOLS.harbour).map(function (e) {
      var rare = tierOf(e[0]) >= 2;
      return [e[0], e[1] * (rare && power > 0.7 ? 1.6 : 1) * (rare && lucky ? 1.2 : 1)];
    });
    var total = list.reduce(function (a, e) { return a + e[1]; }, 0), r = Math.random() * total;
    for (var i = 0; i < list.length; i++) { r -= list[i][1]; if (r <= 0) return list[i][0]; }
    return list[0][0];
  }

  function set(phase, extra) {
    st.phase = phase; st.t0 = performance.now();
    if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx({ wait: 'splash', bite: 'plop', caught: 'catch', lost: 'fail' }[phase]);
    if (extra) Object.keys(extra).forEach(function (k) { st[k] = extra[k]; });
    var big = st.catchId ? tierOf(st.catchId) : 0;
    var hint = { ready: 'Hold to cast', charge: 'Let go to cast', wait: 'Wait for a bite…',
                 bite: big >= 3 ? 'STRIKE! It\'s enormous!' : big >= 2 ? 'Strike! Something big!' : 'Strike!',
                 reel: big >= 3 ? 'Hold on - it\'s a monster! Keep it in the zone' : 'Hold to lift, let go to drop - keep it in the zone',
                 caught: 'Again: hold to cast · Esc to stop', lost: 'Hold to cast again · Esc to stop' }[phase] || '';
    el.querySelector('.fi-hint').textContent = hint;
  }

  function press() {
    held = true;
    if (!st) return;
    if (st.phase === 'ready' || st.phase === 'caught' || st.phase === 'lost') set('charge');
    else if (st.phase === 'bite') hook();
    else if (st.phase === 'wait') { set('lost', { msg: 'Too soon - you pulled it out of the water.' }); }
  }

  function release() {
    held = false;
    if (st && st.phase === 'charge') {
      var t = (performance.now() - st.t0) / 1200;
      var power = 1 - Math.abs((t % 2) - 1);              // the swing goes up and down; let go near the top
      log.casts += 1; store();
      var lucky = typeof BridgeInventory !== 'undefined' && BridgeInventory.getCount && BridgeInventory.getCount('lucky_horseshoe') > 0;
      set('wait', { power: power, wait: (1500 + Math.random() * 3500) * (lucky ? 0.6 : 1), nibbles: [], catchId: null });   // the horseshoe: they bite sooner
      var n = Math.floor(Math.random() * 3);
      for (var i = 0; i < n; i++) st.nibbles.push(400 + Math.random() * (st.wait - 600));
    }
  }

  function hook() {
    var id = st.catchId || pick(st.pool, st.power), f = FIGHT[id] || FIGHT.silverfin, F = FIGHTS[tierOf(id)];
    set('reel', { catchId: id, fight: f, tune: F, zoneH: F.zone, zone: 0.1, zv: 0, fish: 0.5, ft: 0.5, progress: F.start, last: performance.now() });
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
        where = kept === false ? 'No room in your pack, so you let it go' : 'Into your pack';
      }
      msg = (junk ? '' : size + ' cm' + (best && c.n > 1 ? ' - your biggest yet! ' : '. ')) + where + '.';
    }
    store();
    set('caught', { result: id, msg: msg });
    reveal({ id: id, tier: tier, size: junk ? 0 : size, best: best && !first, first: first, where: where, quote: id === 'bottle' ? msg : null });
  }

  // ---- the catch, up on a card: the fish drawn big, its rarity, its size, NEW the first time -------------------------
  var card = null, cardTimer = 0;
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
      '<div class="fr-art"></div><div class="fr-tier"></div><div class="fr-name"></div><div class="fr-size"></div><div class="fr-where"></div></div>';
    var art = card.querySelector('.fr-art'), cv = typeof BridgeFishArt !== 'undefined' && BridgeFishArt.canvas(o.id, 48, 24, 5);
    if (cv) art.appendChild(cv);
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
    var worth = it && it.value > 1 && o.id !== 'old_boot' && !/let it go/.test(o.where) ? 'worth about ' + it.value : '';
    card.querySelector('.fr-where').textContent = [o.where, worth].filter(Boolean).join(' · ');
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
    card.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); hideCard(); });
    document.body.appendChild(card);
    if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(o.tier >= 3 ? 'fanfare' : o.tier >= 2 ? 'rarecatch' : o.first ? 'success' : null);
    clearTimeout(cardTimer);
    cardTimer = setTimeout(hideCard, [2400, 3000, 4600, 7000][o.tier] || 2400);
  }
  function hideCard(now) {
    clearTimeout(cardTimer);
    var c = card; card = null;
    if (!c) return;
    if (now) { c.remove(); return; }
    c.classList.add('fr-out');
    setTimeout(function () { c.remove(); }, 320);
  }
  function rgba(hex, a) { var p = parseInt(hex.slice(1), 16); return 'rgba(' + ((p >> 16) & 255) + ',' + ((p >> 8) & 255) + ',' + (p & 255) + ',' + a + ')'; }

  function frame(now) {
    if (!st) return;
    var dt = Math.min(0.05, (now - (st.lastFrame || now)) / 1000);
    st.lastFrame = now;
    var e = now - st.t0;
    if (st.phase === 'wait') {
      if (e > st.wait) { var id = pick(st.pool, st.power); st.catchId = id; set('bite', { window: FIGHTS[tierOf(id)].strike }); }
    } else if (st.phase === 'bite') {
      if (e > st.window) set('lost', { msg: 'It got away.' });
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
      st.progress += (inside ? T.gain : -0.2 * (0.6 + f[0] * 0.4) * T.drain) * dt;
      if (st.progress >= 1) land();
      else if (st.progress <= 0) set('lost', { msg: 'The line goes slack.' });
    }
    draw(now);
    raf = requestAnimationFrame(frame);
  }

  function draw(now) {
    var dpr = window.devicePixelRatio || 1;
    if (cv.width !== W * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // the spore sea at night - or, on Verdance, a farm pond in the afternoon sun, lily pads and glints
    var pond = st.pool === 'pond', ice = st.pool === 'ice';
    var g = ctx.createLinearGradient(0, 0, 0, H), deep = !!st.boat;              // from a boat: open water, dark and deep
    g.addColorStop(0, ice ? '#1a3a5a' : pond ? '#3a7a70' : deep ? '#0a2a34' : '#0c2a26'); g.addColorStop(1, ice ? '#08182a' : pond ? '#18403a' : deep ? '#02080e' : '#06120f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (pond) {
      [[70, 40, 9], [210, 96, 12], [330, 30, 8], [400, 110, 10]].forEach(function (l, j) {
        var lx = (l[0] + Math.sin(now / 2400 + j) * 3) % W;
        ctx.fillStyle = '#2a6a2a'; ctx.beginPath(); ctx.ellipse(lx, l[1], l[2], l[2] * 0.55, 0, 0.3, Math.PI * 2 - 0.3); ctx.lineTo(lx, l[1]); ctx.fill();
        ctx.fillStyle = '#4a9a3a'; ctx.fillRect(Math.round(lx - l[2] * 0.6), Math.round(l[1] - 1), Math.round(l[2] * 0.5), 1);
        if (j === 1) { ctx.fillStyle = '#f0b0d0'; ctx.fillRect(Math.round(lx + 2), Math.round(l[1] - 3), 3, 3); }
      });
    }
    for (var i = 0; i < 26; i++) {
      var sx = (i * 73 + now * 0.006 * (1 + i % 3)) % W, sy = 20 + (i * 37) % (H - 30) + Math.sin(now / 900 + i) * 3;
      ctx.fillStyle = (ice ? 'rgba(190,230,255,' : pond ? 'rgba(255,250,220,' : 'rgba(96,240,192,') + (0.15 + 0.2 * Math.abs(Math.sin(now / 700 + i))).toFixed(2) + ')';
      ctx.fillRect(Math.round(sx), Math.round(sy), 2, pond ? 1 : 2);
    }
    if (ice) {                                                   // under the ice: the hole's bright ring above, bubbles rising
      ctx.fillStyle = 'rgba(200,235,255,0.18)'; ctx.fillRect(0, 0, W, 10);
      ctx.fillStyle = 'rgba(230,245,255,0.5)'; ctx.fillRect(0, 9, W, 1);
    }
    for (var w = 0; w < 5; w++) {
      ctx.fillStyle = 'rgba(160,230,210,0.08)';
      ctx.fillRect(Math.round((w * 97 + now * 0.01) % W), 30 + w * 22, 40, 1);
    }
    var ph = st.phase, e = now - st.t0;
    // the rod tip, top left, and where the bobber sits
    var tipX = 26, tipY = 14;
    var dist = st.power != null ? 120 + st.power * 190 : 0;
    var bx = 60 + dist, by = 78;
    if (ph === 'charge') {
      var t = (e / 1200), p = 1 - Math.abs((t % 2) - 1);
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(14, H - 22, 160, 10);
      ctx.fillStyle = p > 0.7 ? '#ffe080' : '#60f0c0'; ctx.fillRect(14, H - 22, Math.round(160 * p), 10);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.strokeRect(14 + 112, H - 22, 48, 10);
    }
    if (ph === 'wait' || ph === 'bite' || ph === 'reel') {
      var dip = 0;
      if (ph === 'wait') st.nibbles.forEach(function (n) { if (e > n && e < n + 260) dip = 3; });
      if (ph === 'bite') dip = 7 + Math.sin(e / 40) * 2;
      if (ph === 'reel') { bx = 60 + dist * (1 - st.progress * 0.6); dip = 4 + Math.sin(now / 60) * 3; }
      if (ph === 'reel' || ph === 'bite') {                              // its shadow under the water: you can tell a big one
        var tr0 = tierOf(st.catchId), sw = 7 + tr0 * 6, sh = 3 + tr0 * 2;
        ctx.fillStyle = 'rgba(0,0,0,' + (0.25 + tr0 * 0.08).toFixed(2) + ')';
        ctx.beginPath(); ctx.ellipse(bx + Math.sin(now / 160) * (4 + tr0 * 2), by + 16 + tr0 * 2, sw, sh, 0, 0, Math.PI * 2); ctx.fill();
        if (tr0 >= 3) { ctx.fillStyle = 'rgba(255,208,96,' + (0.12 + 0.08 * Math.sin(now / 120)).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(bx, by + 16 + tr0 * 2, sw + 6, sh + 3, 0, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.strokeStyle = 'rgba(230,230,210,0.7)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.quadraticCurveTo((tipX + bx) / 2, by - 10, bx, by + dip); ctx.stroke();
      ctx.fillStyle = '#e8e8e0'; ctx.fillRect(bx - 3, by + dip - 6, 6, 4);
      ctx.fillStyle = '#d83030'; ctx.fillRect(bx - 3, by + dip - 2, 6, 4);
      ctx.strokeStyle = 'rgba(160,240,220,' + (0.5 - (now % 1200) / 2400).toFixed(2) + ')';
      ctx.strokeRect(Math.round(bx - 8 - (now % 1200) / 60), by + 4, Math.round(16 + (now % 1200) / 30), 1);
      if (ph === 'bite') {
        ctx.fillStyle = '#ffe080'; ctx.font = 'bold 22px "Pixelify Sans", monospace';
        ctx.fillText('!', bx - 4, by - 14);
      }
    }
    ctx.strokeStyle = '#8a6a40'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 40); ctx.lineTo(tipX, tipY); ctx.stroke();
    if (ph === 'reel') {
      // the reel: a tall bar on the right, the zone, the fish, the line filling
      var rx = W - 46, ry = 10, rh = H - 20, rw = 18;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(rx - 4, ry - 4, rw + 26, rh + 8);
      ctx.fillStyle = '#10302a'; ctx.fillRect(rx, ry, rw, rh);
      var zy = ry + rh * (1 - st.zone - st.zoneH), tr = tierOf(st.catchId);
      ctx.fillStyle = 'rgba(96,240,192,0.45)'; ctx.fillRect(rx, Math.round(zy), rw, Math.round(rh * st.zoneH));
      var fy = ry + rh * (1 - st.fish);
      ctx.fillStyle = ['#e8e0c0', '#80c8ff', '#d8a0ff', '#ffd060'][tr]; ctx.fillRect(rx + 4 - (tr >= 3 ? 2 : 0), Math.round(fy) - 3, rw - 8 + (tr >= 3 ? 4 : 0), 6);
      ctx.fillStyle = '#1a1410'; ctx.fillRect(rx + rw + 6, ry, 8, rh);
      ctx.fillStyle = st.progress > 0.66 ? '#80ffb0' : st.progress > 0.33 ? '#ffe080' : '#ff8060';
      ctx.fillRect(rx + rw + 6, Math.round(ry + rh * (1 - st.progress)), 8, Math.round(rh * st.progress));
    }
    var res = el.querySelector('.fi-result');
    if (ph === 'caught' || ph === 'lost') {
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

  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function onKey(e) {
    if (card && e.type === 'keydown' && ['Escape', 'e', 'E', ' ', 'Enter'].indexOf(e.key) >= 0) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) hideCard(); return; }
    if (card && e.type === 'keyup') { e.preventDefault(); e.stopPropagation(); return; }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key === 'e' || e.key === 'E' || e.key === ' ' || e.key === 'Enter') {
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
      var down = function (e) { e.preventDefault(); if (card) { hideCard(); return; } press(); };
      var up = function (e) { e.preventDefault(); release(); };
      cv.addEventListener('pointerdown', down);
      cv.addEventListener('pointerup', up);
      cv.addEventListener('pointercancel', up);
      cv.addEventListener('pointerleave', function () { if (held) release(); });
      el.querySelector('.fi-close').addEventListener('click', close);
    }
    st = { pool: (inter && inter.pool) || 'harbour', boat: !!(inter && inter.boat), hold: inter && inter.hold || null };
    held = false;
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
           drawLine: function (c, k, hand, offX, offY, ts, now, bang) { if (st && st.t0 != null) drawLine(c, k, hand, offX, offY, ts, now, bang); },
           isOpen: function () { return !!st; } };
})();
