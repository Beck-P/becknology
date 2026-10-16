/**
 * BridgeStorage — chests to keep things in, buyers who'll take anything, and bigger packs.
 *
 * Chests. Opening one shows its slots above your pack in the menu's Backpack (js/menu.js, js/inventory.js does the
 * moving: a click moves a whole stack across, shift-click or right-click just one; Store your pack, Add to stacks,
 * Take all). Aboard the Wayfarer there are two from the start: the sea chest on the bridge and the storage locker in
 * your quarters (which also keeps your spare decor — its Decor locker button). More come as furniture
 * (assets/furniture.json, `CHESTS`): a crate, the old trunk and the captain's strongbox, bought from the Ship's
 * Chandler or any home's furnishing shop (H) and put down in any place of yours — aboard, your houses, the farmhouse,
 * the holm's cottage. A furniture chest keeps its things in its own layout entry (`items`, saved with bridge_homes,
 * so a partner visiting sees the same chest); the ship's two keep theirs in localStorage `bridge_storage`.
 *
 * Buyers. Specialists pay full price (Oro, Maud, Hob, Marlo… a `sell` topic in people.json). General traders take
 * anything that has a value (items.js `value`) for less: the Ship's Chandler aboard (6/10), Joro's pawn counter
 * (6/10), the fishmonger in Lumar's square, Pennyworth's in Brambleford, the guide's hut in Fellhaven (7/10) and the
 * market in Crownhaven (3/4) — interactions given type `trader` as their worlds load (`TRADERS`), keeping what they
 * sell. Each opens the game's own sell sheet (js/interactions.js, type `sell`).
 *
 * The Ship's Chandler on the bridge (`chandler`): deck fittings (js/catalog.js), chests, packs, and selling.
 *
 *   BridgeStorage.open(inter) / chest(id) / count(chestOrPiece) / sell(label, rate, text) / worthLine(id)
 *   BridgeStorage.nextPack() → {name, slots, price, where} | null
 */
var BridgeStorage = (function () {
  var KEY = 'bridge_storage';
  // furniture that holds things (assets/furniture.json ids) and how much
  var CHESTS = { crate: { name: 'Crate', slots: 9 }, trunk: { name: 'Old Trunk', slots: 18 }, strongbox: { name: 'Captain\'s Strongbox', slots: 36 } };
  // the Wayfarer's own: interactions given type `chest` as the ship's rooms load
  var FIXED = {
    'wayfarer-chest': { world: 'bridge', label: 'SEA CHEST', name: 'The Sea Chest', slots: 24, where: 'on the bridge' },
    'wayfarer-locker': { world: 'quarters', label: 'STORAGE LOCKER', name: 'Storage Locker', slots: 24, where: 'in your quarters', decor: true }
  };
  // general traders: an interaction in a hub that will buy anything with a value (rate × value), selling what it did
  var TRADERS = [
    { world: 'lumar-square', label: 'FISHMONGER', rate: 0.7, intro: 'THE FISHMONGER WIPES HIS HANDS. "SELLING? I\'LL TAKE ANYTHING THAT\'S WORTH SOMETHING - NOT FOR WHAT A COLLECTOR WOULD PAY, MIND."' },
    { world: 'lumar-crown', label: 'MARKET', rate: 0.75, rename: 'MARKET TRADER', intro: 'A TRADER AT THE CROWN MARKET, SCALES AND A STRONGBOX. "THE CAPITAL BUYS EVERYTHING, CAPTAIN. BRING IT HERE."' },
    { world: 'verdance-village', label: 'PENNYWORTH\'S', rate: 0.7, intro: 'PERCY TAPS THE COUNTER. "SEEDS AND SUNDRIES - AND I BUY SUNDRIES TOO. WHATEVER YOU\'VE GOT, IF IT\'S WORTH A PENNY."' },
    { world: 'hoarfell', label: 'GUIDE\'S HUT', rate: 0.7, intro: 'THE GUIDE\'S HUT: ROPES, AXES, CHALK. "WE BUY BACK, TOO - ANYTHING YOU DRAG DOWN OFF THE MOUNTAIN."' },
    { world: 'junk-pawn-shop', label: 'DISPLAY CASE', at: [4, 6], rate: 0.6, rename: 'PAWN COUNTER', intro: 'JORO\'S PAWN COUNTER. A SIGN TAPED TO THE GLASS: "WE BUY ANYTHING. WE PAY LIKE IT."' }
  ];
  var SHIP_RATE = 0.6;
  // where the outfitters are (js/gear.js SHOPS), for "where to buy a bigger pack"
  var SHOP_WHERE = {
    wayfarer: 'the Ship\'s Chandler, on the bridge', lumar_tailor: 'the tailor in Lumar\'s Market Square', sapphire_imports: 'the import stall on Sapphire Port',
    cyber_gear: 'Cyber Gear on the District street', joro: 'Joro\'s back room in the District', vex: 'Vex\'s stash in NULL\'s den', alpine: 'the ski hire in Fellhaven'
  };

  var st = load();
  function load() {
    var d;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    d = d && typeof d === 'object' ? d : {};
    d.chests = d.chests || {};
    return d;
  }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode */ } }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function item(id) { return typeof BridgeItems !== 'undefined' ? BridgeItems.get(id) : null; }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function say(label, text) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(label, text); }

  // a slot list of the right length, with anything unknown dropped
  function fit(arr, n) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var s = arr && arr[i];
      out.push(s && typeof s.id === 'string' && s.count > 0 && item(s.id) ? s : null);
    }
    for (var j = n; arr && j < arr.length; j++) if (arr[j]) out.push(arr[j]);           // never lose anything: overflow kept on the end
    return out;
  }

  // ---- chests --------------------------------------------------------------------------------------------------
  function chest(id) {                                   // one of the ship's
    var F = FIXED[id];
    if (!F) return null;
    var slots = st.chests[id] = fit(st.chests[id], F.slots);
    var c = { id: id, name: F.name, size: Math.max(F.slots, slots.length), slots: slots, where: F.where, save: store };
    if (F.decor && typeof BridgeLocker !== 'undefined') c.extra = { label: 'Decor locker', act: function () { if (typeof BridgeMenu !== 'undefined') BridgeMenu.close(); BridgeLocker.show(); } };
    return c;
  }
  function pieceChest(inter) {                           // a chest you put down somewhere of yours (js/home.js)
    var q = inter._piece, C = CHESTS[inter.piece];
    if (!q || !C) return null;
    q.items = fit(q.items, C.slots);
    var w = typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorld ? BridgeWorld.getWorld() : null;
    return { id: 'piece', name: C.name, size: Math.max(C.slots, q.items.length), slots: q.items, where: w ? w.name : '',
             save: function () { if (typeof BridgeHome !== 'undefined' && BridgeHome.persist) BridgeHome.persist(); } };
  }
  function open(inter) {
    var c = inter.piece ? pieceChest(inter) : chest(inter.chest);
    if (!c) return;
    if (typeof BridgeMenu === 'undefined') return say(c.name.toUpperCase(), 'IT WON\'T OPEN.');
    sfx('open');
    BridgeMenu.open('backpack', { chest: c });
  }
  /** How many things a chest holds (a layout entry from js/home.js, or a ship chest's id). */
  function count(x) {
    var slots = typeof x === 'string' ? st.chests[x] : x && x.items;
    return (slots || []).reduce(function (a, s) { return a + (s ? s.count : 0); }, 0);
  }

  // ---- selling ---------------------------------------------------------------------------------------------------
  function sell(label, rate, text) {
    if (typeof BridgeInventory === 'undefined' || typeof BridgeInteractions === 'undefined') return;
    var all = BridgeInventory.getAll(), buys = [];
    Object.keys(all).forEach(function (id) {
      var it = item(id);
      if (it && it.value > 0) buys.push({ id: id, price: Math.max(1, Math.round(it.value * rate)) });
    });
    if (!buys.length) return say(label, 'THEY LOOK THROUGH YOUR PACK AND SHAKE THEIR HEAD.\n\nNOTHING IN THERE THEY CAN SELL ON. (KEYS, MAPS AND THINGS YOU BOUGHT TO EAT ARE YOURS TO KEEP.)');
    buys.sort(function (a, b) { return b.price - a.price; });
    BridgeInteractions.execute({ type: 'sell', label: label, buys: buys,
      dialog: (text || '') + (text ? '\n\n' : '') + 'THEY PAY ' + Math.round(rate * 10) + '/10 OF WHAT THINGS ARE WORTH. SPECIALISTS PAY MORE - YOUR BACKPACK (I) SAYS WHO.' });
  }
  // the best specialist for an item: whoever in people.json buys it dearest
  var buyers = null;
  function buyersOf() {
    if (buyers || typeof BridgePeople === 'undefined') return buyers || {};
    var all = BridgePeople.all(), out = {};
    if (!Object.keys(all).length) return {};
    Object.keys(all).forEach(function (pid) {
      var p = all[pid];
      (p.topics || []).forEach(function (t) {
        (t.sell || []).forEach(function (s) {
          if (!out[s.id] || out[s.id].price < s.price) out[s.id] = { price: s.price, who: p.name.split(/[ ,]/)[0] === 'The' ? p.name : p.name.split(' ')[0], world: (p.at[0] || {}).world };
        });
      });
    });
    return (buyers = out);
  }
  var PLACE = { 'lumar-sapphire': 'Sapphire Port', 'lumar-tern': 'Tern Holm', 'lumar-rose-mine': 'the Rose Mine', 'verdance': 'the farm on Verdance',
                'hoarfell': 'Fellhaven', 'cyber-noodle-bar': 'Cyber Noodles', 'junk-pawn-shop': 'the District' };
  /** A line for the Backpack: what it's worth and who pays best (HTML). */
  function worthLine(id) {
    var it = item(id);
    if (!it || !(it.value > 0)) return '';
    var b = buyersOf()[id], tr = Math.max(1, Math.round(it.value * 0.7));
    return 'Worth <b>' + it.value + '</b> coins' + (b ? ' · <b>' + esc(b.who) + '</b> pays ' + b.price + (PLACE[b.world] ? ' (' + esc(PLACE[b.world]) + ')' : '') : '') +
      ' · any trader ' + tr + ', the Chandler aboard ' + Math.max(1, Math.round(it.value * SHIP_RATE));
  }

  // ---- packs -----------------------------------------------------------------------------------------------------
  function nextPack() {
    if (typeof BridgeGear === 'undefined' || !BridgeGear.PACKS) return null;
    var P = BridgeGear.PACKS, have = BridgeGear.packSlots();
    var next = Object.keys(P).filter(function (k) { return P[k].slots > have; }).sort(function (a, b) { return P[a].slots - P[b].slots; })[0];
    if (!next) return null;
    var where = Object.keys(BridgeGear.SHOPS).filter(function (s) { return BridgeGear.SHOPS[s].goods.indexOf('pack:' + next) >= 0; })
      .map(function (s) { return SHOP_WHERE[s] || BridgeGear.SHOPS[s].title.toLowerCase(); });
    return { key: next, name: P[next].name, slots: P[next].slots, price: P[next].price, where: where.slice(0, 3).join(', ') };
  }

  // ---- the Ship's Chandler ---------------------------------------------------------------------------------------
  function chandler(inter) {
    var C = BridgeInteractions;
    var n = nextPack();
    C.choose({ title: 'Ship\'s Chandler', text: 'THE CHANDLER\'S CABINET: DECK FITTINGS, CHESTS, PACKS - AND A HATCH WHERE THE QUARTERMASTER TAKES WHAT YOU\'VE FOUND, NO QUESTIONS, AT A SHIP\'S PRICE.',
      rows: [
        { label: 'Deck fittings', sub: 'rugs, lamps, plants, curios, colours', icon: 'glimmer_lantern', pick: function () { if (typeof BridgeCatalog !== 'undefined') BridgeCatalog.show(inter.shop || 'wayfarer_chandler'); } },
        { label: 'Chests and storage', sub: 'crates, trunks, a strongbox', icon: 'pocket_watch', pick: chestShop },
        { label: 'Packs', sub: n ? 'next: ' + n.name + ', ' + n.slots + ' slots' : 'you have the biggest', icon: 'climbing_rope',
          pick: function () { if (typeof BridgeGear !== 'undefined') BridgeGear.open({ shop: 'wayfarer', intro: 'PACKS ON PEGS, WAXED CANVAS AND FRAME. MORE ROOM FOR WHAT YOU FIND.' }); } },
        { label: 'Sell your goods', sub: 'anything with a value, at 6/10 of it', icon: 'silverfin', pick: function () { sell('QUARTERMASTER\'S HATCH', SHIP_RATE, 'THE HATCH SLIDES OPEN.'); } }
      ], closeLabel: 'Leave' });
  }
  function chestShop(note) {
    var H = typeof BridgeHome !== 'undefined' ? BridgeHome : null;
    BridgeInteractions.choose({ title: 'Chests and storage', text: (typeof note === 'string' ? note + '\n\n' : '') +
        'SOMEWHERE TO KEEP WHAT YOU DON\'T CARRY. PUT THEM DOWN ABOARD OR IN ANY PLACE OF YOURS: PRESS H (FURNISH) THERE.',
      rows: Object.keys(CHESTS).map(function (id) {
        var P = H && H.piece ? H.piece(id) : null, price = P ? P.price : 0, have = H && H.spare ? H.spare(id) : 0;
        return { label: CHESTS[id].name, sub: CHESTS[id].slots + ' slots' + (have ? ' · ' + have + ' not put down yet' : ''), note: price ? price + ' coins' : '', disabled: !P,
                 pick: function () {
                   H.buyPiece(id).then(function (r) {
                     if (r && r.ok) { sfx('coin'); chestShop('BOUGHT: ' + CHESTS[id].name.toUpperCase() + '. IT\'S IN YOUR FURNISHING TRAY - PRESS H ABOARD OR AT HOME TO PUT IT DOWN.'); }
                     else chestShop(r && r.reason === 'insufficient' ? 'THAT\'S ' + price + ' COINS - MORE THAN YOU HAVE.' : 'THE SALE WON\'T GO THROUGH RIGHT NOW.');
                   });
                 } };
      }), buttons: [{ label: 'Back', act: function () { chandler({}); } }], closeLabel: 'Leave' });
  }

  // ---- a general trader ------------------------------------------------------------------------------------------
  function trader(inter) {
    var label = inter.label || 'TRADER', rows = [];
    if (inter.items && inter.items.length) {
      rows.push({ label: 'Buy', sub: inter.items.slice(0, 3).map(function (x) { var it = item(x.id); return it ? it.name.toLowerCase() : x.id; }).join(', ') + (inter.items.length > 3 ? '…' : ''),
                  icon: inter.items[0].id, pick: function () { BridgeInteractions.execute(Object.assign({}, inter, { type: 'vendor' })); } });
    }
    rows.push({ label: 'Sell your goods', sub: 'anything with a value, at ' + Math.round(inter.rate * 10) + '/10 of it', icon: 'sea_glass',
                pick: function () { sell(label, inter.rate, inter.intro); } });
    BridgeInteractions.choose({ title: label, text: inter.intro, rows: rows, closeLabel: 'Leave' });
  }

  // ---- the worlds: chests aboard, the Chandler, traders in the hubs ---------------------------------------------
  function decorate(worldId, data) {
    if (!data || !data.interactions || data._storage) return;
    data._storage = 1;
    data.interactions.forEach(function (it) {
      Object.keys(FIXED).forEach(function (id) {
        var F = FIXED[id];
        if (F.world === worldId && it.label === F.label) { it.type = 'chest'; it.chest = id; it.prompt = 'PRESS E TO OPEN'; delete it.dialog; }
      });
      if (worldId === 'bridge' && it.type === 'shop' && it.shop === 'wayfarer_chandler') { it.type = 'chandler'; it.prompt = 'PRESS E TO BROWSE'; }
      TRADERS.forEach(function (T) {
        if (T.world !== worldId || it.label !== T.label) return;
        if (T.at && (it.x !== T.at[0] || it.y !== T.at[1])) return;
        it.type = 'trader'; it.rate = T.rate; it.intro = T.intro; it.prompt = 'PRESS E TO TRADE';
        if (T.rename) it.label = T.rename;
      });
    });
  }
  function init() {
    if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.register) {
      BridgeInteractions.register('chest', open, 'Open');
      BridgeInteractions.register('trader', trader, 'Trade');
      BridgeInteractions.register('chandler', chandler, 'Browse');
    }
    if (typeof BridgeGear !== 'undefined' && BridgeGear.SHOPS && !BridgeGear.SHOPS.wayfarer) {
      BridgeGear.SHOPS.wayfarer = { title: 'THE SHIP\'S CHANDLER', goods: ['pack:satchel', 'pack:expedition'] };
    }
    // every world as it loads (and the one already loaded)
    if (typeof BridgeState !== 'undefined' && BridgeState.onChange) {
      BridgeState.onChange(function (s, prev, ctx) {
        if (s !== 'world' || typeof BridgeWorld === 'undefined') return;
        decorate(BridgeWorld.getWorldId(), BridgeWorld.getWorld());
      });
    }
    if (typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorld && BridgeWorld.getWorld()) decorate(BridgeWorld.getWorldId(), BridgeWorld.getWorld());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  return { open: open, chest: chest, count: count, sell: sell, worthLine: worthLine, nextPack: nextPack, decorate: decorate,
           CHESTS: CHESTS, FIXED: FIXED, TRADERS: TRADERS, _state: function () { return st; } };
})();
