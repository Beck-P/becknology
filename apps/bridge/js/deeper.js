/**
 * BridgeDeeper — Hoarfell and Verdance, deeper (spec-deeper-worlds H5–H7, V5–V7; the village's second ring, V4, is
 * js/village.js's). Small things that tie what's there together, with the cast already in the game and nothing drawn
 * but in code. apps/bridge/CLAUDE.md, *Hoarfell and Verdance, deeper*.
 *
 *   H6  Ysolde joins the crew (people.json `ysolde.crew`, perk `mountaineer`: js/worlds/hoarfell.js's cold, js/expedition.js's
 *       probe) once you've stood on the Last Ridge — the gate `last-ridge`, read by her crew block's `when` and her topic.
 *   V5  Wat shoes your horse (`shod()`, read by js/countryside.js as you get up: a little quicker for a Verdance day);
 *       Old Ludd grinds your wheat at Brambleford's mill and buys back what he ground for the fair's bread.
 *   V7  The goat that answers to nothing: in the Downs' sunken lane at dusk (GOAT.at), drawn in code on the 16-grid as
 *       the farm's hens and cows are (js/animals.js); E and it follows you over Verdance's outdoors; Hobb knows it —
 *       it's his — and gives you a recipe for Hester: she makes Downs goat's cheese from then on.
 *
 * State: localStorage `bridge_deeper` (cloud-saved like every bridge_* key): `shod` (until, ms), `ludd` (sacks of his
 * grinding not yet bought back).
 *
 * Leads players to each: Next up (window.BRIDGE_NEXTUP), the Map's Come back for (window.BRIDGE_COMEBACK), the cards
 * (`USES`, js/uses.js).
 */
var BridgeDeeper = (function () {
  var KEY = 'bridge_deeper';
  var s = load();
  function load() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    d = d || {};
    return { shod: d.shod || 0, ludd: d.ludd || 0, goat: d.goat || 0 };
  }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private mode */ } }
  function say(t, x) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(t, x); }
  function choose(spec) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.choose(spec); }
  function toast(a, b, c) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(a, b, c); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function count(id) { return typeof BridgeInventory !== 'undefined' ? BridgeInventory.getCount(id) : 0; }
  function charge(n, why) {
    return typeof BridgeProgression !== 'undefined' && BridgeProgression.wagerCoins
      ? BridgeProgression.wagerCoins(n, why).then(function (r) { return r || { ok: false }; }, function () { return { ok: false }; })
      : Promise.resolve({ ok: false, reason: 'offline' });
  }
  function pay(n, why) { return typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins ? BridgeProgression.awardCoins(n, why) : Promise.resolve(null); }
  function register(type, fn, verb) { if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.register) BridgeInteractions.register(type, fn, verb); }
  function gate(name, fn) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.gate) BridgeQuests.gate(name, fn); }
  function visited(w) { return typeof BridgeQuests !== 'undefined' && BridgeQuests.visited ? !!BridgeQuests.visited()[w] : false; }
  function hired(id) { return typeof BridgeCrew !== 'undefined' && BridgeCrew.isHired(id); }

  // ---- H6 · Ysolde ----------------------------------------------------------------------------------------------------
  function ridge() { return visited('hoarfell-ridge'); }
  gate('last-ridge', ridge);

  // ---- V5 · Wat, Ludd and the horse --------------------------------------------------------------------------------
  var SHOE = 20, SHOD_K = 1.15, GRIND = 3, LUDD_BUYS = 28;
  function horse() { return typeof BridgeCountryside !== 'undefined' && BridgeCountryside.journal ? BridgeCountryside.journal().horse : null; }
  function vday() { return typeof BridgeClock !== 'undefined' && BridgeClock.dayLen ? BridgeClock.dayLen('verdance') : 6 * 3600000; }
  /** How much quicker your horse goes for her new shoes (1 when they've worn in): js/countryside.js, as you get up. */
  function shod() { return Date.now() < s.shod ? SHOD_K : 1; }
  gate('has-horse', function () { return !!horse(); });
  function shoe() {
    var h = horse();
    if (!h) return say('THE ANVIL & HOOF', '"NO HORSE, NO SHOES. HOBB ON STATION ROAD SELLS GOOD ONES."');
    var name = String(h.name || 'her').toUpperCase(), left = s.shod - Date.now();
    if (left > 0) return say('THE ANVIL & HOOF', '"' + name + '\'S SHOES ARE STILL NEW. ' + Math.max(1, Math.round(left / 3600000)) + ' HOURS IN THEM YET. COME BACK WHEN SHE\'S WORN THE EDGE OFF."');
    choose({
      title: 'Wat shoes your horse',
      text: '"BRING ' + name + ' ROUND THE BACK. NEW SHOES, HOT FITTED, ' + SHOE + ' COINS. SHE\'LL GO LIKE A MORNING FOR A DAY - A VERDANCE DAY, MIND. THEN THEY\'RE JUST SHOES."',
      rows: [{ label: 'Shoe ' + (h.name || 'her'), sub: 'a little quicker under you for a Verdance day', note: SHOE + ' coins', pick: function () {
        charge(SHOE, 'wat:shoe').then(function (r) {
          if (!r.ok) return say('THE ANVIL & HOOF', 'NOT ENOUGH COINS.');
          s.shod = Date.now() + vday(); store(); sfx('success');
          toast('The Anvil & Hoof', name.charAt(0) + name.slice(1).toLowerCase() + ' is newly shod', 'quicker under you till the day\'s out');
          say('THE ANVIL & HOOF', 'HISS AND SMOKE AND THE SMELL OF HOT HORN. WAT TAPS THE LAST NAIL HOME AND PATS HER NECK. "THERE. SHE\'LL THANK ME BY TEATIME."');
        });
      } }],
      closeLabel: 'Not now'
    });
  }
  function grind() {
    var have = count('wheat'), n = Math.floor(have / GRIND), back = Math.min(s.ludd, count('flour'));
    choose({
      title: 'Old Ludd\'s mill',
      text: '"THE STONES ARE OLDER THAN ME AND SLOWER, BUT THEY\'RE NOT IDLE. ' + GRIND + ' SHEAVES A SACK, NO CHARGE - EDDA NEVER PAID EITHER. AND IF YOU\'VE ANY OF MY FLOUR LEFT, I\'LL HAVE IT BACK FOR THE FAIR\'S BREAD. NOBODY BAKES WITH THE WEND MILL\'S AT A FAIR."',
      rows: [
        { label: 'Grind your wheat', sub: GRIND + ' wheat a sack of flour · you have ' + have, disabled: n < 1, pick: function () {
          BridgeInventory.removeItem('wheat', n * GRIND);
          if (!BridgeInventory.addItem('flour', n)) { BridgeInventory.addItem('wheat', n * GRIND); return say('OLD LUDD', 'NO ROOM IN YOUR PACK FOR THE FLOUR.'); }
          s.ludd += n; store(); sfx('harvest');
          toast('Ludd\'s mill', n + ' sack' + (n > 1 ? 's' : '') + ' of flour', 'ground on Brambleford\'s stones');
          grind();
        } },
        { label: 'Sell Ludd back his flour', sub: s.ludd ? 'he\'ll take up to ' + s.ludd + ' he ground · you have ' + count('flour') : 'only what he ground for you', note: LUDD_BUYS + ' ea', disabled: back < 1, pick: function () {
          BridgeInventory.removeItem('flour', back);
          s.ludd -= back; store();
          pay(back * LUDD_BUYS, 'ludd:flour').then(function () { sfx('coin'); toast('Ludd\'s mill', '+' + back * LUDD_BUYS + ' coins', back + ' flour, for the fair\'s bread'); grind(); });
        } }
      ],
      closeLabel: 'Back'
    });
  }
  // ---- V7 · the goat that answers to nothing ------------------------------------------------------------------------
  // s.goat: 0 lost (in the Downs' holloway of an evening), 1 following you, 2 home at Hobb's
  var GOAT = { world: 'verdance-downs', at: [22, 14], home: { world: 'verdance-east', at: [34, 21] } };
  var OUTDOORS = /^verdance(-village|-east|-downs|-market|-hill|-mill)?$/;
  function here() { return typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId ? BridgeWorld.getWorldId() : null; }
  /** Of an evening on Verdance: the planet's clock past noon and the sun near the horizon (js/clock.js sky). */
  function evening() {
    var k = typeof BridgeClock !== 'undefined' && BridgeClock.sky ? BridgeClock.sky(GOAT.world) : null;
    return !!(k && k.cycles && k.t / k.len > 0.5 && k.dusk > 0.25);
  }
  gate('goat-following', function () { return s.goat === 1; });
  gate('goat-home', function () { return s.goat === 2; });
  var GPAL = { k: '#2a2018', w: '#ece4d2', s: '#c8bca4', h: '#8a7a60', e: '#1a1410', p: '#d89a8a', b: '#b0a48a' };
  function goatParts(f) {                                   // 16-unit art, facing right: four legs, a beard, swept horns
    var l = f === 1 ? 1 : 0, hy = f === 2 ? 3 : 0;
    return [['k', 2 + l, 9, 2, 4], ['k', 5 - l, 9, 2, 4], ['k', 10 + l, 9, 2, 4], ['k', 13 - l, 9, 2, 4],
            ['s', 3 + l, 9, 1, 3], ['s', 6 - l, 9, 1, 3], ['s', 11 + l, 9, 1, 3], ['s', 14 - l, 9, 1, 3],
            ['k', 1, 4, 15, 6], ['w', 2, 5, 13, 4], ['s', 2, 8, 13, 1], ['k', 0, 3, 2, 2], ['w', 1, 4, 1, 1],
            ['k', 13, 0 + hy, 5, 6], ['w', 14, 1 + hy, 3, 4], ['e', 16, 2 + hy, 1, 1], ['p', 17, 4 + hy, 1, 1],
            ['k', 14, 5 + hy, 2, 3], ['b', 15, 5 + hy, 1, 2], ['h', 13, -1 + hy, 1, 2], ['h', 12, -2 + hy, 1, 1], ['h', 16, -1 + hy, 1, 1]];
  }
  var gcv = null;
  function drawGoat(c, sc, world, x, y, dir, f, offX, offY, ts, now) {
    var u = ts / 16, W = 18, H = 13;
    gcv = gcv || document.createElement('canvas'); gcv.width = Math.ceil(W * u) + 2; gcv.height = Math.ceil((H + 3) * u) + 2;
    var g = gcv.getContext('2d');
    g.clearRect(0, 0, gcv.width, gcv.height);
    goatParts(f).forEach(function (p) {
      var px = dir > 0 ? p[1] : W - p[1] - p[3];
      g.fillStyle = GPAL[p[0]];
      g.fillRect(Math.round(px * u) + 1, Math.round((p[2] + 3) * u) + 1, Math.round(p[3] * u), Math.round(p[4] * u));
    });
    var foot = y + 0.9, cx = Math.round(offX + (x + 0.5) * ts), fy = Math.round(offY + foot * ts);
    BridgeScene.drawOccluded(c, sc, gcv, 0, 0, gcv.width, gcv.height, cx - Math.round(W * u / 2) - 1, fy - Math.round((H + 3) * u) - 1, foot, offX, offY,
      BridgeScene.tintAt ? BridgeScene.tintAt(sc, world, Math.round(x), Math.round(y), now) : null, { x: cx, y: fy, rx: 9, ry: 2 });
  }
  var trail = [], gpos = null;                             // where you've walked (render positions), and the goat a pace behind
  function goatItems(world, offX, offY, ts, now, sc) {
    var wid = here();
    if (!sc || typeof BridgeScene === 'undefined' || !wid) return [];
    var out = [];
    if (s.goat === 0 && wid === GOAT.world) {
      ensureLost(world);
      if (evening()) out.push({ footRow: GOAT.at[1] + 0.9, draw: function (ctx) {
        var nib = Math.sin(now / 900) > 0.2 ? 2 : 0;           // eating the note off the honesty box, by the look of it
        drawGoat(ctx, sc, world, GOAT.at[0], GOAT.at[1], -1, nib, offX, offY, ts, now);
      } });
    }
    if (s.goat === 1 && OUTDOORS.test(wid) && typeof BridgeCharacter !== 'undefined') {
      var rp = BridgeCharacter.getRenderPos ? BridgeCharacter.getRenderPos() : { x: BridgeCharacter.getX(), y: BridgeCharacter.getY() };
      var last = trail[trail.length - 1];
      if (!last || last.w !== wid || Math.hypot(rp.x - last.x, rp.y - last.y) > 0.08) trail.push({ x: rp.x, y: rp.y, w: wid });
      trail = trail.filter(function (t) { return t.w === wid; }).slice(-40);
      var target = trail.length > 14 ? trail[trail.length - 15] : null, moving = false;
      if (!gpos || gpos.w !== wid) gpos = { x: rp.x - 1, y: rp.y, w: wid, dir: 1, dist: 0 };
      if (target) {
        var dx = target.x - gpos.x, dy = target.y - gpos.y, d = Math.hypot(dx, dy);
        if (d > 0.05) { var st = Math.min(d, 0.12); gpos.x += dx / d * st; gpos.y += dy / d * st; gpos.dist += st; moving = true; if (Math.abs(dx) > 0.02) gpos.dir = dx > 0 ? 1 : -1; }
      }
      var f = moving ? Math.floor(gpos.dist / 0.25) % 2 : (Math.sin(now / 800) > 0.5 ? 2 : 0), G = gpos;
      out.push({ footRow: G.y + 0.9, draw: function (ctx) { drawGoat(ctx, sc, world, G.x, G.y, G.dir, f, offX, offY, ts, now); } });
    }
    if (s.goat === 2 && wid === GOAT.home.world) {
      var H = GOAT.home.at, f2 = Math.sin(now / 1100) > 0.4 ? 2 : 0;
      out.push({ footRow: H[1] + 0.9, draw: function (ctx) { drawGoat(ctx, sc, world, H[0], H[1], -1, f2, offX, offY, ts, now); } });
    }
    return out;
  }
  // the lost goat's E, there only of an evening (added and taken away as the light goes)
  function ensureLost(world) {
    var ins = world.interactions || [], i = ins.findIndex ? ins.findIndex(function (it) { return it.type === 'deeper_goat'; }) : -1, want = evening() && s.goat === 0;
    if (want && i < 0) ins.push({ x: GOAT.at[0], y: GOAT.at[1], type: 'deeper_goat', label: 'A GOAT', prompt: 'PRESS E TO LOOK' });
    if (!want && i >= 0) ins.splice(i, 1);
  }
  function goat() {
    if (s.goat !== 0) return;
    s.goat = 1; store(); sfx('pickup');
    say('A GOAT', 'A GOAT IN THE SUNKEN LANE, CHEWING A PIECE OF PAPER THAT SAYS "HONESTY BOX - PLEASE LEAVE THE MONEY IN THE TIN". IT LOOKS AT YOU. YOU SAY "HELLO?" IT DOESN\'T ANSWER. IT ANSWERS TO NOTHING.\n\nWHEN YOU WALK ON, IT FOLLOWS.');
    toast('A goat', 'It\'s following you', 'Somebody in Brambleford must be missing it');
    if (typeof BridgeQuests !== 'undefined' && BridgeQuests.note) BridgeQuests.note('Verdance', 'A goat that answers to nothing', 'found in the Downs\' sunken lane at dusk');
  }
  function goatHome() {
    if (s.goat !== 1) return say('HOBB', '"THE GOAT? ISN\'T MINE. EVERYONE SAYS IT\'S HOLLIN\'S."');
    if (here() !== GOAT.home.world) return say('HOBB', '"BRING HER ROUND TO THE YARD, THEN."');
    s.goat = 2; store(); sfx('success'); trail = []; gpos = null;
    toast('Hobb\'s Livery', 'The goat is home', 'Hobb wrote down a cheese for Hester');
    say('HOBB', '"WELL I\'LL BE. THAT\'S MISS WHISKERS. EVERYONE SAYS SHE\'S HOLLIN\'S BECAUSE SHE\'S ALWAYS ON HIS ROOF. SHE\'S MINE. SHE HAS BEEN FOR NINE YEARS. SHE DOESN\'T KNOW IT.\n\nHERE - MY MOTHER\'S GOAT\'S CHEESE, OFF THE DOWNS. ASH ON THE RIND, A BIT OF THYME. GIVE IT TO HESTER. SHE\'S BEEN ON AT ME FOR IT SINCE SHE CAME."');
  }
  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('*', { items: goatItems });
  // Hester's from then on (people.json `hester` *Hobb's recipe*, a `stores` topic), and an entry at the Cellar Fair
  if (typeof BridgeItems !== 'undefined' && BridgeItems.add && !BridgeItems.get('goat_cheese')) BridgeItems.add({
    goat_cheese: { name: 'Downs Goat\'s Cheese', desc: 'A little log of soft goat\'s cheese with ash on the rind and thyme from the Downs. Hobb\'s mother\'s recipe; Hester makes it now. The goat is unrepentant.',
                   type: 'food', stackable: true, effects: { hp: 26, energy: 14 }, value: 16,
                   draw: function (ctx, x, y, s) { var u = s / 16, P = function (c, rs) { BridgeItems.px(ctx, x, y, u, c, rs); };
                     P('#1a1a18', [[2, 6, 12, 7]]); P('#5a5a58', [[3, 7, 10, 5]]); P('#f4f0e4', [[3, 7, 4, 5]]); P('#e0dccc', [[4, 8, 2, 3]]);
                     P('#8a8a84', [[8, 8, 4, 1], [9, 10, 3, 1]]); P('#4a8a2a', [[10, 5, 1, 2], [11, 4, 1, 2]]); } }
  });
  register('deeper_goat', goat, 'Look');
  register('goat_home', goatHome, 'Ask');

  register('wat_shoe', shoe, 'Ask');
  register('ludd_grind', grind, 'Ask');

  function nextUp(wid) {
    var out = [];
    if (ridge() && !hired('ysolde') && /^hoarfell/.test(wid || ''))
      out.push({ tag: 'Crew', title: 'Ysolde would sign on', text: 'You\'ve stood on the Last Ridge. Ask her at the guide\'s hut in Fellhaven.', world: 'hoarfell' });
    if (s.goat === 1) out.push({ tag: 'Carrying', title: 'A goat, following you', text: 'Hobb at the livery on Station Road knows every animal in Brambleford.', world: 'verdance-east' });
    if (/^verdance/.test(wid || '') && horse() && !(Date.now() < s.shod) && wid === 'verdance-village')
      out.push({ tag: 'Here', title: 'New shoes for ' + (horse().name || 'your horse'), text: 'Wat at the Anvil & Hoof shoes her for ' + SHOE + ' coins: quicker for a Verdance day.', world: 'verdance-village' });
    return out;
  }
  function comeBack(wid) { return wid === GOAT.world && s.goat === 0 ? ['something in the sunken lane, of an evening'] : []; }
  window.BRIDGE_NEXTUP = (window.BRIDGE_NEXTUP || []).concat([nextUp]);
  window.BRIDGE_COMEBACK = (window.BRIDGE_COMEBACK || []).concat([comeBack]);

  var USES = [
    { id: 'wheat', p: 5, t: '<b>Old Ludd</b> grinds ' + GRIND + ' into a sack of flour at Brambleford\'s mill, and buys that flour back at ' + LUDD_BUYS + ' for the fair' },
    { id: 'flour', p: 4, t: '<b>Old Ludd</b> buys back flour he ground for you, at ' + LUDD_BUYS + ' a sack, for the fair\'s bread' },
    { id: 'probe', p: 4, t: '<b>Ysolde</b>, in your crew, rigs her own probe to go in ahead of you on a crevasse field: you needn\'t hold one' }
  ];

  return { USES: USES, ridge: ridge, nextUp: nextUp, comeBack: comeBack, shod: shod, shoe: shoe, grind: grind, evening: evening, GOAT: GOAT,
           _s: function () { return s; }, reload: function () { s = load(); } };
})();
