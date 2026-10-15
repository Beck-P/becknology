/**
 * BridgeAnimals — hens and cows on the farm on Verdance.
 *
 * Once the farm is yours (js/homestead.js), the barn sells them: hens (up to
 * six) and cows (up to two), each with a name. They live out in the meadow
 * south of the field (`PEN`), wandering, pecking, grazing — drawn in code on
 * the 16-unit grid like the crops, depth-tested with everyone else. Each lays
 * an egg or gives milk once a day: an egg or a drop of milk bobs over it while
 * there's something to take. E on an animal takes it, and pets it — once a
 * day a pet earns a heart (up to five). Hearts pay: a hen with four lays large
 * eggs now and then, with five, once in a while, a golden one; a cow with
 * four gives a little extra. With Odile hired, she brings in whatever's
 * waiting each round, into the shipping bin. Marlo buys eggs and milk.
 * Kept in localStorage bridge_animals.
 *
 *   BridgeAnimals.barn()   // the barn's animal pen menu
 *   BridgeAnimals.use(inter) / .journal()
 */
var BridgeAnimals = (function () {
  var KEY = 'bridge_animals', DAY = 86400000;
  var KINDS = {
    hen: { name: 'Hen', price: 150, max: 6, speed: 1.1, names: ['Clementine', 'Pepper', 'Dot', 'Marigold', 'Bean', 'Hazel', 'Nutmeg', 'Pip'] },
    cow: { name: 'Cow', price: 700, max: 2, speed: 0.55, names: ['Bluebell', 'Buttercup', 'Clover', 'Dandelion'] }
  };
  var PEN = [3, 23, 30, 27];                     // tiles they wander, inclusive

  var st = load();
  var live = {};                                 // where each one is right now (not saved: they wander off from somewhere new each visit)

  function load() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    d = d || {};
    return { herd: d.herd || [], made: d.made || 0 };
  }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode */ } }
  function say(t, x) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(t, x); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }
  function toast(k, t, sub) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(k, t, sub); }
  function today() { return Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / DAY); }
  function owned() { return typeof BridgeHomestead !== 'undefined' && BridgeHomestead.owned(); }
  function ready(a) { return a.prodDay !== today(); }
  function hearts(a) { return '♥'.repeat(a.hearts) + '♡'.repeat(5 - a.hearts); }
  function product(a) {
    if (a.kind === 'cow') return 'milk';
    var r = Math.random();
    if (a.hearts >= 5 && r < 0.08) return 'golden_egg';
    if (a.hearts >= 4 && r < 0.35) return 'large_egg';
    return 'egg';
  }

  // ---- the barn: who you have, buying more ---------------------------------------------------------------------------
  function barn() {
    if (!owned()) return say('BARN', 'THE PEN IN THE BARN IS EMPTY AND SWEPT. "ANIMALS FOR THE FARM\'S OWNER," SAYS A CHALKED SIGN. THE FARM ISN\'T YOURS YET.');
    var rows = st.herd.map(function (a) {
      return { label: a.name, sub: KINDS[a.kind].name.toLowerCase() + ' · ' + hearts(a), note: ready(a) ? (a.kind === 'cow' ? 'milk waiting' : 'an egg waiting') : 'done today' };
    });
    Object.keys(KINDS).forEach(function (k) {
      var K = KINDS[k], n = st.herd.filter(function (a) { return a.kind === k; }).length;
      if (n < K.max) rows.push({ label: 'Buy a ' + K.name.toLowerCase(), sub: n + ' of ' + K.max, note: K.price + ' coins', pick: function () { buy(k); } });
    });
    BridgeInteractions.choose({
      title: 'The animals',
      text: st.herd.length ? 'THEY LIVE OUT IN THE MEADOW BELOW THE FIELD. AN EGG OR A PAIL OF MILK A DAY EACH - AND THEY LIKE A PAT.'
                           : 'THE PEN\'S EMPTY. HOLLIN KNOWS SOMEONE WITH HENS, AND A COW OR TWO THAT NEED A FIELD.',
      rows: rows
    });
  }
  function buy(kind) {
    var K = KINDS[kind];
    BridgeProgression.wagerCoins(K.price, 'farm:' + kind).then(function (r) {
      if (!r || !r.ok) return say('BARN', 'NOT ENOUGH COIN FOR A ' + K.name.toUpperCase() + ' - ' + K.price + '.');
      var used = st.herd.map(function (a) { return a.name; }), name = K.names.filter(function (n) { return used.indexOf(n) < 0; })[0] || K.name + ' ' + (st.herd.length + 1);
      var a = { id: kind + '-' + Date.now(), kind: kind, name: name, hearts: 0, petDay: 0, prodDay: today(), born: Date.now() };
      st.herd.push(a); store();
      sfx('quest');
      toast('A new ' + K.name.toLowerCase(), name, 'Out in the meadow');
      say(name.toUpperCase(), kind === 'hen' ? 'A BROWN-AND-WHITE HEN IN A CRATE, VERY OFFENDED. YOU LET HER OUT IN THE MEADOW AND SHE FORGETS ALL ABOUT IT AT ONCE. SHE\'LL LAY TOMORROW.'
                                           : 'A BIG, SLOW, SWEET-NATURED COW, WHO WALKS DOWN TO THE MEADOW LIKE SHE\'S ALWAYS LIVED HERE. MILK TOMORROW.');
      placeAll(BridgeWorld.getWorld());
    });
  }

  // ---- in the meadow -------------------------------------------------------------------------------------------------------
  function free(world, x, y) { return world && world.collisions[y] && world.collisions[y][x] === 0; }
  function spot(world) {
    for (var i = 0; i < 40; i++) {
      var x = PEN[0] + Math.floor(Math.random() * (PEN[2] - PEN[0] + 1)), y = PEN[1] + Math.floor(Math.random() * (PEN[3] - PEN[1] + 1));
      if (free(world, x, y)) return [x, y];
    }
    return [PEN[0], PEN[1]];
  }
  function placeAll(world) {
    if (!world || BridgeWorld.getWorldId() !== 'verdance') return;
    world.interactions = world.interactions.filter(function (it) { return it.type !== 'farm_animal'; });
    st.herd.forEach(function (a) {
      if (!live[a.id]) { var p = spot(world); live[a.id] = { x: p[0], y: p[1], tx: null, ty: null, wait: Math.random() * 3, dir: 1, dist: 0, act: 0, hearts: 0 }; }
      var it = { x: Math.round(live[a.id].x), y: Math.round(live[a.id].y), type: 'farm_animal', animal: a.id, label: a.name.toUpperCase(),
                 prompt: 'PRESS E TO PET', noBeacon: true };
      live[a.id].inter = it;
      world.interactions.push(it);
    });
  }
  function decorate(worldId, data) {
    if (worldId !== 'verdance') return;
    live = {};
    setTimeout(function () { placeAll(BridgeWorld.getWorld()); }, 0);
  }

  function use(inter) {
    var a = st.herd.filter(function (q) { return q.id === inter.animal; })[0];
    if (!a) return;
    var lines = [], d = today();
    if (ready(a)) {
      var p = product(a);
      if (typeof BridgeInventory !== 'undefined' && !BridgeInventory.addItem(p, 1)) return say(a.name.toUpperCase(), 'YOUR PACK IS FULL.');
      a.prodDay = d;
      st.made++;
      var nm = typeof BridgeItems !== 'undefined' && BridgeItems.get(p) ? BridgeItems.get(p).name.toUpperCase() : p.toUpperCase();
      lines.push(a.kind === 'cow' ? 'YOU SIT ON THE STOOL AND MILK HER, SLOW AND STEADY. A PAIL OF ' + nm + '.' : 'IN THE GRASS WHERE SHE WAS SITTING: ' + (/^[AEIOU]/.test(nm) ? 'AN ' : 'A ') + nm + '.');
      sfx(p === 'golden_egg' ? 'quest' : 'pickup');
      if (p === 'golden_egg') toast(a.name, 'A golden egg!', 'Marlo will pay well for that');
    }
    if (a.petDay !== d) {
      a.petDay = d;
      if (a.hearts < 5) a.hearts++;
      if (live[a.id]) live[a.id].hearts = performance.now();
      lines.push(a.kind === 'cow' ? 'YOU SCRATCH HER BETWEEN THE EARS. SHE LEANS INTO IT, ALL HALF A TONNE OF HER.'
                                  : 'YOU STROKE HER BACK. SHE MAKES A SMALL PLEASED NOISE, LIKE A KETTLE THINKING ABOUT IT.');
    } else if (!lines.length) {
      lines.push(a.kind === 'cow' ? 'SHE CHEWS AT YOU, CONTENTED. NOTHING MORE TODAY.' : 'SHE LOOKS AT YOU SIDEWAYS. NOTHING MORE TODAY - COME BACK TOMORROW.');
    }
    store();
    say(a.name.toUpperCase() + '  ' + hearts(a), lines.join('\n\n'));
  }

  // Odile, if she's on, brings in what's waiting (homestead's hands)
  function gather() {
    if (!owned() || typeof BridgeHomestead === 'undefined' || !BridgeHomestead.active('odile')) return;
    var d = today(), n = 0;
    st.herd.forEach(function (a) { if (a.prodDay !== d) { a.prodDay = d; BridgeHomestead.toBin(product(a), 1); n++; } });
    if (n) store();
  }
  setInterval(gather, 30000);

  function wander(a, L, world, dt) {
    var K = KINDS[a.kind];
    if (L.wait > 0) { L.wait -= dt; if (L.wait <= 0) L.tx = null; L.act = L.wait; return; }
    if (L.tx === null) {
      var p;
      for (var i = 0; i < 8; i++) {
        p = [Math.round(L.x + (Math.random() - 0.5) * 6), Math.round(L.y + (Math.random() - 0.5) * 3)];
        if (p[0] >= PEN[0] && p[0] <= PEN[2] && p[1] >= PEN[1] && p[1] <= PEN[3] && free(world, p[0], p[1])) break;
        p = null;
      }
      if (!p) { L.wait = 1; return; }
      L.tx = p[0]; L.ty = p[1];
    }
    var dx = L.tx - L.x, dy = L.ty - L.y, d = Math.hypot(dx, dy), step = K.speed * dt;
    if (d <= step) { L.x = L.tx; L.y = L.ty; L.wait = 2 + Math.random() * 5; }
    else { L.x += dx / d * step; L.y += dy / d * step; L.dist += step; if (Math.abs(dx) > 0.05) L.dir = dx > 0 ? 1 : -1; }
    if (L.inter) { L.inter.x = Math.round(L.x); L.inter.y = Math.round(L.y); }
  }

  var lastT = 0;
  function items(world, offX, offY, ts, now, sc) {
    if (BridgeWorld.getWorldId() !== 'verdance' || !st.herd.length) return [];
    var dt = Math.min(0.05, (now - (lastT || now)) / 1000), out = [];
    lastT = now;
    if (st.herd.some(function (a) { return !live[a.id]; })) placeAll(world);
    st.herd.forEach(function (a) {
      var L = live[a.id];
      if (!L) return;
      wander(a, L, world, dt);
      var foot = L.y + 0.85;
      out.push({ footRow: foot, draw: function (c) { drawAnimal(c, a, L, offX, offY, ts, now, sc, world, foot); } });
    });
    return out;
  }

  // ---- 16-unit art ---------------------------------------------------------------------------------------------------------
  var PAL = { k: '#2a1a10', w: '#f4efe6', s: '#d0c4b0', r: '#d83a2e', o: '#f0a020', e: '#1a1010', b: '#2a2a30', p: '#f0a0a8', h: '#e8dcc0',
              n: '#a0603a', m: '#7a4428' };
  // [colour, x, y, w, h] on a 16-unit grid, facing right; frames: 0 stand, 1 step, 2 peck / graze
  function henParts(f, brown) {
    var B = brown ? 'n' : 'w', S = brown ? 'm' : 's', hy = f === 2 ? 3 : 0, hx = f === 2 ? 1 : 0;
    return [['k', 1, 3, 9, 5], [B, 2, 4, 7, 3], [S, 3, 5, 4, 1], ['k', 0, 1, 3, 4], [B, 1, 2, 1, 2],
            ['o', f === 1 ? 4 : 5, 8, 1, 2], ['o', f === 1 ? 8 : 7, 8, 1, 2],
            ['k', 8 + hx, 0 + hy, 4, 4], [B, 9 + hx, 1 + hy, 2, 2], ['r', 9 + hx, -1 + hy, 2, 1], ['o', 12 + hx, 2 + hy, 1, 1],
            ['e', 10 + hx, 1 + hy, 1, 1], ['r', 11 + hx, 3 + hy, 1, 1]];
  }
  function cowParts(f) {
    var hy = f === 2 ? 4 : 0, l1 = f === 1 ? 1 : 0;
    return [['k', 3 + l1, 11, 3, 5], ['k', 7 - l1, 11, 3, 5], ['k', 15 + l1, 11, 3, 5], ['k', 19 - l1, 11, 3, 5],
            ['w', 4 + l1, 11, 1, 4], ['w', 8 - l1, 11, 1, 4], ['w', 16 + l1, 11, 1, 4], ['w', 20 - l1, 11, 1, 4],
            ['k', 1, 3, 21, 9], ['w', 2, 4, 19, 7], ['b', 5, 4, 4, 3], ['b', 12, 6, 5, 3], ['b', 17, 4, 3, 2], ['s', 2, 10, 19, 1],
            ['p', 12, 11, 3, 1], ['k', 0, 4, 1, 5], ['k', 0, 9, 2, 1],
            ['k', 19, 1 + hy, 6, 7], ['w', 20, 2 + hy, 4, 5], ['p', 21, 5 + hy, 4, 2], ['k', 21, 7 + hy, 4, 1], ['e', 22, 3 + hy, 1, 1],
            ['h', 19, 0 + hy, 1, 1], ['h', 24, 0 + hy, 1, 1], ['k', 18, 2 + hy, 1, 2]];
  }
  function drawAnimal(c, a, L, offX, offY, ts, now, sc, world, foot) {
    var u = ts / 16, moving = L.wait <= 0 && L.tx !== null, idleAct = !moving && Math.sin(now / 700 + a.born % 7) > 0.3;
    var f = moving ? (Math.floor(L.dist / 0.25) % 2) : idleAct ? 2 : 0;
    var hen = a.kind === 'hen', W = hen ? 13 : 25, H = hen ? 10 : 16;
    var parts = hen ? henParts(f, a.name.length % 2 === 0) : cowParts(f);
    var cx = Math.round(offX + (L.x + 0.5) * ts), fy = Math.round(offY + foot * ts), x0 = cx - Math.round(W * u / 2), y0 = fy - H * u;
    // draw into a scratch canvas, then through the scene's depth test like everyone else
    var cv = scratch(Math.ceil(W * u) + 2, Math.ceil((H + 2) * u) + 2), g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    parts.forEach(function (p) {
      var x = L.dir > 0 ? p[1] : W - p[1] - p[3];
      g.fillStyle = PAL[p[0]];
      g.fillRect(Math.round(x * u) + 1, Math.round((p[2] + 1) * u) + 1, Math.round(p[3] * u), Math.round(p[4] * u));
    });
    var dx = x0 - 1, dy = y0 - u - 1;
    if (sc && BridgeScene.drawOccluded) {
      BridgeScene.drawOccluded(c, sc, cv, 0, 0, cv.width, cv.height, dx, dy, foot, offX, offY,
        BridgeScene.tintAt ? BridgeScene.tintAt(sc, world, Math.round(L.x), Math.round(L.y), now) : null, { x: cx, y: fy, rx: hen ? 6 : 14, ry: hen ? 2 : 3 });
    } else c.drawImage(cv, dx, dy);
    // something waiting: an egg or a drop of milk, bobbing over it
    if (ready(a)) {
      var by = y0 - 9 * u + Math.round(Math.sin(now / 300 + a.born % 5) * u), bx = cx - 3 * u;
      var rects = function (col, list) { c.fillStyle = col; list.forEach(function (q) { c.fillRect(bx + q[0] * u, by + q[1] * u, q[2] * u, q[3] * u); }); };
      if (hen) {                                    // an egg
        rects(PAL.k, [[1, 0, 4, 1], [0, 1, 6, 5], [1, 6, 4, 1]]);
        rects('#fff4e0', [[2, 1, 2, 1], [1, 2, 4, 3], [2, 5, 2, 1]]);
        rects('#e8d4b0', [[3, 3, 2, 2]]); rects('#ffffff', [[2, 2, 1, 1]]);
      } else {                                      // a drop of milk
        rects(PAL.k, [[2, 0, 2, 1], [1, 1, 4, 2], [0, 3, 6, 3], [1, 6, 4, 1]]);
        rects('#ffffff', [[2, 1, 2, 2], [1, 3, 4, 3]]); rects('#d8e4f0', [[3, 4, 2, 2]]);
      }
    }
    // a heart floating up after a pat
    var age = (performance.now() - (L.hearts || -1e9)) / 1200;
    if (age >= 0 && age < 1) {
      var hx = cx - 3 * u, hy2 = y0 - (8 + age * 10) * u;
      c.globalAlpha = 1 - age;
      c.fillStyle = '#e83a5a';
      c.fillRect(hx, hy2, 2 * u, 2 * u); c.fillRect(hx + 4 * u, hy2, 2 * u, 2 * u); c.fillRect(hx, hy2 + u, 6 * u, 2 * u);
      c.fillRect(hx + u, hy2 + 3 * u, 4 * u, u); c.fillRect(hx + 2 * u, hy2 + 4 * u, 2 * u, u);
      c.globalAlpha = 1;
    }
  }
  var scr = null;
  function scratch(w, h) {
    if (!scr) scr = document.createElement('canvas');
    if (scr.width !== w || scr.height !== h) { scr.width = w; scr.height = h; }
    return scr;
  }

  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('verdance', { items: items });

  function journal() {
    return st.herd.map(function (a) { return { name: a.name, kind: a.kind, hearts: a.hearts, ready: ready(a) }; });
  }

  return { decorate: decorate, barn: barn, use: use, journal: journal, KINDS: KINDS, _st: function () { return st; } };
})();
