/**
 * BridgeDeeper — Hoarfell and Verdance, deeper (spec-deeper-worlds H5–H7, V5–V7; the village's second ring, V4, is
 * js/village.js's). Small things that tie what's there together, with the cast already in the game and nothing drawn
 * but in code. apps/bridge/CLAUDE.md, *Hoarfell and Verdance, deeper*.
 *
 *   H6  Ysolde joins the crew (people.json `ysolde.crew`, perk `mountaineer`: js/worlds/hoarfell.js's cold, js/expedition.js's
 *       probe) once you've stood on the Last Ridge — the gate `last-ridge`, read by her crew block's `when` and her topic.
 *   V5  Wat shoes your horse (`shod()`, read by js/countryside.js as you get up: a little quicker for a Verdance day);
 *       Old Ludd grinds your wheat at Brambleford's mill and buys back what he ground for the fair's bread.
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
    return { shod: d.shod || 0, ludd: d.ludd || 0 };
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
  register('wat_shoe', shoe, 'Ask');
  register('ludd_grind', grind, 'Ask');

  function nextUp(wid) {
    var out = [];
    if (ridge() && !hired('ysolde') && /^hoarfell/.test(wid || ''))
      out.push({ tag: 'Crew', title: 'Ysolde would sign on', text: 'You\'ve stood on the Last Ridge. Ask her at the guide\'s hut in Fellhaven.', world: 'hoarfell' });
    if (/^verdance/.test(wid || '') && horse() && !(Date.now() < s.shod) && wid === 'verdance-village')
      out.push({ tag: 'Here', title: 'New shoes for ' + (horse().name || 'your horse'), text: 'Wat at the Anvil & Hoof shoes her for ' + SHOE + ' coins: quicker for a Verdance day.', world: 'verdance-village' });
    return out;
  }
  function comeBack() { return []; }
  window.BRIDGE_NEXTUP = (window.BRIDGE_NEXTUP || []).concat([nextUp]);
  window.BRIDGE_COMEBACK = (window.BRIDGE_COMEBACK || []).concat([comeBack]);

  var USES = [
    { id: 'wheat', p: 5, t: '<b>Old Ludd</b> grinds ' + GRIND + ' into a sack of flour at Brambleford\'s mill, and buys that flour back at ' + LUDD_BUYS + ' for the fair' },
    { id: 'flour', p: 4, t: '<b>Old Ludd</b> buys back flour he ground for you, at ' + LUDD_BUYS + ' a sack, for the fair\'s bread' },
    { id: 'probe', p: 4, t: '<b>Ysolde</b>, in your crew, rigs her own probe to go in ahead of you on a crevasse field: you needn\'t hold one' }
  ];

  return { USES: USES, ridge: ridge, nextUp: nextUp, comeBack: comeBack, shod: shod, shoe: shoe, grind: grind,
           _s: function () { return s; }, reload: function () { s = load(); } };
})();
