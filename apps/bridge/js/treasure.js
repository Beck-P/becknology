/**
 * BridgeTreasure — treasure maps, and the chests they lead to.
 *
 * A map is an item (`tmap_<id>`); using it opens the sketch: the place
 * itself, cut from the island's own render and inked onto parchment, with a
 * red X and a line of the finder's hand. Nothing on the map says which
 * island — you know it by the landmarks. Carry the map to the spot and a
 * DIG prompt appears there (only for someone holding the map); dig, and a
 * chest comes up: coins, and goods, and sometimes the next map.
 *
 * Ilsa Venn, the cartographer on the square, sells a few (a topic with
 * `treasure: 'shop'`); the rest turn up under rocks in the Rose Mine, or in
 * the chests themselves. Dug spots are remembered (`bridge_treasure`).
 *
 *   BridgeTreasure.view('lighthouse')        // the sketch
 *   BridgeTreasure.decorate(worldId, data)   // adds the dig spot for maps you hold
 *   BridgeTreasure.dig(inter) / shop(who) / maybeFind(floor)
 */
var BridgeTreasure = (function () {
  var KEY = 'bridge_treasure';
  var MAPS = {
    lighthouse: { world: 'lumar', x: 13, y: 7, title: 'UNDER THE OLD LIGHT', hand: '"Two steps from the light\'s door, where the sand gives way."',
                  price: 40, coins: 40, loot: [['sea_glass', 4], ['silver_nail', 3]], next: 'heron' },
    windmill:   { world: 'lumar-rose', x: 11, y: 26, title: 'THE SINGING MILL', hand: '"Below the sails that chime, where the miller dropped her ring."',
                  price: 80, coins: 70, loot: [['roseite', 5], ['rose_shrimp', 2]] },
    beacon:     { world: 'lumar-sapphire', x: 8, y: 18, title: 'THE BLUE LAMP', hand: '"In the lamp\'s own shadow, facing the sea."',
                  price: 80, coins: 70, loot: [['sapphire_crystal', 4], ['bluefin', 1]] },
    heron:      { world: 'lumar-crimson', x: 10, y: 29, title: 'WHAT THE HERON CARRIED', hand: '"Her purser buried the strongbox above the tideline, by the bow. -H.M."',
                  coins: 120, loot: [['heron_coin', 3], ['silver_nail', 5]], next: 'watchtower' },
    watchtower: { world: 'lumar-crimson', x: 22, y: 19, title: 'THE WATCH', hand: '"The watch kept the gold where they could see it from the tower."',
                  coins: 150, loot: [['crimson_crystal', 4], ['star_pearl', 1]] },
    graves:     { world: 'lumar-midnight', x: 13, y: 25, title: 'AMONG THE DROWNED', hand: '"With the sailors, the ones the sea gave back."',
                  coins: 110, loot: [['midnight_crystal', 3], ['moon_eel', 1]], next: 'abbey' },
    memorial:   { world: 'lumar-rose', x: 8, y: 35, title: 'FOR THOSE WHO MINED', hand: '"At the stone with the names. They\'d want it spent."',
                  coins: 90, loot: [['moonstone', 1], ['iron_ore', 4]] },
    abbey:      { world: 'lumar-midnight', x: 41, y: 21, title: 'THE ABBOT\'S TITHE', hand: '"Under the broken arch, where the bell came down."',
                  coins: 200, loot: [['songstone', 1], ['star_pearl', 2]] }
  };
  var SHOP = ['lighthouse', 'windmill', 'beacon'];
  var FOUND = ['graves', 'memorial', 'heron'];          // what turns up under rocks in the mine

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || { dug: {} }; } catch (e) { return { dug: {} }; } }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ } }
  var state = load();
  function has(id) { return typeof BridgeInventory !== 'undefined' && BridgeInventory.getCount('tmap_' + id) > 0; }
  function say(l, t) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(l, t); }

  // ---- the dig spots ------------------------------------------------------------------------------
  function decorate(worldId, data) {
    Object.keys(MAPS).forEach(function (id) {
      var M = MAPS[id];
      if (M.world !== worldId || state.dug[id] || !has(id)) return;
      data.interactions.push({ x: M.x, y: M.y, type: 'dig', label: 'X MARKS THE SPOT', prompt: 'PRESS E TO DIG', map: id });
    });
  }

  function dig(inter) {
    var id = inter.map, M = MAPS[id];
    if (!M || state.dug[id]) return;
    if (!has(id)) return say('LOOSE EARTH', 'THE GROUND HERE HAS BEEN TURNED OVER BEFORE. SOMEONE GOT HERE FIRST.');
    if (BridgeInventory.getStats().energy < 6) return say('X MARKS THE SPOT', 'TOO TIRED TO DIG. EAT SOMETHING FIRST.');
    BridgeInventory.useEnergy(6);
    if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('crumble');
    state.dug[id] = Date.now(); store();
    BridgeInventory.removeItem('tmap_' + id, 1);
    var w = BridgeWorld.getWorld(), ix = w.interactions.indexOf(inter);
    if (ix >= 0) w.interactions.splice(ix, 1);
    if (typeof BridgeFX !== 'undefined' && BridgeFX.spawnSparks) BridgeFX.spawnSparks(M.x, M.y, '#e0c060', 14);
    M.loot.forEach(function (l) { if (typeof BridgeLoot !== 'undefined') BridgeLoot.spawn(M.x, M.y, l[0], l[1]); });
    var next = M.next && !state.dug[M.next] && !has(M.next) ? M.next : null;
    if (next && typeof BridgeLoot !== 'undefined') BridgeLoot.spawn(M.x, M.y, 'tmap_' + next, 1);
    var paid = typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins ? BridgeProgression.awardCoins(M.coins, 'treasure:' + id) : null;
    if (paid && paid.catch) paid.catch(function () {});
    setTimeout(function () {
      if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('quest');
      if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast('Treasure', M.title.charAt(0) + M.title.slice(1).toLowerCase(), '+' + M.coins + ' coins');
      say('X MARKS THE SPOT', 'A FOOT DOWN, YOUR HANDS FIND WOOD: A SMALL IRON-BOUND CHEST. INSIDE, ' + M.coins + ' COINS AND WHAT YOU SEE SPILLING OUT.' +
          (next ? '\n\nAND UNDER IT ALL, FOLDED SMALL, ANOTHER MAP.' : ''));
    }, 500);
  }

  // ---- the sketch ------------------------------------------------------------------------------------
  var sketches = {};
  function sketch(id, cb) {
    if (sketches[id]) return cb(sketches[id]);
    var M = MAPS[id];
    fetch('/bridge/assets/scenes/' + M.world + '/scene.json?v=' + Date.now()).then(function (r) { return r.json(); }).then(function (meta) {
      var im = new Image();
      im.onload = function () {
        var TW = 14, TH = 10, S = 32;                                  // a 14 x 10 tile view round the X
        var c = document.createElement('canvas'); c.width = TW * S; c.height = TH * S;
        var g = c.getContext('2d', { willReadFrequently: true });
        var sx = meta.originX + (M.x + 0.5 - TW / 2) * S, sy = meta.originY + (M.y + 0.5 - TH / 2) * S;
        g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(im, sx, sy, c.width, c.height, 0, 0, c.width, c.height);
        // ink it: luminance, a few tones of sepia, dark edges, paper where nothing was drawn
        var px = g.getImageData(0, 0, c.width, c.height), d = px.data, W = c.width, H = c.height, L = new Float32Array(W * H);
        for (var i = 0; i < W * H; i++) L[i] = d[i * 4 + 3] < 40 ? -1 : (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255;
        var lo = 1, hi = 0;
        for (var j = 0; j < W * H; j++) if (L[j] >= 0) { lo = Math.min(lo, L[j]); hi = Math.max(hi, L[j]); }
        for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
          var k = y * W + x, v = L[k], o = k * 4;
          if (v < 0) { d[o] = 214; d[o + 1] = 196; d[o + 2] = 156; d[o + 3] = 255; continue; }         // sea: bare paper
          var n = (v - lo) / Math.max(0.05, hi - lo);
          var e = x > 0 && y > 0 ? Math.abs(v - L[k - 1]) + Math.abs(v - L[k - W]) : 0;
          var tone = e > 0.09 ? 0 : n < 0.25 ? 1 : n < 0.5 ? 2 : n < 0.75 ? 3 : 4;
          var pal = [[58, 40, 24], [118, 88, 58], [156, 124, 86], [188, 160, 118], [214, 196, 156]][tone];
          d[o] = pal[0]; d[o + 1] = pal[1]; d[o + 2] = pal[2]; d[o + 3] = 255;
        }
        g.putImageData(px, 0, 0);
        // the X
        var X = W / 2, Y = H / 2;
        g.strokeStyle = '#a01c14'; g.lineWidth = 5; g.lineCap = 'round';
        g.beginPath(); g.moveTo(X - 12, Y - 12); g.lineTo(X + 12, Y + 12); g.moveTo(X + 12, Y - 12); g.lineTo(X - 12, Y + 12); g.stroke();
        sketches[id] = c;
        cb(c);
      };
      im.src = '/bridge/assets/scenes/' + M.world + '/full.png?v=' + meta.rev;
    }).catch(function () { cb(null); });
  }

  var el = null, keyFn = null;
  function view(id) {
    var M = MAPS[id];
    if (!M) return;
    close();
    if (typeof BridgeControls !== 'undefined') BridgeControls.disable();
    el = document.createElement('div');
    el.id = 'treasure-map';
    el.className = 'world-dialog wd-parchment wd-tmap visible';
    el.innerHTML = '<div class="wd-body"><div class="wd-title">' + M.title + '</div><div class="tmap-frame"><div class="tmap-wait">UNFOLDING...</div></div>' +
      '<div class="wd-text tmap-hand">' + M.hand.replace(/</g, '&lt;') + '</div>' +
      '<div class="wd-hint"><span class="ip-key">Esc</span>Fold it away</div></div>';
    (document.getElementById('world-overlay') || document.body).appendChild(el);
    keyFn = function (e) { if (e.key === 'Escape' || e.key === 'e' || e.key === 'E' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); close(); } };
    document.addEventListener('keydown', keyFn, true);
    el.addEventListener('click', function () { close(); });
    if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('open');
    sketch(id, function (c) {
      if (!el) return;
      var f = el.querySelector('.tmap-frame');
      f.innerHTML = '';
      if (c) { c.className = 'tmap-sketch'; f.appendChild(c); } else f.textContent = 'THE INK HAS RUN. YOU CAN\'T MAKE IT OUT.';
    });
  }
  function close() {
    if (!el) return;
    document.removeEventListener('keydown', keyFn, true);
    el.remove(); el = null;
    if (typeof BridgeControls !== 'undefined') BridgeControls.enable();
  }

  // ---- Ilsa's maps, and maps under rocks ---------------------------------------------------------------
  function shop(who) {
    var opts = SHOP.filter(function (id) { return !state.dug[id] && !has(id); }).map(function (id) {
      return { label: MAPS[id].title + ' - ' + MAPS[id].price + ' COINS', action: 'treasure_buy', map: id };
    });
    if (!opts.length) return say(who.toUpperCase(), '"THAT\'S ALL I HAVE THAT ISN\'T DUG UP OR IN YOUR POCKET. THE MINE TURNS UP OLD ONES, THEY SAY."');
    BridgeInteractions.execute({ type: 'menu', label: who.toUpperCase(), dialog: '"COPIES OF OLD ONES - THE LANDMARKS ARE TRUE, THE REST IS UP TO YOU. NO REFUNDS IF SOMEONE GOT THERE FIRST."',
                                 options: opts.concat([{ label: 'NOT TODAY', action: 'close' }]) });
  }
  function buy(id) {
    var M = MAPS[id];
    BridgeProgression.wagerCoins(M.price, 'treasure_map:' + id).then(function (res) {
      if (!res || !res.ok) return say('ILSA', res && (res.reason === 'insufficient' || res.reason === 'no_balance') ? '"' + M.price + ' COINS, NOT A COPPER LESS."' : '"THE TILL\'S STUCK. COME BACK."');
      BridgeInventory.give('tmap_' + id, 1);
      if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('pickup');
      say('ILSA', '"' + M.title + '. USE IT FROM YOUR PACK TO LOOK AT IT - AND LOOK HARD AT THE LANDMARKS."');
    });
  }
  function maybeFind(floor, x, y) {           // a rare folded map under a broken rock
    if (floor < 4 || Math.random() > 0.03) return;
    var left = FOUND.filter(function (id) { return !state.dug[id] && !has(id); });
    if (!left.length || typeof BridgeLoot === 'undefined') return;
    BridgeLoot.spawn(x, y, 'tmap_' + left[Math.floor(Math.random() * left.length)], 1);
  }

  return { MAPS: MAPS, view: view, close: close, decorate: decorate, dig: dig, shop: shop, buy: buy, maybeFind: maybeFind };
})();
