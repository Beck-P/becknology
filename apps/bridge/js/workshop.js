/**
 * BridgeWorkshop — the Workshop on your holm: materials made into planks and bars, guns and fittings, tools and things
 * for your homes, on the clock (Beck: "move toward crafting… you can take it to your courtyard and hire smiths that can
 * build your own cool custom things… something you have to work up toward"). The plan: _claude_docs/spec-empire.md,
 * chunk 1. Built from the holm's ledger once the dock's rebuilt (js/holm.js BUILD.workshop).
 *
 * MATERIALS: each has a place to get it (`FROM`, said wherever you're short of one): pine off Diggen's Point and your own
 * holm, oak from Verdance and the Royal Yard, iron and copper ore from the Rose Mine, flax from your field, glass from
 * Sapphire, sailcloth from Rose Cove, powder from Crimson, moonglass from the Ferryman — and what you make of them
 * (planks, bars, sheet, rope, pitch). The workshop takes them from your pack, the holm's store and the holds of your
 * ships at the jetty; a crate of cargo breaks open into so many (`CRATES`: a crate of pine timber is eight logs).
 *
 * RECIPES take real time (`mins`: an apprentice's minutes), the inputs taken as the work starts. Your own bench works one
 * thing at a time, at your pace (half an apprentice's, a little quicker with every piece, `st.hand`), and only what you
 * set on it; SMITHS you hire (js/business.js `engage`: faces, grades, wages on the same payroll as your staff) work
 * through the queue by themselves wherever you are — apprentice ×1, journeyman ×1.5, master ×2.2, and the better ones
 * now and then do better (a piece more from the same stock, or offcuts back). Worked out from the clock (`advance`),
 * so it all carries on while you're away. What's made goes on the racks: the holm's store (js/holm.js, shared with the
 * warehouse) — guns and fittings as parts (`part_<id>`) that a harbourmaster fits for the yard's labour (js/harbour.js;
 * the slipway to come: `parts`, `takePart`, BridgeFleet.mount); things for your homes straight to your furnishing tray.
 *
 * PLANS: some things you know from the start; the rest you learn — bought (a person's `workshop` topic in
 * assets/people.json: Agnes Rook at the Royal Yard, Hob in the Rose Mine, Garro, Mira, the Ferryman, Old Pell, Ilsa),
 * for a favour (Mira's loom weights, the Ferryman's pearl and ink), or found (`plan_<id>` items: deep in the Rose Mine,
 * in a fishing chest, in flotsam). The best want what's only found far out: roseite, moonglass, star iron, scales.
 *
 * localStorage bridge_workshop. summary() is what the holm's ledger, the game menu's Ledger and the Captain's Office read.
 */
var BridgeWorkshop = (function () {
  var KEY = 'bridge_workshop', WID = 'lumar-holm', PLACE = 'workshop';
  var SMITHS = 3;                          // benches for hired hands; yours is the fourth
  var MASTER_AFTER = 8;                    // a master won't come to a workshop nobody's heard of
  var YOU = 0.5;                           // your pace at the bench, to begin with (an apprentice's is 1)
  var STEP = 60000, BACK = 14 * 86400000;  // worked out a minute at a time, up to a fortnight back

  // a crate of cargo (js/trade.js GOODS) in the store or a hold breaks open into so many of a material
  var CRATES = { timber: ['pine_log', 8], glassware: ['glass', 6], spore_silk: ['sailcloth', 4], blackpowder: ['powder', 6] };
  // where to get each thing a recipe wants
  var FROM = {
    pine_log: 'windfall pine on Diggen\'s Point and on your holm; Bess Tolliver sells logs, and a crate of pine timber is eight',
    oak_log: 'the log pile on Verdance and the Royal Yard\'s offcuts; Agnes Rook in Crownhaven sells it',
    plank: 'saw pine logs', oak_plank: 'saw oak logs',
    iron_ore: 'the Rose Mine, from the first floor', copper_ore: 'the Rose Mine\'s iron and silver seams; Hob has a cartload',
    iron_bar: 'smelt iron ore', copper_sheet: 'beat copper ore; Aldous on Sapphire sells it',
    flax: 'grow it: flax seed at Hollin\'s stall on Verdance', rope: 'twist flax; Bess and Old Pell sell coils',
    pitch: 'boil pine logs; Bess sells it', sailcloth: 'Mira Quell on Rose Cove; a crate of spore silk is four bolts; or weave flax',
    glass: 'Aldous on Sapphire sells panes; a crate of Sapphire glass is six', powder: 'Garro on Crimson Reach, by the horn; a keg is six',
    moonglass: 'the Ferryman on Midnight Isle, a few a day', moon_salt: 'the Ferryman, by the crate, into a hold',
    roseite: 'Rose Cove\'s terraces and the Rose Mine', sapphire_crystal: 'Sapphire\'s hills and the mine\'s middle floors',
    midnight_crystal: 'among the ruins on Midnight Isle', star_iron: 'the Rose Mine, floor 13 and down',
    songstone: 'the Rose Mine\'s deepest floors', gloam_scale: 'the Gloamserpent, out on the Midnight Sea'
  };

  // kind: make (a material or a tool, onto the racks) | gun | fit (a part, fitted to a ship) | home (a piece for your
  // homes). in: what it takes; out: what it makes; mins: an apprentice's minutes; plan: it has to be learnt first
  var RECIPES = {
    planks:       { kind: 'make', group: 'materials', name: 'Saw pine planks', in: { pine_log: 2 }, out: ['plank', 3], mins: 15 },
    oak_planks:   { kind: 'make', group: 'materials', name: 'Saw oak planks', in: { oak_log: 2 }, out: ['oak_plank', 3], mins: 20 },
    iron_bar:     { kind: 'make', group: 'materials', name: 'Smelt iron bars', in: { iron_ore: 3 }, out: ['iron_bar', 1], mins: 20 },
    copper_sheet: { kind: 'make', group: 'materials', name: 'Beat copper sheet', in: { copper_ore: 3 }, out: ['copper_sheet', 1], mins: 25 },
    pitch:        { kind: 'make', group: 'materials', name: 'Boil pitch', in: { pine_log: 2 }, out: ['pitch', 1], mins: 10 },
    rope:         { kind: 'make', group: 'materials', name: 'Twist rope', in: { flax: 3 }, out: ['rope', 2], mins: 15 },
    linen:        { kind: 'make', group: 'materials', name: 'Weave sailcloth', in: { flax: 4 }, out: ['sailcloth', 1], mins: 40 },
    moonglass:    { kind: 'make', group: 'materials', name: 'Grind moonglass', in: { glass: 2, midnight_crystal: 1, moon_salt: 1 }, out: ['moonglass', 2], mins: 120, plan: true },
    swivel:       { kind: 'gun', group: 'guns', in: { iron_bar: 2, plank: 1 }, mins: 45 },
    long_nine:    { kind: 'gun', group: 'guns', in: { iron_bar: 5, oak_plank: 2, powder: 1 }, mins: 120, plan: true },
    carronade:    { kind: 'gun', group: 'guns', in: { iron_bar: 6, copper_sheet: 1, powder: 2 }, mins: 150, plan: true },
    chaser:       { kind: 'gun', group: 'guns', in: { iron_bar: 5, oak_plank: 2, copper_sheet: 1, powder: 1 }, mins: 180, plan: true },
    moon_harpoon: { kind: 'gun', group: 'guns', in: { iron_bar: 3, moonglass: 2, oak_plank: 2, rope: 1 }, mins: 240, plan: true },
    oak:          { kind: 'fit', group: 'fittings', in: { oak_plank: 8, pitch: 2 }, mins: 120 },
    sheathing:    { kind: 'fit', group: 'fittings', in: { copper_sheet: 6, pitch: 2 }, mins: 180, plan: true },
    roseite:      { kind: 'fit', group: 'fittings', in: { roseite: 10, pitch: 2 }, mins: 180, plan: true },
    crystal_sails:{ kind: 'fit', group: 'fittings', in: { sailcloth: 4, roseite: 4, rope: 2 }, mins: 240, plan: true },
    storm_rig:    { kind: 'fit', group: 'fittings', in: { rope: 6, sailcloth: 2, iron_bar: 2 }, mins: 180, plan: true },
    moon_lantern: { kind: 'fit', group: 'fittings', in: { moonglass: 2, copper_sheet: 1, glass: 1 }, mins: 240, plan: true },
    ironwood:     { kind: 'fit', group: 'fittings', in: { oak_plank: 8, iron_bar: 4, star_iron: 2, pitch: 3 }, mins: 360, plan: true },
    gloamscale:   { kind: 'fit', group: 'fittings', in: { gloam_scale: 5, copper_sheet: 3, pitch: 2 }, mins: 480, plan: true },
    iron_pickaxe: { kind: 'make', group: 'tools', in: { iron_bar: 2, oak_plank: 1 }, out: ['iron_pickaxe', 1], mins: 40 },
    star_pickaxe: { kind: 'make', group: 'tools', in: { star_iron: 3, iron_bar: 1, oak_plank: 1 }, out: ['star_pickaxe', 1], mins: 120, plan: true },
    prospector_pick: { kind: 'make', group: 'tools', in: { star_iron: 3, songstone: 1, copper_sheet: 1, oak_plank: 1 }, out: ['prospector_pick', 1], mins: 240, plan: true },
    greenheart_rod: { kind: 'make', group: 'tools', in: { oak_plank: 2, rope: 1, copper_sheet: 1 }, out: ['greenheart_rod', 1], mins: 90, plan: true },
    oak_table:    { kind: 'home', group: 'home', in: { oak_plank: 3 }, mins: 30 },
    trunk:        { kind: 'home', group: 'home', in: { plank: 3, iron_bar: 1 }, mins: 40 },
    crystal_lamp: { kind: 'home', group: 'home', in: { glass: 2, copper_sheet: 1, sapphire_crystal: 2 }, mins: 60 },
    telescope:    { kind: 'home', group: 'home', in: { glass: 2, copper_sheet: 2, oak_plank: 1 }, mins: 120, plan: true }
  };
  var GROUPS = [['materials', 'Materials'], ['guns', 'Guns'], ['fittings', 'Fittings'], ['tools', 'Tools'], ['home', 'For your homes']];
  var PIECES = { oak_table: 'Oak Table', trunk: 'Old Trunk', crystal_lamp: 'Crystal Lamp', telescope: 'Telescope' };   // (js/home.js names them once it's loaded)
  // where each plan is learnt (the Plans page)
  var WHERE = {
    moonglass: 'the Ferryman on Midnight Isle, for a favour', long_nine: 'Agnes Rook at the Royal Yard, Crownhaven', chaser: 'Agnes Rook at the Royal Yard',
    sheathing: 'Agnes Rook at the Royal Yard', carronade: 'Garro on Crimson Reach', storm_rig: 'Garro on Crimson Reach',
    roseite: 'Mira Quell on Rose Cove', crystal_sails: 'Mira Quell on Rose Cove, for a favour', moon_lantern: 'the Ferryman', moon_harpoon: 'the Ferryman',
    gloamscale: 'the Ferryman, for a favour', ironwood: 'an old plan, lost somewhere deep in the Rose Mine', star_pickaxe: 'Hob, in the Rose Mine',
    prospector_pick: 'Hob, once you\'ve been down to the fifteenth floor', greenheart_rod: 'Old Pell on Tern Holm, or a fishing chest',
    telescope: 'Ilsa Venn the cartographer, on Diggen\'s Point'
  };

  // the people who sell materials and plans, and the favours some ask before they'll teach you (a `workshop: <key>`
  // topic in assets/people.json): sells [item, price, a day's supply], plans [recipe, price, gate], favours
  var SHOPS = {
    bess:      { sells: [['pine_log', 6], ['pitch', 12], ['rope', 14]] },
    wright:    { sells: [['oak_log', 18]], plans: [['long_nine', 300], ['chaser', 450], ['sheathing', 380]] },
    hob:       { sells: [['copper_ore', 14]], plans: [['star_pickaxe', 250], ['prospector_pick', 650, 'deep']] },
    mira:      { sells: [['sailcloth', 34]], plans: [['roseite', 360]],
                 favours: [{ r: 'crystal_sails', want: { sapphire_crystal: 4 },
                             ask: 'MY LOOM WANTS WEIGHTS: FOUR SAPPHIRE CRYSTALS, CLEAR ONES. BRING ME THOSE AND I\'LL SHOW YOU HOW THE CRYSTAL GOES INTO THE WARP.',
                             thanks: 'OH, THEY\'RE CLEAR AS WATER. SIT. WATCH MY HANDS: OVER, UNDER, AND THE CRYSTAL IN WITH EVERY SEVENTH THREAD.' }] },
    garro:     { sells: [['powder', 15]], plans: [['carronade', 420], ['storm_rig', 360]] },
    ferryman:  { sells: [['moonglass', 80, 3]], plans: [['moon_lantern', 520], ['moon_harpoon', 560]],
                 favours: [{ r: 'moonglass', want: { star_pearl: 1 },
                             ask: '...A PEARL FROM THE MOON POOL. ONE. I HAVE NOT SEEN ONE IN A LONG WHILE. BRING IT, AND I WILL SHOW YOU HOW THE GLASS IS GROUND.',
                             thanks: '...STARS, MOVING IN IT. YES. GRIND THE GLASS WITH VIOLET CRYSTAL AND MOON SALT, UNDER A FULL MOON IF YOU CAN. IF YOU CANNOT, ANY MOON.' },
                           { r: 'gloamscale', want: { abyss_ink: 1 },
                             ask: 'THE SEA KEEPS ITS OWN BOOK. I KEEP MINE IN ITS INK - AND I AM OUT OF IT. THE DEEP MAW CARRIES IT. BRING ME A JAR.',
                             thanks: '...FRESH. FOR THAT: THE SERPENT\'S SCALES, LAPPED LIKE A FISH\'S ON A HULL. THE ROCKS SLIDE OFF THEM. SO DOES EVERYTHING ELSE.' }] },
    aldous:    { sells: [['glass', 11], ['copper_sheet', 32]] },
    tern_pell: { sells: [['rope', 12]], plans: [['greenheart_rod', 180]] },
    ilsa:      { plans: [['telescope', 160]] }
  };

  var GRADES = {
    apprentice: { name: 'Apprentice smith', short: 'apprentice', pace: 1.0, luck: 0, wage: [60, 110], colour: 'white' },
    journeyman: { name: 'Journeyman smith', short: 'journeyman', pace: 1.5, luck: 0.12, wage: [170, 280], colour: 'cyan' },
    master:     { name: 'Master smith', short: 'master', pace: 2.2, luck: 0.25, wage: [420, 650], colour: 'gold' }
  };
  var NAMES = ['Bryn Collier', 'Tess Hammond', 'Owen Forde', 'Ivy Smeaton', 'Cal Brisk', 'Nell Wainwright', 'Abel Thorne', 'Martha Coyle',
               'Jem Tolley', 'Rhoda Gale', 'Silas Penhale', 'Kit Ashdown'];

  var st = load();
  function load() {
    var d;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    d = d || {};
    return { learnt: d.learnt || {}, bench: d.bench || null, queue: d.queue || [], made: d.made || 0, hand: d.hand || 0, log: d.log || [],
             n: d.n || 0, last: d.last || Date.now(), bought: d.bought || {}, done: d.done || {}, seen: d.seen || 0 };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode */ } }

  function inv() { return typeof BridgeInventory !== 'undefined' ? BridgeInventory : null; }
  function H() { return typeof BridgeHolm !== 'undefined' ? BridgeHolm : null; }
  function F() { return typeof BridgeFleet !== 'undefined' ? BridgeFleet : null; }
  function B() { return typeof BridgeBusiness !== 'undefined' ? BridgeBusiness : null; }
  function choose(spec) { if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.choose) BridgeInteractions.choose(spec); }
  function toast(a, b, c) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(a, b, c); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function pay(n, why) {
    return typeof BridgeProgression !== 'undefined' && BridgeProgression.wagerCoins ? BridgeProgression.wagerCoins(n, why).then(function (r) { return r || { ok: false, reason: 'error' }; })
                                                                                   : Promise.resolve({ ok: false, reason: 'offline' });
  }
  function why(r) { var x = r && r.reason; return x === 'offline' || x === 'no_client' || x === 'no_pilot' || x === 'error' ? 'NO WAY TO MOVE COINS RIGHT NOW.' : 'NOT ENOUGH COINS.'; }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; }
  function etDay() { return Math.floor((typeof BridgeClock !== 'undefined' && BridgeClock.etNow ? BridgeClock.etNow() : Date.now()) / 86400000); }
  function built() { return !!(H() && H().owned() && H().built('workshop')); }
  function iname(id) { var it = typeof BridgeItems !== 'undefined' && BridgeItems.get(id); if (it) return it.name; var T = typeof BridgeTrade !== 'undefined' ? BridgeTrade : null; return T ? T.name(id) : id; }
  // what you can't count by itself comes in coils and pots and bolts
  var MASS = { rope: ['coil', 'coils'], pitch: ['pot', 'pots'], sailcloth: ['bolt', 'bolts'], glass: ['pane', 'panes'], powder: ['horn', 'horns'],
               flax: ['sheaf', 'sheaves'], moonglass: ['shard', 'shards'] };
  function plural(n, id) {
    var nm = iname(id).toLowerCase(), M = MASS[id];
    if (M) return (n === 1 ? 'a ' + M[0] : n + ' ' + M[1]) + ' of ' + nm;
    if (n === 1) return (/^[aeiou]/.test(nm) ? 'an ' : 'a ') + nm;
    return n + ' ' + (/(sh|ch|s|x)$/.test(nm) ? nm + 'es' : /ore$/.test(nm) ? nm : nm + 's');
  }
  function an(name) { var nm = String(name).toLowerCase(); return (/^[aeiou]/.test(nm) ? 'an ' : 'a ') + nm; }
  function hm(mins) { mins = Math.max(1, Math.round(mins)); return mins < 60 ? mins + ' min' : mins % 60 ? Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm' : mins / 60 + 'h'; }

  // ---- what each recipe is called, and looks like ------------------------------------------------------------------
  function rname(r) {
    var R = RECIPES[r], f = F();
    if (!R) return r;
    if (R.name) return R.name;
    if (R.kind === 'gun' || R.kind === 'fit') { var X = f && (f.GUNS[r] || f.FITS[r]); return X ? X.name : r; }
    if (R.kind === 'home') { var P = typeof BridgeHome !== 'undefined' && BridgeHome.piece && BridgeHome.piece(r); return P ? P.name : PIECES[r] || r; }
    return iname(R.out[0]);
  }
  function iconOf(r) { var R = RECIPES[r]; return !R ? null : R.kind === 'gun' || R.kind === 'fit' ? 'part_' + r : R.kind === 'home' ? R.in && Object.keys(R.in)[0] : R.out[0]; }
  // a gun, a lantern, a table: one of them; sheathing, doubling, sails, rigging: some
  function one(r) { var R = RECIPES[r], nm = rname(r); return R.kind === 'fit' && r !== 'moon_lantern' ? nm.toLowerCase() : an(nm); }
  function makes(r) {
    var R = RECIPES[r];
    if (R.kind === 'gun' || R.kind === 'fit') return one(r) + ', ready to fit';
    if (R.kind === 'home') return one(r) + ' for your homes';
    return plural(R.out[1], R.out[0]);
  }
  function needs(r, k) { var R = RECIPES[r]; return Object.keys(R.in).map(function (id) { return plural(R.in[id] * (k || 1), id); }).join(', '); }
  function blurb(r) {
    var R = RECIPES[r], f = F(), X = f && (f.GUNS[r] || f.FITS[r]);
    if (X) return X.blurb;
    if (R.kind === 'home') return 'For your homes: it goes straight to your furnishing tray. Put it down with H in any place of yours.';
    var it = typeof BridgeItems !== 'undefined' && BridgeItems.get(R.out[0]);
    return it ? it.desc : '';
  }
  function known(r) { return !!RECIPES[r] && (!RECIPES[r].plan || !!st.learnt[r]); }
  function learn(r, quiet) {
    if (!RECIPES[r] || known(r)) return false;
    st.learnt[r] = Date.now(); save();
    if (!quiet) { toast('Learnt', rname(r), 'Make it at your workshop'); sfx('quest'); }
    return true;
  }

  // ---- parts and plans as things you can carry (registered with js/items.js, like the cargo in js/trade.js) ---------
  function px(ctx, x, y, u, c, rects) { ctx.fillStyle = c; for (var i = 0; i < rects.length; i++) ctx.fillRect(x + rects[i][0] * u, y + rects[i][1] * u, rects[i][2] * u, rects[i][3] * u); }
  // barrel colours, length and thickness (a carronade short and fat, a chaser long), the muzzle to the right
  var GUN_LOOK = { swivel: ['#4a4a54', '#a0a0b0', 9, 2], long_nine: ['#34343e', '#7a7a8a', 12, 2], carronade: ['#2a2a32', '#6a6a7a', 8, 3],
                   chaser: ['#3a3444', '#8a7c9a', 13, 2], moon_harpoon: ['#7a80b0', '#e8ecff', 11, 2] };
  function gunIcon(what) {
    var L = GUN_LOOK[what] || GUN_LOOK.long_nine, len = L[2], th = L[3];
    return function (ctx, x, y, s) {
      var u = s / 16, x0 = 15 - len, y0 = what === 'swivel' ? 4 : 6 - th;
      if (what === 'swivel') {                             // a little gun on a yoke and a post
        px(ctx, x, y, u, '#120c08', [[7, 6, 3, 3], [8, 8, 1, 6], [5, 13, 7, 2]]);
        px(ctx, x, y, u, '#6a6a74', [[8, 7, 1, 1], [6, 14, 5, 1]]);
      } else {                                             // a truck carriage, and its wheels
        px(ctx, x, y, u, '#120c08', [[2, y0 + th, 9, 4]]);
        px(ctx, x, y, u, '#7a5430', [[3, y0 + th + 1, 7, 2]]); px(ctx, x, y, u, '#9a7040', [[3, y0 + th + 1, 7, 1]]);
        [[2, 11], [8, 11]].forEach(function (w) {
          px(ctx, x, y, u, '#120c08', [[w[0] + 1, w[1], 2, 4], [w[0], w[1] + 1, 4, 2]]); px(ctx, x, y, u, '#5a3a1e', [[w[0] + 1, w[1] + 1, 2, 2]]);
        });
      }
      px(ctx, x, y, u, '#120c08', [[x0 - 1, y0 - 1, len + 1, th + 2], [x0 - 2, y0, 1, th]]);              // the barrel, the knob at the breech
      px(ctx, x, y, u, L[0], [[x0, y0, len - 1, th]]);
      px(ctx, x, y, u, L[1], [[x0 + 1, y0, len - 3, 1]]);
      px(ctx, x, y, u, '#0a0a0c', [[x0 + len - 2, y0 - 1, 2, th + 2]]);                                    // the muzzle's swell
      if (what === 'moon_harpoon') px(ctx, x, y, u, '#f8f8ff', [[14, y0 - 1, 2, th + 2]]);                  // the bolt's moonglass head
    };
  }
  var FIT_LOOK = {
    oak: function (ctx, x, y, u) { boards(ctx, x, y, u, '#8a6038', '#b0844e', '#3a2a1a'); },
    ironwood: function (ctx, x, y, u) { boards(ctx, x, y, u, '#4a3424', '#6a4a30', '#ffe080'); },
    sheathing: function (ctx, x, y, u) { plates(ctx, x, y, u, '#c87a3a', '#f0b070', '#6a3a18'); },
    roseite: function (ctx, x, y, u) { plates(ctx, x, y, u, '#e070a0', '#ffd0e8', '#6a2a4a'); },
    gloamscale: function (ctx, x, y, u) {
      px(ctx, x, y, u, '#0c1410', [[1, 3, 14, 11]]);
      for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) {
        var cx = 2 + c * 3 + (r % 2), cy = 4 + r * 3;
        px(ctx, x, y, u, '#a8c8b0', [[cx, cy, 3, 3]]); px(ctx, x, y, u, '#e0f8e8', [[cx, cy, 2, 1]]); px(ctx, x, y, u, '#c8ff70', [[cx + 1, cy + 1, 1, 1]]);
      }
    },
    crystal_sails: function (ctx, x, y, u) {
      px(ctx, x, y, u, '#1a1410', [[3, 1, 2, 14], [5, 2, 8, 10]]);
      px(ctx, x, y, u, '#6a4a2a', [[3, 1, 1, 14]]);
      px(ctx, x, y, u, '#f0e0ec', [[5, 3, 7, 8]]); px(ctx, x, y, u, '#ffd0e8', [[5, 3, 7, 2]]);
      px(ctx, x, y, u, '#e070a0', [[7, 6, 1, 1], [10, 5, 1, 1], [8, 9, 1, 1]]);
    },
    storm_rig: function (ctx, x, y, u) {
      px(ctx, x, y, u, '#2a1a08', [[2, 6, 8, 8]]); px(ctx, x, y, u, '#b89858', [[3, 7, 6, 6]]); px(ctx, x, y, u, '#2a1a08', [[5, 9, 2, 2]]);
      px(ctx, x, y, u, '#120c08', [[10, 1, 5, 7]]); px(ctx, x, y, u, '#8a6a40', [[11, 2, 3, 5]]); px(ctx, x, y, u, '#c03028', [[12, 4, 1, 1]]);
      px(ctx, x, y, u, '#b89858', [[12, 8, 1, 4]]);
    },
    moon_lantern: function (ctx, x, y, u) {
      px(ctx, x, y, u, 'rgba(200,210,255,0.25)', [[2, 2, 12, 13]]);
      px(ctx, x, y, u, '#10101a', [[6, 1, 4, 2], [4, 3, 8, 11]]);
      px(ctx, x, y, u, '#c87a3a', [[5, 3, 6, 1], [5, 13, 6, 1]]);
      px(ctx, x, y, u, '#c8d0ff', [[5, 4, 6, 9]]); px(ctx, x, y, u, '#ffffff', [[7, 6, 2, 4]]);
    }
  };
  function boards(ctx, x, y, u, wood, hi, bolt) {
    [[1, 3], [2, 7], [1, 11]].forEach(function (b) {
      px(ctx, x, y, u, '#140c06', [[b[0], b[1], 14, 4]]);
      px(ctx, x, y, u, wood, [[b[0] + 1, b[1] + 1, 12, 2]]); px(ctx, x, y, u, hi, [[b[0] + 1, b[1] + 1, 12, 1]]);
      px(ctx, x, y, u, bolt, [[b[0] + 2, b[1] + 2, 1, 1], [b[0] + 11, b[1] + 2, 1, 1]]);
    });
  }
  function plates(ctx, x, y, u, mid, hi, dark) {
    px(ctx, x, y, u, '#120a06', [[1, 2, 14, 12]]);
    for (var r = 0; r < 3; r++) for (var c = 0; c < 2; c++) {
      var cx = 2 + c * 6 + (r % 2) * 2, cy = 3 + r * 4;
      px(ctx, x, y, u, mid, [[cx, cy, 6, 3]]); px(ctx, x, y, u, hi, [[cx, cy, 6, 1]]); px(ctx, x, y, u, dark, [[cx + 1, cy + 2, 1, 1], [cx + 4, cy + 2, 1, 1]]);
    }
  }
  function fitIcon(what) { return function (ctx, x, y, s) { (FIT_LOOK[what] || FIT_LOOK.oak)(ctx, x, y, s / 16); }; }
  function planIcon(ctx, x, y, s) {                      // a shipwright's plan, inked on oiled paper, a red tape round it
    var u = s / 16;
    px(ctx, x, y, u, '#2a1a0e', [[2, 3, 12, 11]]);
    px(ctx, x, y, u, '#e0d0a8', [[3, 4, 10, 9]]);
    px(ctx, x, y, u, '#2a4a8a', [[4, 6, 6, 1], [4, 8, 3, 1], [8, 8, 3, 3], [4, 10, 3, 1], [5, 11, 6, 1]]);
    px(ctx, x, y, u, '#b8a47a', [[12, 4, 1, 9]]);
    px(ctx, x, y, u, '#b02018', [[10, 3, 2, 11]]);
  }
  function partOf(id) { return id && id.indexOf('part_') === 0 ? id.slice(5) : null; }
  (function register() {
    if (typeof BridgeItems === 'undefined' || !BridgeItems.all) return;
    var IT = BridgeItems.all(), f = F();
    Object.keys(RECIPES).forEach(function (r) {
      var R = RECIPES[r];
      if ((R.kind === 'gun' || R.kind === 'fit') && f) {
        var X = f.GUNS[r] || f.FITS[r];
        if (X && !IT['part_' + r]) IT['part_' + r] = { id: 'part_' + r, name: X.name, type: 'part', stackable: true, value: Math.round(X.price * 0.4), draw: R.kind === 'gun' ? gunIcon(r) : fitIcon(r),
          desc: (R.kind === 'gun' ? 'A gun' : 'A fitting') + ' from your own workshop, ready to fit. Any harbourmaster will put it aboard for their labour.' };
      }
      if (R.plan && !IT['plan_' + r]) IT['plan_' + r] = { id: 'plan_' + r, name: 'Plan: ' + rname(r), type: 'plan', stackable: false, value: 0, draw: planIcon,
        desc: 'Inked on oiled paper, every measurement in a careful hand. Use it to learn to make the ' + rname(r).toLowerCase() + ' at your workshop.',
        onUse: function () { var k = this.id.slice(5); if (known(k)) { say('YOU KNOW THIS ONE ALREADY.'); return false; } learn(k); return true; } };
    });
  })();
  function say(text, title) { choose({ title: title || 'The workshop', text: text, closeLabel: 'Done' }); }

  // ---- materials: in your pack, the holm's store, the holds at the jetty, and crates broken open ----------------------
  function onHolm() { var w = typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId ? BridgeWorld.getWorldId() : ''; return !!w && w.indexOf(WID) === 0; }
  function holds() {                                     // your ships lying at the holm (the sloop, when you're there)
    var f = F();
    return f ? f.all().filter(function (s) { return !s.away && (s.type === 'sloop' ? onHolm() : s.at === WID); }) : [];
  }
  function inStore(id) { return H() ? H().stored(id) : 0; }
  function inHolds(id) { return holds().reduce(function (n, s) { return n + ((s.hold || {})[id] || 0); }, 0); }
  function carried(id) { return inv() ? inv().getCount(id) : 0; }
  function have(id) {
    var n = carried(id) + inStore(id) + inHolds(id);
    Object.keys(CRATES).forEach(function (g) { if (CRATES[g][0] === id) n += (inStore(g) + inHolds(g)) * CRATES[g][1]; });
    return n;
  }
  function shortOf(r, times) {
    var R = RECIPES[r], k = times || 1;
    return Object.keys(R.in).filter(function (id) { return have(id) < R.in[id] * k; });
  }
  // take n: your pack first (you brought it for this), then the store, the holds, and crates broken open (what's left
  // over from a crate goes on the racks)
  function take(id, n) {
    var I = inv(), h = H(), f = F();
    var a = Math.min(n, carried(id));
    if (a > 0 && I) { I.removeItem(id, a); n -= a; }
    if (n > 0 && h) n -= h.storeTake(id, n);
    holds().forEach(function (s) {
      if (n <= 0 || !s.hold[id]) return;
      var b = Math.min(n, s.hold[id]); s.hold[id] -= b; if (s.hold[id] <= 0) delete s.hold[id]; n -= b;
      if (f) f.save();
    });
    Object.keys(CRATES).forEach(function (g) {
      if (CRATES[g][0] !== id) return;
      while (n > 0) {
        var got = h && h.storeTake(g, 1);
        if (!got) {
          var s = holds().filter(function (x) { return x.hold[g] > 0; })[0];
          if (!s) break;
          s.hold[g]--; if (s.hold[g] <= 0) delete s.hold[g]; if (f) f.save();
        }
        var k = CRATES[g][1], use = Math.min(n, k);
        n -= use;
        if (k > use && h) h.storeAdd(id, k - use);
      }
    });
    return n <= 0;
  }
  // everything the workshop deals in (what "put it away" moves from your pack to the store)
  var MATS = (function () {
    var m = {};
    Object.keys(RECIPES).forEach(function (r) {
      var R = RECIPES[r];
      Object.keys(R.in).forEach(function (id) { m[id] = 1; });
      if (R.kind === 'make') m[R.out[0]] = 1;
      if (R.kind === 'gun' || R.kind === 'fit') m['part_' + r] = 1;
    });
    return m;
  })();
  function isTool(id) { var it = typeof BridgeItems !== 'undefined' && BridgeItems.get(id); return !!it && it.type === 'tool'; }

  // ---- smiths: hired through the business payroll (js/business.js), `at: 'workshop'` ---------------------------------
  function smiths() { return B() && B().staff ? B().staff(PLACE) : []; }
  function smith(id) { return smiths().filter(function (p) { return p.id === id; })[0] || null; }
  function working(p, t) { return !(p.missed > 0) && (!p.arrives || p.arrives <= (t || Date.now())); }    // unpaid, they down tools
  function growth(p, t) { return 1 + Math.min(0.3, Math.max(0, (t || Date.now()) - (p.hired || Date.now())) / (7 * 86400000) * 0.02); }
  function pace(p, t) { var G = GRADES[p.grade] || GRADES.apprentice; return G.pace * (p.skill || 1) * growth(p, t); }
  function yourPace() { return YOU + Math.min(0.3, st.hand || 0); }
  function faceOf(p) { var G = GRADES[p.grade] || GRADES.apprentice; return { seed: p.name + ':' + p.key, style: 'coat', colour: G.colour }; }
  function perk(p) {
    var G = GRADES[p.grade] || GRADES.apprentice, x = Math.round(pace(p) * 10) / 10;
    return 'works at ×' + x + (G.luck ? ' · now and then makes a piece more, or saves the offcuts' : '');
  }
  /** Today's three looking for work at your forge: an apprentice, a journeyman and a master (hashed by the ET day). */
  function candidates() {
    var day = etDay(), taken = B() ? B().staff().map(function (p) { return p.key; }) : [];
    return ['apprentice', 'journeyman', 'master'].map(function (g, i) {
      var key = day + ':workshop:' + g, h = hash(key), G = GRADES[g];
      return { key: key, grade: g, tier: g, title: G.name, skill: 0.92 + h * 0.2, taken: taken.indexOf(key) >= 0,
               name: NAMES[(Math.floor(hash(day + ':workshop:names') * NAMES.length) + i * 5) % NAMES.length],
               wage: Math.round((G.wage[0] + (G.wage[1] - G.wage[0]) * h) / 10) * 10 };
    });
  }

  // ---- the clock: your bench and the smiths' work, worked out a minute at a time ----------------------------------------
  function leftMs(j, t) {
    var who = j.by === 'you' ? null : smith(j.by), sp = j.by === 'you' ? yourPace() : who ? pace(who, t) : 1;
    return Math.max(0, (j.need - j.done) / sp);
  }
  function advance(now) {
    now = now || Date.now();
    var from = Math.max(st.last || now, now - BACK), t = from, fin = [], crew = smiths();
    var ids = crew.map(function (p) { return p.id; });
    st.queue.forEach(function (j) { if (j.by && ids.indexOf(j.by) < 0) j.by = null; });   // walked out: someone else takes it up
    while (t < now && (st.bench || (st.queue.length && crew.length))) {
      var dt = Math.min(STEP, now - t), at = t + dt;
      if (st.bench) {
        st.bench.done += dt * yourPace();
        if (st.bench.done >= st.bench.need) { fin.push(finish(st.bench, 'you', at)); st.bench = null; }
      }
      crew.forEach(function (p) {
        if (!working(p, t) || at <= (p.hired || 0)) return;                              // (not before they were taken on)
        var left = Math.min(dt, at - (p.hired || 0)) * pace(p, t);
        while (left > 0) {
          var j = st.queue.filter(function (q) { return q.by === p.id; })[0] || st.queue.filter(function (q) { return !q.by; })[0];
          if (!j) break;
          j.by = p.id;
          var use = Math.min(left, j.need - j.done);
          j.done += use; left -= use;
          if (j.done >= j.need) { st.queue.splice(st.queue.indexOf(j), 1); fin.push(finish(j, p, at)); }
        }
      });
      t = at;
    }
    crew.forEach(function (p) {                         // a smith who's free takes up the next that's waiting
      if (working(p, now) && !st.queue.some(function (q) { return q.by === p.id; })) { var w = st.queue.filter(function (q) { return !q.by; })[0]; if (w) w.by = p.id; }
    });
    var moved = now - (st.last || 0) > 30000;
    st.last = now;
    if (fin.length) {
      save();
      var mine = fin.filter(function (x) { return x.you; }).length, list = fin.map(function (x) { return x.text; });
      toast('The workshop', fin.length === 1 ? cap(fin[0].text) + ' made' : fin.length + ' things made', fin.length === 1 ? (mine ? 'at your bench' : 'by ' + fin[0].by) : list.slice(0, 3).join(', '));
    } else if (moved) save();
    return fin;
  }
  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function finish(j, who, at) {
    var R = RECIPES[j.r], you = who === 'you', G = you ? null : GRADES[who.grade] || GRADES.apprentice;
    var lucky = Math.random() < (you ? 0.04 : G.luck), text = deliver(j.r, lucky, j);
    st.made++;
    if (you) st.hand = Math.min(0.3, (st.hand || 0) + 0.01);
    var by = you ? 'you' : who.name;
    note((you ? 'You made ' : by + ' made ') + text + (lucky ? (R.kind === 'make' && !isTool(R.out[0]) ? ' - and one more besides' : ' - and saved the offcuts') : '') + '.', at);
    return { r: j.r, text: text, by: by, you: you, lucky: lucky, at: at };
  }
  // what a finished job leaves: on the racks (the holm's store), or in your furnishing tray
  function deliver(r, lucky, j) {
    var R = RECIPES[r], h = H();
    if (R.kind === 'home') {
      if (typeof BridgeHome !== 'undefined' && BridgeHome.givePiece) BridgeHome.givePiece(r, 1);
      return one(r);
    }
    if (R.kind === 'gun' || R.kind === 'fit') {
      if (h) h.storeAdd('part_' + r, 1);
      if (lucky) offcuts(j);
      return one(r);
    }
    var n = R.out[1] + (lucky && !isTool(R.out[0]) ? 1 : 0);
    if (h) h.storeAdd(R.out[0], n);
    if (lucky && isTool(R.out[0])) offcuts(j);
    if (typeof BridgeCodex !== 'undefined' && BridgeCodex.note) BridgeCodex.note(R.out[0]);
    return plural(n, R.out[0]);
  }
  // a good smith wastes nothing: the commonest of what went into it, one back on the racks
  function offcuts(j) {
    var took = (j && j.took) || {}, best = null;
    Object.keys(took).forEach(function (id) { if (['star_iron', 'songstone', 'gloam_scale', 'moonglass', 'moon_salt'].indexOf(id) < 0 && (!best || took[id] > took[best])) best = id; });
    if (best && H()) H().storeAdd(best, 1);
  }
  function note(t, at) { st.log.unshift({ at: at || Date.now(), t: t }); st.log = st.log.slice(0, 20); }

  // ---- starting work ----------------------------------------------------------------------------------------------------
  /** Start `r`: on your bench (`you`) or into the smiths' queue. The inputs are taken now. {ok, reason, job} */
  function start(r, you) {
    var R = RECIPES[r];
    if (!R || !known(r)) return { ok: false, reason: 'unknown' };
    if (!built()) return { ok: false, reason: 'no_workshop' };
    advance();
    if (you && st.bench) return { ok: false, reason: 'busy' };
    var short = shortOf(r);
    if (short.length) return { ok: false, reason: 'short', short: short };
    var took = {};
    Object.keys(R.in).forEach(function (id) { take(id, R.in[id]); took[id] = R.in[id]; });
    var j = { id: 'j' + (++st.n), r: r, need: R.mins * 60000, done: 0, by: you ? 'you' : null, at: Date.now(), took: took };
    if (you) st.bench = j; else st.queue.push(j);
    st.last = Date.now();
    save();
    sfx('pick');                                                    // the first blow
    return { ok: true, job: j };
  }
  /** Set a job aside: what went into it goes back on the racks. */
  function cancel(id) {
    advance();
    var j = st.bench && st.bench.id === id ? st.bench : st.queue.filter(function (q) { return q.id === id; })[0];
    if (!j) return false;
    Object.keys(j.took || {}).forEach(function (k) { if (H()) H().storeAdd(k, j.took[k]); });
    if (j === st.bench) st.bench = null; else st.queue.splice(st.queue.indexOf(j), 1);
    save();
    return true;
  }

  // ---- the screens ------------------------------------------------------------------------------------------------------
  function status() {
    var sm = smiths(), b = st.bench, busy = st.queue.filter(function (j) { return j.by; });
    var bits = [];
    bits.push(b ? 'YOUR BENCH: ' + rname(b.r).toUpperCase() + ', ' + hm(leftMs(b) / 60000).toUpperCase() + ' TO GO' : 'YOUR BENCH IS FREE');
    busy.forEach(function (j) { var p = smith(j.by); if (p) bits.push(p.name.toUpperCase() + ' ON ' + rname(j.r).toUpperCase()); });
    var wait = st.queue.length - busy.length;
    if (wait) bits.push(wait + ' WAITING');
    if (!sm.length && st.queue.length) bits.push('NO SMITHS TO WORK THE QUEUE: HIRE ONE');
    if (sm.length && !st.queue.length) bits.push((sm.length === 1 ? 'YOUR SMITH IS' : 'YOUR SMITHS ARE') + ' IDLE');
    return 'THE FORGE IS LIT. ' + bits.join('. ') + '.';
  }
  function open(note) {
    if (!built()) { if (H()) H().ledger(); return; }
    advance();
    st.seen = Date.now(); save();
    var sm = smiths(), b = st.bench, knownN = Object.keys(RECIPES).filter(known).length, items = storeItems();
    choose({ title: 'The workshop', text: note || status(), rows: [
      { label: 'Your bench', icon: b ? iconOf(b.r) : 'plank', sub: b ? rname(b.r) + ' · ' + hm(leftMs(b) / 60000) + ' to go' : 'free - make something with your own hands',
        note: b ? 'see it' : 'make', pick: b ? benchCard : function () { book(true); } },
      { label: 'Make something', icon: 'iron_bar', sub: knownN + ' things you know how to make', pick: function () { book(false); } },
      { label: 'The queue', icon: 'part_swivel', sub: st.queue.length ? st.queue.length + ' for the smiths' + (sm.length ? '' : ' - and no smiths') : 'nothing waiting', note: String(st.queue.length), pick: queueView },
      { label: 'Smiths', face: sm[0] ? faceOf(sm[0]) : null, icon: sm[0] ? null : 'iron_pickaxe', sub: sm.length ? sm.map(function (p) { return p.name; }).join(', ') : 'nobody yet - three looking for work today',
        note: sm.length + '/' + SMITHS, pick: smithsView },
      { label: 'The store', icon: 'oak_plank', sub: items.length ? items.length + ' kinds of thing on the racks' : 'empty racks', pick: function () { storeView(); } },
      { label: 'Plans', icon: 'plan_long_nine', sub: knownN + ' of ' + Object.keys(RECIPES).length + ' known', pick: plansView }
    ], closeLabel: 'Done' });
  }
  function benchCard() {
    var j = st.bench;
    if (!j) return open();
    choose({ title: 'Your bench', text: ('You\'re making ' + makes(j.r) + ': ' + Math.floor(j.done / j.need * 100) + '% done, ' + hm(leftMs(j) / 60000) + ' to go. It carries on while you\'re away.').toUpperCase(),
             rows: [{ label: rname(j.r), icon: iconOf(j.r), sub: hm(leftMs(j) / 60000) + ' to go', note: Math.floor(j.done / j.need * 100) + '%', disabled: true }],
             buttons: [{ label: 'Set it aside', act: function () { cancel(j.id); open('SET ASIDE. WHAT WENT INTO IT IS BACK ON THE RACKS.'); } },
                       { label: 'Back', act: function () { open(); } }], closeLabel: 'Done' });
  }
  function book(forYou, note) {
    var rows = [];
    GROUPS.forEach(function (g) {
      Object.keys(RECIPES).filter(function (r) { return RECIPES[r].group === g[0] && known(r); }).forEach(function (r) {
        var R = RECIPES[r], short = shortOf(r);
        rows.push({ label: rname(r), icon: iconOf(r), sub: needs(r) + ' · ' + hm(R.mins / (forYou ? yourPace() : 1)) + (forYou ? ' for you' : ''),
                    note: short.length ? 'short' : 'ready', pick: function () { card(r); } });
      });
    });
    choose({ title: forYou ? 'Make it yourself' : 'Make something', text: note || (forYou ? 'WHAT\'LL YOU SET ON YOUR BENCH? YOU\'RE SLOWER THAN A SMITH, AND QUICKER EVERY TIME.' :
             'EVERYTHING YOU KNOW HOW TO MAKE. THE WORKSHOP TAKES WHAT IT NEEDS FROM YOUR PACK, THE STORE AND YOUR SHIPS AT THE JETTY.'),
             rows: rows, buttons: [{ label: 'Back', act: function () { open(); } }], closeLabel: 'Done' });
  }
  function card(r, note) {
    var R = RECIPES[r], short = shortOf(r), mine = R.mins / yourPace();
    var rows = Object.keys(R.in).map(function (id) {
      var h = have(id), n = R.in[id];
      return { label: iname(id), icon: id, sub: h >= n ? 'you have ' + h + ' to hand' : 'you have ' + h + ' - ' + (FROM[id] || 'find some'), note: n + ' needed', disabled: true };
    });
    rows.push({ label: 'Makes ' + makes(r), icon: iconOf(r), sub: 'you ' + hm(mine) + ' · apprentice ' + hm(R.mins) + ' · journeyman ' + hm(R.mins / 1.5) + ' · master ' + hm(R.mins / 2.2), disabled: true });
    var buttons = [];
    buttons.push({ label: 'Work it yourself (' + hm(mine) + ')', disabled: !!st.bench || !!short.length, act: function () { go(r, true); } });
    buttons.push({ label: 'Queue it for the smiths', disabled: !!short.length, act: function () { go(r, false); } });
    if (!short.length && !shortOf(r, 3).length) buttons.push({ label: 'Queue three', act: function () { go(r, false, 3); } });
    buttons.push({ label: 'Back', act: function () { book(false); } });
    choose({ title: rname(r), text: note || (blurb(r) + (st.bench ? ' (Your bench is busy.)' : '')).toUpperCase(), rows: rows, buttons: buttons, closeLabel: 'Done' });
  }
  function go(r, you, times) {
    var made = 0, last = null;
    for (var i = 0; i < (times || 1); i++) { last = start(r, you); if (!last.ok) break; made++; }
    if (!made) return card(r, last.reason === 'busy' ? 'YOUR BENCH IS BUSY.' : last.reason === 'short' ? 'SHORT OF ' + last.short.map(iname).join(', ').toUpperCase() + '.' : 'NOT NOW.');
    open(you ? 'ON YOUR BENCH: ' + rname(r).toUpperCase() + '. ' + hm(leftMs(st.bench) / 60000).toUpperCase() + ' AT YOUR PACE; IT CARRIES ON WHILE YOU\'RE AWAY.'
             : (made > 1 ? made + ' × ' : '') + rname(r).toUpperCase() + ' QUEUED.' + (smiths().length ? ' YOUR SMITHS WILL GET TO IT.' : ' HIRE A SMITH TO WORK THE QUEUE - OR TAKE IT ON YOURSELF.'));
  }
  function queueView(note) {
    advance();
    var rows = st.queue.map(function (j) {
      var p = j.by ? smith(j.by) : null;
      return { label: rname(j.r), icon: iconOf(j.r), sub: p ? p.name + (working(p) ? ' · ' + hm(leftMs(j) / 60000) + ' to go' : ' · downed tools: unpaid') : 'waiting for a free smith',
               note: 'cancel', pick: function () {
                 choose({ title: 'Cancel it?', text: (rname(j.r) + ': what went into it goes back on the racks.').toUpperCase(),
                          buttons: [{ label: 'Cancel it', act: function () { cancel(j.id); queueView('CANCELLED. THE MATERIALS ARE BACK ON THE RACKS.'); } },
                                    { label: 'Keep it', act: function () { queueView(); } }], closeLabel: 'Done' });
               } };
    });
    if (!st.bench) st.queue.filter(function (j) { return !j.by; }).slice(0, 1).forEach(function (j) {
      rows.push({ label: 'Take it on yourself: ' + rname(j.r), icon: iconOf(j.r), sub: 'onto your bench, at your pace', note: 'take it', pick: function () {
        st.queue.splice(st.queue.indexOf(j), 1); j.by = 'you'; st.bench = j; save(); open('YOU TAKE IT ON YOURSELF.');
      } });
    });
    choose({ title: 'The queue', text: note || (st.queue.length ? 'YOUR SMITHS WORK THROUGH IT IN ORDER, ONE JOB EACH, WHEREVER YOU ARE.' :
             'NOTHING WAITING. QUEUE SOMETHING AND YOUR SMITHS WORK THROUGH IT WHILE YOU\'RE AWAY.') + (smiths().length ? '' : ' YOU HAVE NO SMITHS YET.'),
             rows: rows, buttons: [{ label: 'Back', act: function () { open(); } }], closeLabel: 'Done' });
  }
  function smithsView(note) {
    var sm = smiths();
    var rows = sm.map(function (p) {
      var j = st.queue.filter(function (q) { return q.by === p.id; })[0], G = GRADES[p.grade] || GRADES.apprentice;
      return { label: p.name, face: faceOf(p), sub: G.short + ' · ' + perk(p) + ' · ' + (!working(p) ? 'downed tools: unpaid' : j ? 'making ' + makes(j.r).replace(/, ready to fit$/, '') : 'idle'),
               note: p.wage + '/day', pick: function () { smithCard(p.id); } };
    });
    rows.push({ label: 'Looking for work', icon: 'iron_bar', sub: sm.length >= SMITHS ? 'every bench is taken' : 'three at the forge door today', disabled: sm.length >= SMITHS, pick: hireView });
    choose({ title: 'Smiths', text: note || 'THEY WORK THE QUEUE BY THEMSELVES, WHEREVER YOU ARE, PAID WITH YOUR OTHER STAFF EACH DAY. THE BETTER THEY ARE, THE QUICKER - AND NOW AND THEN, THE BETTER.',
             rows: rows, buttons: [{ label: 'Back', act: function () { open(); } }], closeLabel: 'Done' });
  }
  function hireView(note) {
    var full = smiths().length >= SMITHS;
    var rows = candidates().map(function (c) {
      var G = GRADES[c.grade], locked = c.grade === 'master' && st.made < MASTER_AFTER;
      var sub = G.name + ': works at ×' + Math.round(G.pace * c.skill * 10) / 10 + (G.luck ? ', now and then better' : '') + (locked ? ' - won\'t come till the workshop\'s made ' + MASTER_AFTER + ' things' : '');
      return { label: c.name, face: { seed: c.name + ':' + c.key, style: 'coat', colour: G.colour }, sub: sub, note: c.taken ? 'hired' : c.wage + '/day',
               disabled: c.taken || full || locked, pick: function () {
                 choose({ title: c.name, text: (G.name + '. ' + sub + '. ' + c.wage + ' coins a day, the first day now, paid with your other staff.').toUpperCase(),
                          buttons: [{ label: 'Take them on (' + c.wage + ')', act: function () {
                            B().engage(PLACE, c).then(function (r) {
                              if (!r.ok) { hireView(r.reason === 'taken' ? 'SOMEONE TOOK THEM ON ALREADY.' : why(r)); return; }
                              advance();                                     // (from now: they start on the queue at once)
                              sfx('coin'); toast('Workshop', c.name + ' starts at the forge', G.name);
                              smithsView(c.name.toUpperCase() + ' TIES ON AN APRON AND STARTS ON THE QUEUE.');
                            });
                          } }, { label: 'Back', act: function () { hireView(); } }], closeLabel: 'Done' });
               } };
    });
    choose({ title: 'Looking for work', text: note || (full ? 'EVERY BENCH IS TAKEN.' : 'THREE AT THE FORGE DOOR TODAY, A FRESH THREE TOMORROW. WHOEVER YOU TAKE ON WORKS THE QUEUE BY THEMSELVES, PAID WITH YOUR OTHER STAFF.'), rows: rows,
             buttons: [{ label: 'Back', act: function () { smithsView(); } }], closeLabel: 'Done' });
  }
  function smithCard(id) {
    var p = smith(id);
    if (!p) return smithsView();
    var G = GRADES[p.grade] || GRADES.apprentice;
    choose({ title: p.name, text: (G.name + '. ' + perk(p) + '. ' + p.wage + ' a day' + (p.owe > 0 ? ', ' + Math.ceil(p.owe) + ' owed' : '') + '.').toUpperCase(),
             rows: [{ label: p.name, face: faceOf(p), sub: G.short + ' · ' + perk(p), note: p.wage + '/day', disabled: true }],
             buttons: [{ label: 'Let them go', act: function () { B().dismiss(p.id); advance(); smithsView(p.name.toUpperCase() + ' HANGS UP THE APRON AND GOES.'); } },
                       { label: 'Back', act: function () { smithsView(); } }], closeLabel: 'Done' });
  }
  // the racks: what's made and what's waiting to be used (the holm's store, js/holm.js)
  function storeItems() {
    var all = H() ? H().stored() : {};
    return Object.keys(all).filter(function (id) { return all[id] > 0 && (MATS[id] || CRATES[id] || partOf(id)); });
  }
  function storeView(note) {
    var all = H() ? H().stored() : {}, I = inv();
    var rows = storeItems().map(function (id) {
      if (CRATES[id]) return { label: iname(id), icon: id, sub: all[id] + ' crate' + (all[id] > 1 ? 's' : '') + ' · ' + all[id] * CRATES[id][1] + ' ' + iname(CRATES[id][0]).toLowerCase() + ' for the workshop', note: 'cargo', disabled: true };
      return { label: iname(id), icon: id, sub: all[id] + ' on the racks' + (partOf(id) ? ' · a harbourmaster fits it' : ''), note: 'take', pick: function () {
        var n = all[id];
        if (!I || !I.addItem(id, n)) { storeView('NO ROOM IN YOUR PACK.'); return; }
        H().storeTake(id, n); sfx('pickup');
        storeView(n + ' ' + iname(id).toUpperCase() + ' INTO YOUR PACK.');
      } };
    });
    var away = I ? Object.keys(I.getAll()).filter(function (id) { return MATS[id] && !isTool(id); }) : [];
    choose({ title: 'The store', text: note || (rows.length ? 'THE RACKS, AND CARGO ASHORE. WHAT YOUR SMITHS USE COMES FROM HERE AND YOUR SHIPS AT THE JETTY.' : 'EMPTY RACKS.'),
             rows: rows, buttons: [{ label: 'Put away what you carry' + (away.length ? ' (' + away.length + ')' : ''), disabled: !away.length, act: function () {
               away.forEach(function (id) { var n = I.getCount(id); if (n > 0 && I.removeItem(id, n) !== false) H().storeAdd(id, n); });
               sfx('pickup'); storeView('PUT AWAY ON THE RACKS. YOUR SMITHS CAN USE IT NOW.');
             } }, { label: 'Back', act: function () { open(); } }], closeLabel: 'Done' });
  }
  function plansView() {
    var rows = [];
    GROUPS.forEach(function (g) {
      Object.keys(RECIPES).filter(function (r) { return RECIPES[r].group === g[0]; }).forEach(function (r) {
        var k = known(r);
        rows.push({ label: rname(r), icon: k ? iconOf(r) : 'plan_' + r, sub: k ? g[1].toLowerCase() + (RECIPES[r].plan ? ' · learnt' : ' · known from the start') : 'learn it from ' + (WHERE[r] || 'somebody, somewhere'),
                    note: k ? '✓' : 'not yet', disabled: true });
      });
    });
    choose({ title: 'Plans', text: 'WHAT YOU KNOW, AND WHAT\'S STILL TO LEARN. A PLAN FOUND OR BOUGHT IS LEARNT AS SOON AS YOU READ IT.', rows: rows,
             buttons: [{ label: 'Back', act: function () { open(); } }], closeLabel: 'Done' });
  }

  // ---- people who sell materials and plans, or teach for a favour (a `workshop` topic) ----------------------------------
  function suppliedToday(key, id) { return st.bought[etDay() + ':' + key + ':' + id] || 0; }
  function shop(key, person, line, note) {
    var S = SHOPS[key];
    if (!S) return;
    var who = person && person.name || 'Them', pid = person && person.id || key;
    var rows = (S.sells || []).map(function (s) {
      var id = s[0], price = s[1], daily = s[2], left = daily ? daily - suppliedToday(key, id) : 99;
      return { label: iname(id), icon: id, sub: 'you carry ' + carried(id) + (daily ? ' · ' + Math.max(0, left) + ' left today' : ''), note: price + ' each', disabled: left <= 0,
               pick: function () { buyCard(key, person, line, id, price, left); } };
    }).concat((S.plans || []).map(function (p) {
      var r = p[0], price = p[1], gate = p[2] === 'deep' && !(typeof BridgeMine !== 'undefined' && BridgeMine.deepest() >= 15);
      return { label: 'Plan: ' + rname(r), icon: 'plan_' + r, sub: known(r) ? 'you know it' : gate ? 'not till you\'ve been down to the fifteenth floor' : 'learn to make ' + makes(r),
               note: known(r) ? '✓' : price + ' coins', disabled: known(r) || gate, pick: function () {
                 pay(price, 'plan:' + r).then(function (res) {
                   if (!res.ok) { shop(key, person, line, why(res)); return; }
                   learn(r); sfx('coin');
                   shop(key, person, line, ('"THERE. ' + rname(r) + ', EVERY MEASUREMENT." YOU CAN MAKE IT AT YOUR WORKSHOP NOW.').toUpperCase());
                 });
               } };
    })).concat(typeof BridgeShipyard !== 'undefined' ? BridgeShipyard.planRows(key, function (n) { shop(key, person, line, n); }) : [])   // hull plans (js/shipyard.js)
      .concat((S.favours || []).map(function (fv) {
      var want = Object.keys(fv.want), ok = want.every(function (id) { return carried(id) >= fv.want[id]; });
      var list = want.map(function (id) { return fv.want[id] + ' ' + iname(id).toLowerCase() + ' (you carry ' + carried(id) + ')'; }).join(', ');
      return { label: 'Teach me: ' + rname(fv.r), icon: 'plan_' + fv.r, sub: known(fv.r) ? 'they taught you' : 'a favour: ' + list, note: known(fv.r) ? '✓' : ok ? 'give' : 'a favour',
               disabled: known(fv.r), pick: function () {
                 if (!ok) { shop(key, person, line, fv.ask); return; }
                 want.forEach(function (id) { inv().removeItem(id, fv.want[id]); });
                 st.done[key + ':' + fv.r] = Date.now(); learn(fv.r);
                 if (typeof BridgeTalk !== 'undefined' && BridgeTalk.nudge) BridgeTalk.nudge(pid, 2, 'The captain did me a favour, and I taught them to make the ' + rname(fv.r).toLowerCase() + '.');
                 shop(key, person, line, fv.thanks);
               } };
    }));
    choose({ title: who, text: note || line || 'WHAT DO YOU NEED?', rows: rows, closeLabel: 'Done' });
  }
  function buyCard(key, person, line, id, price, left) {
    var buttons = [1, 5, 10].filter(function (n) { return n <= left; }).map(function (n) {
      return { label: 'Buy ' + n + ' (' + price * n + ')', act: function () {
        pay(price * n, 'material:' + id).then(function (r) {
          if (!r.ok) { shop(key, person, line, why(r)); return; }
          var day = etDay() + ':';
          Object.keys(st.bought).forEach(function (k) { if (k.indexOf(day) !== 0) delete st.bought[k]; });   // only today's counts
          st.bought[day + key + ':' + id] = suppliedToday(key, id) + n; save();
          if (inv()) inv().give(id, n, { title: 'Your pack is full - make room for it' });
          sfx('coin');
          shop(key, person, line, (plural(n, id) + ', into your pack.').toUpperCase());
        });
      } };
    });
    var it = typeof BridgeItems !== 'undefined' && BridgeItems.get(id);
    choose({ title: iname(id), text: ((it ? it.desc : '') + ' ' + price + ' coins each.').toUpperCase(),
             rows: [{ label: iname(id), icon: id, sub: 'you carry ' + carried(id), note: price + ' each', disabled: true }],
             buttons: buttons.concat([{ label: 'Back', act: function () { shop(key, person, line); } }]), closeLabel: 'Done' });
  }

  // ---- parts: what a harbourmaster (and, to come, your own slipway) fits ------------------------------------------------
  function fee(what) { var f = F(), X = f && (f.GUNS[what] || f.FITS[what]); return Math.max(25, Math.round((X ? X.price : 200) * 0.15)); }
  /** Parts on the holm's racks: [{ what, kind, name, n }] (for the slipway at the holm, chunk 2). */
  function parts() {
    var all = H() ? H().stored() : {};
    return Object.keys(all).filter(function (id) { return partOf(id) && all[id] > 0; }).map(function (id) {
      var w = partOf(id); return { what: w, kind: RECIPES[w].kind, name: rname(w), n: all[id], fee: fee(w) };
    });
  }
  /** Take one part off the racks (the slipway fitting it). */
  function takePart(what) { return !!(H() && H().storeTake('part_' + what, 1)); }
  /** Parts a harbourmaster could fit to ship `s`: in your pack, or in her hold. */
  function partsFor(s) {
    var out = [];
    Object.keys(RECIPES).forEach(function (r) {
      var R = RECIPES[r];
      if (R.kind !== 'gun' && R.kind !== 'fit') return;
      var id = 'part_' + r, a = carried(id), b = s && s.hold ? s.hold[id] || 0 : 0;
      if (a) out.push({ what: r, kind: R.kind, name: rname(r), n: a, where: 'pack', fee: fee(r) });
      else if (b) out.push({ what: r, kind: R.kind, name: rname(r), n: b, where: 'hold', fee: fee(r) });
    });
    return out;
  }
  /** One part used up: out of your pack, else her hold. */
  function usePart(what, s) {
    var id = 'part_' + what, I = inv();
    if (I && I.getCount(id) > 0) { I.removeItem(id, 1); return true; }
    if (s && s.hold && s.hold[id] > 0) { s.hold[id]--; if (!s.hold[id]) delete s.hold[id]; if (F()) F().save(); return true; }
    return false;
  }

  // ---- found plans and salvage ------------------------------------------------------------------------------------------
  function heldPlan(r) { return carried('plan_' + r) > 0 || inStore('plan_' + r) > 0; }
  /** Under a broken rock deep in the Rose Mine, now and then: an old plan in oilcloth (js/mine.js). */
  function maybeFind(floor, x, y) {
    if (floor < 8 || Math.random() > 0.025 || known('ironwood') || heldPlan('ironwood') || typeof BridgeLoot === 'undefined') return;
    BridgeLoot.spawn(x, y, 'plan_ironwood', 1);
  }
  /** A fishing chest's rarest find (js/fishing.js): a rod-maker's plan in an oilskin tube. Returns the item, or null. */
  function chestFind() { return Math.random() < 0.06 && !known('greenheart_rod') && !heldPlan('greenheart_rod') ? 'plan_greenheart_rod' : null; }
  /** Flotsam hauled aboard (js/sloop.js): ship's stores gone over the side, or now and then a plan. [item, n] or null */
  function salvage(r) {
    if (r > 0.96) {
      var lost = ['ironwood', 'greenheart_rod', 'storm_rig'].filter(function (k) { return !known(k) && !heldPlan(k); });
      if (lost.length) return ['plan_' + lost[Math.floor(r * 1000) % lost.length], 1];
    }
    var pick = [['rope', 2], ['plank', 3], ['iron_bar', 1], ['copper_sheet', 1], ['pitch', 2], ['sailcloth', 1]];
    return pick[Math.floor(r * 997) % pick.length];
  }

  // ---- as worlds load: flax seed wherever seed is sold ------------------------------------------------------------------
  function decorate(worldId, data) {
    (data && data.interactions || []).forEach(function (it) {
      if (it.type !== 'vendor' || !it.items || !it.items.some(function (x) { return x.id === 'seed_carrot'; })) return;
      if (!it.items.some(function (x) { return x.id === 'seed_flax'; })) it.items.splice(2, 0, { id: 'seed_flax', price: 6 });
    });
  }

  // ---- what the ledgers read --------------------------------------------------------------------------------------------
  /** The Workshop at a glance: { built, where, line, jobs: [{id, recipe, name, by, working, left (ms), done (0-1)}], bench,
   *  queued, working, smiths: [{id, name, grade, title, wage, busy, face}], idle, made, next: {name, at}, log, since } */
  function summary() {
    if (!built()) return { built: false, where: WID, line: 'not built', jobs: [], queued: 0, working: 0, smiths: [], idle: 0, made: st.made, log: [] };
    advance();
    var sm = smiths(), now = Date.now();
    var jobs = (st.bench ? [st.bench] : []).concat(st.queue).map(function (j) {
      var p = j.by && j.by !== 'you' ? smith(j.by) : null, on = j.by === 'you' || !!(p && working(p));
      return { id: j.id, recipe: j.r, name: rname(j.r), by: j.by === 'you' ? 'you' : p ? p.name : null, working: on, left: on ? Math.round(leftMs(j)) : null, done: j.done / j.need };
    });
    var busy = jobs.filter(function (j) { return j.working; });
    var next = busy.slice().sort(function (a, b) { return a.left - b.left; })[0];
    var people = sm.map(function (p) {
      var j = st.queue.filter(function (q) { return q.by === p.id; })[0];
      return { id: p.id, name: p.name, grade: p.grade, title: p.title, wage: p.wage, busy: !!j && working(p), on: j ? rname(j.r) : null, unpaid: !working(p), face: faceOf(p) };
    });
    var waiting = jobs.length - busy.length;
    var line = busy.length ? busy.map(function (j) { return (j.by === 'you' ? 'you' : j.by.split(' ')[0]) + ': ' + j.name.toLowerCase() + ' (' + hm(j.left / 60000) + ')'; }).join(' · ') +
               (waiting ? ' · ' + waiting + ' waiting' : '') : waiting ? waiting + ' waiting' + (sm.length ? '' : ' - no smiths') : 'nothing on the benches';
    return { built: true, where: WID, name: 'The workshop', line: line, jobs: jobs, bench: st.bench ? jobs[0] : null, queued: st.queue.length, working: busy.length,
             smiths: people, idle: people.filter(function (p) { return !p.busy && !p.unpaid; }).length, made: st.made,
             next: next ? { name: next.name, at: now + next.left } : null, log: st.log.slice(0, 6), since: st.log.filter(function (l) { return l.at > st.seen; }).length };
  }
  /** A smith, for the ledger's Staff page: { face, sub }. */
  function smithRow(p) {
    var j = st.queue.filter(function (q) { return q.by === p.id; })[0];
    return { face: faceOf(p), sub: perk(p) + ' · ' + (!working(p) ? 'downed tools: unpaid' : j ? 'making ' + makes(j.r).replace(/, ready to fit$/, '') + ', ' + hm(leftMs(j) / 60000) + ' to go' : 'idle at the forge') };
  }
  // the clock runs on whether the screen's open or not
  if (typeof window !== 'undefined') setInterval(function () { if (st.bench || st.queue.length) advance(); }, 30000);

  return { RECIPES: RECIPES, CRATES: CRATES, FROM: FROM, GRADES: GRADES, open: open, shop: shop, start: start, queue: function (r, n) { var out = null; for (var i = 0; i < (n || 1); i++) out = start(r, false); return out; },
           cancel: cancel, known: known, learn: learn, have: have, take: take, summary: summary, smithRow: smithRow, smithCard: smithCard, candidates: candidates,
           parts: parts, takePart: takePart, partsFor: partsFor, usePart: usePart, maybeFind: maybeFind, chestFind: chestFind, salvage: salvage,
           decorate: decorate, built: built, name: rname, looked: function () { st.seen = Date.now(); save(); },   // (read in the office's workshop book)
           _advance: advance, _state: function () { return st; }, reload: function () { st = load(); } };
})();
