/**
 * BridgeGear — what the pilot wears and carries.
 *
 * Suits are Blender models (tools/bridge-art/characters.py pilot-<style>),
 * rendered standing, seated, skiing and climbing on both builds with every
 * head (assets/characters/pilots/, see js/look.js, which recolours them for
 * the suit colour, skin and hair). A suit carries a perk — more health, more
 * energy, a quicker step, warmth. The colour is yours to change any time.
 * Backpacks add rows to the inventory (js/inventory.js asks packSlots()).
 *
 * Outfitters sell them: a tailor in the Lumar market, the import stall on
 * Sapphire, Cyber Gear on the District street, Joro's back room, Vex's
 * stash. A person's conversation topic with `outfit: <shop>` opens one too.
 * The wardrobe (the coat rack on the bridge, or OUTFIT in the inventory)
 * changes what you wear, and its Change look button how you look (js/look.js:
 * build, hair, beard, helmet, skin, hair colour; free). Saved in localStorage
 * `bridge_gear`.
 *
 *   BridgeGear.open()                         // the wardrobe
 *   BridgeGear.open({ shop: 'cyber_gear' })   // an outfitter
 *   BridgeGear.style() / colour() / speed() / bonus() / packSlots() / has('cold')
 */
var BridgeGear = (function () {
  var KEY = 'bridge_gear';
  var COLOURS = [['purple', '#a078dc'], ['cyan', '#5cc8d0'], ['red', '#d06060'], ['green', '#60b060'], ['gold', '#c8a840'], ['white', '#d0d0d0']];
  var SUITS = {
    flight:  { name: 'Flight Suit', price: 0, perk: {}, blurb: "The Wayfarer's standard issue. Warm, tough, honest." },
    coat:    { name: "Voyager's Coat", price: 300, perk: { energy: 25 },
               blurb: "A captain's long coat over the suit, gold braid at the shoulders. You stand up straighter in it." },
    runner:  { name: 'Neon Runner', price: 350, perk: { speed: 0.15 },
               blurb: 'An Arcadian street jacket with LED piping and white kicks. Light on its feet.' },
    thermal: { name: 'Thermal Suit', price: 400, perk: { hp: 20, cold: true },
               blurb: 'Quilted and puffed, fur at the collar and boots. Made for somewhere colder than here.' },
    plate:   { name: 'Plated Suit', price: 600, perk: { hp: 50, speed: -0.05 },
               blurb: 'Corp security plate, a cuirass and pauldrons over the suit. Heavy, and very hard to hurt.' },
    mystic:  { name: 'Starweave Robe', price: 700, perk: { energy: 40 },
               blurb: 'A long robe with gold stars stitched down the front and a hood thrown back. The Peddler swears it was a wizard\'s.' },
    ranger:  { name: "Ranger's Cloak", price: 550, perk: { hp: 15, speed: 0.08 },
               blurb: 'A field cloak and mantle over a leather jerkin, rope at the hip. For the long walks out past the villages.' }
  };
  var PACKS = {
    flight:     { name: 'Flight Pack', slots: 6, price: 0, blurb: 'The little pack on every flight suit.' },
    satchel:    { name: "Courier's Satchel", slots: 12, price: 150, blurb: 'Waxed canvas, brass buckles, room for a day\'s gathering.' },
    expedition: { name: 'Expedition Pack', slots: 20, price: 400, blurb: 'A frame pack with a dozen pockets. Smells faintly of new nylon.' },
    voidweave:  { name: 'Voidweave Rucksack', slots: 30, price: 900, blurb: 'Folds space. Weighs nothing. Don\'t look inside for long.' }
  };
  // timepieces (js/hours.js shows the time by the place's name while you carry one that keeps that planet's clock):
  // each world's own make, none on Lumar (its chapels ring the hours); the Arcadian chrono keeps them all
  var TIMES = {
    fell_watch:   { name: 'Fell Pocket Watch', price: 600, reads: ['hoarfell'], blurb: 'Brass, a hunter case with a snowflake on the lid. Twelve hours to the face: Hoarfell\'s day.' },
    farm_watch:   { name: 'Farmer\'s Watch', price: 500, reads: ['verdance'], blurb: 'Six hours to the face, wound every market day. Tells you when to water.' },
    moonglass:    { name: 'Moonglass', price: 900, reads: ['sylvara'], blurb: 'An elvish lens. Hold it to the sky and the hour shows in it, and the moon.' },
    wrist_chrono: { name: 'World Watch', price: 2500, reads: ['all'], blurb: 'Every world on one face: tap the time by the place\'s name and it shows them all, with the weather. Synced to Eastern time; glows in the dark, obviously.' }
  };
  var SHOPS = {
    lumar_tailor:     { title: 'THE TRAVELLING TAILOR', goods: ['suit:coat', 'pack:satchel'] },
    sapphire_imports: { title: 'RARE IMPORTS', goods: ['suit:thermal', 'pack:satchel', 'time:wrist_chrono'] },
    cyber_gear:       { title: 'CYBER GEAR', goods: ['suit:runner', 'pack:expedition', 'time:wrist_chrono'] },
    joro:             { title: "JORO'S BACK ROOM", goods: ['suit:plate', 'pack:expedition'] },
    vex:              { title: "VEX'S STASH", goods: ['pack:voidweave'] },
    alpine:           { title: 'ALPINE OUTFITTERS', goods: ['suit:thermal', 'pack:expedition', 'time:fell_watch'] },
    pennyworth:       { title: "PENNYWORTH'S GLASS CASE", goods: ['time:farm_watch'] },
    elf_lens:         { title: "MIRELLE'S LENS", goods: ['time:moonglass'] },
    peddler:          { title: 'THE PEDDLER\'S CLOTHES RAIL', goods: ['suit:mystic', 'suit:ranger'] }
  };
  // outfitters set up on world interactions as worlds load (so a re-render can't lose them)
  var PLACES = [
    { world: 'lumar-square', label: 'MERCHANT', shop: 'lumar_tailor', prompt: 'PRESS E TO BROWSE',
      intro: 'A TRAVELLING TAILOR WITH BOLTS OF SAILCLOTH AND A BOX OF GOLD BRAID. "A CAPTAIN SHOULD LOOK LIKE ONE, FRIEND."' },
    { world: 'lumar-sapphire', label: 'STALL', at: [33, 18], shop: 'sapphire_imports', prompt: 'PRESS E TO BROWSE',
      intro: 'RARE IMPORTS. QUILTED SUITS FROM SOMEWHERE COLD, HUNG UP BESIDE THE ROPE. "QUALITY GUARANTEED. SURVIVAL NOT GUARANTEED."' },
    { world: 'arcadia-street', label: 'CYBER GEAR', shop: 'cyber_gear', prompt: 'PRESS E TO BROWSE',
      intro: 'CHROME HEADPHONES, MOD KITS, WIRES IN A DOZEN COLOURS, AND A RACK OF RUNNER JACKETS HUMMING ON THEIR HANGERS.' },
    { world: 'bridge', label: 'COAT RACK', wardrobe: true, prompt: 'PRESS E TO CHANGE' },
    { world: 'hoarfell-skihire', label: 'OUTERWEAR', shop: 'alpine', prompt: 'PRESS E TO BROWSE',
      intro: 'A RAIL OF QUILTED SUITS AT THE BACK OF THE SKI HIRE, AND A HAND-LETTERED SIGN: "THE MOUNTAIN DOESN\'T CARE WHAT YOU WEAR. YOU WILL."' },
    { world: 'hoarfell-skihire', label: 'MIRROR', wardrobe: true, prompt: 'PRESS E TO CHANGE' }
  ];

  var state = load();
  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    s = s && typeof s === 'object' ? s : {};
    s.suits = s.suits || { flight: 1 };
    s.packs = s.packs || { flight: 1 };
    s.times = s.times || {};
    if (!SUITS[s.style] || !s.suits[s.style]) s.style = 'flight';
    return s;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ } }

  function style() { return state.style; }
  function colour() { return state.colour || null; }
  function perk() { return SUITS[state.style].perk; }
  function speed() { return (1 + (perk().speed || 0)) * (typeof BridgeMagic !== 'undefined' ? BridgeMagic.speed() : 1); }
  function bonus() { return { hp: perk().hp || 0, energy: perk().energy || 0 }; }
  function has(what) { return !!perk()[what] || (typeof BridgeMagic !== 'undefined' && BridgeMagic.has(what)); }
  function bestPack() {
    var best = 'flight';
    Object.keys(state.packs).forEach(function (k) { if (PACKS[k] && PACKS[k].slots > PACKS[best].slots) best = k; });
    return best;
  }
  function packSlots() { return PACKS[bestPack()].slots; }
  function changed() {
    if (typeof BridgeInventory !== 'undefined' && BridgeInventory.refresh) BridgeInventory.refresh();
  }

  function perkText(p) {
    var out = [];
    if (p.hp) out.push('+' + p.hp + ' health');
    if (p.energy) out.push('+' + p.energy + ' energy');
    if (p.speed) out.push((p.speed > 0 ? '+' : '') + Math.round(p.speed * 100) + '% speed');
    if (p.cold) out.push('keeps out the cold');
    return out.join(' · ') || 'no frills';
  }

  // ---- world hookup ------------------------------------------------------------------------------
  function decorate(worldId, data) {
    (data.interactions || []).forEach(function (it) {
      PLACES.forEach(function (P) {
        if (P.world !== worldId || it.label !== P.label) return;
        if (P.at && (it.x !== P.at[0] || it.y !== P.at[1])) return;
        it.type = 'outfitter'; it.shop = P.shop || null; it.wardrobe = !!P.wardrobe;
        it.prompt = P.prompt; if (P.intro) it.dialog = P.intro;
      });
    });
  }

  // ---- the outfitter / wardrobe ---------------------------------------------------------------------
  var el = null, rows = [], sel = 0, pick = null, previewStyle = null, previewColour = null, raf = 0, keyFn = null, busy = false, note = '';
  var looking = null;     // the look editor (js/look.js) while the wardrobe is on Change look
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function theme() {
    var id = (BridgeWorld.getWorldId && BridgeWorld.getWorldId()) || '', w = BridgeWorld.getWorld(), ts = (w && w.tileset) || '';
    if (/^lumar/.test(id) || ts === 'lumar' || ts === 'tavern') return 'parchment';
    if (ts === 'arcadia' || /^(arcadia|cyber|chrome|junk|tech|null)/.test(id)) return 'neon';
    if (ts === 'enigma' || /^enigma/.test(id)) return 'crt';
    if (ts === 'verdance' || /^verdance/.test(id)) return 'meadow';
    if (ts === 'hoarfell' || /^hoarfell/.test(id)) return 'frost';
    if (ts === 'sylvara' || /^sylvara/.test(id)) return 'sylvan';
    return 'holo';
  }
  function pilotColour() {
    var p = typeof BridgeState !== 'undefined' && BridgeState.getPilot();
    return state.colour || (p && p.suit_color) || 'purple';
  }

  function open(opts) {
    opts = opts || {};
    if (el) close();
    var shop = opts.shop && SHOPS[opts.shop];
    // the list: what this shop sells, or (the wardrobe) the suits you own
    rows = shop ? shop.goods.map(function (g) { var p = g.split(':'); return { kind: p[0], key: p[1] }; })
                : Object.keys(SUITS).filter(function (k) { return state.suits[k]; }).map(function (k) { return { kind: 'suit', key: k }; });
    sel = 0;
    looking = null;
    for (var i = 0; i < rows.length; i++) if (rows[i].kind === 'suit' && rows[i].key === state.style && !shop) sel = i;
    previewColour = pilotColour();
    note = '';
    if (typeof BridgeControls !== 'undefined') BridgeControls.disable();
    el = document.createElement('div');
    el.id = 'gear-dialog';
    el.className = 'world-dialog wd-' + theme() + ' wd-gear';
    el.innerHTML = '<div class="wd-body"><div class="wd-title">' + esc(shop ? shop.title : 'WARDROBE') + '</div>' +
      (opts.intro ? '<div class="wd-text">' + esc(opts.intro) + '</div>' : '') +
      '<div class="gear-main"><canvas class="gear-preview" width="96" height="144"></canvas><div class="gear-list"></div><div class="gear-look"></div></div>' +
      '<div class="gear-colours">' + COLOURS.map(function (c) {
        return '<button class="gear-swatch" data-col="' + c[0] + '" title="' + c[0] + '" style="background:' + c[1] + '"></button>';
      }).join('') + '<span class="gear-colname"></span></div>' +
      '<div class="gear-stats"></div><div class="gear-note"></div>' +
      '<div class="wd-options gear-actions"></div>' +
      '<div class="wd-hint"><span class="ip-key">Esc</span>Leave</div></div>';
    (document.getElementById('world-overlay') || document.body).appendChild(el);
    el._shop = opts.shop || null;
    requestAnimationFrame(function () { if (el) el.classList.add('visible'); });
    el.querySelectorAll('.gear-swatch').forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); setColour(b.getAttribute('data-col')); });
    });
    keyFn = function (e) {
      var k = e.key;
      var mine = { Escape: 1, ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, Enter: 1, e: 1, E: 1, w: 1, W: 1, s: 1, S: 1, a: 1, A: 1, d: 1, D: 1, ' ': 1 };
      if (!mine[k]) return;
      e.preventDefault(); e.stopPropagation();
      if (looking) {                    // the look editor has the arrows; Esc, Enter or E go back to the suits
        if (!looking.key(k)) lookMode(false);
        return;
      }
      if (k === 'Escape') close();
      else if (k === 'ArrowUp' || k === 'w' || k === 'W') choose(sel - 1);
      else if (k === 'ArrowDown' || k === 's' || k === 'S') choose(sel + 1);
      else if (k === 'ArrowLeft' || k === 'a' || k === 'A') stepColour(-1);
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') stepColour(1);
      else act(0);
    };
    document.addEventListener('keydown', keyFn, true);
    if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('open');
    render();
    if (opts.look && !shop) lookMode(true);
    var t0 = performance.now();
    (function tick(now) { if (!el) return; drawPreview(now - t0); raf = requestAnimationFrame(tick); })(t0);
  }

  function close() {
    if (!el) return;
    looking = null;
    cancelAnimationFrame(raf);
    document.removeEventListener('keydown', keyFn, true);
    el.remove(); el = null;
    if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('close');
    if (typeof BridgeControls !== 'undefined') BridgeControls.enable();
  }

  function owned(r) { return r.kind === 'suit' ? !!state.suits[r.key] : r.kind === 'time' ? !!state.times[r.key] : !!state.packs[r.key]; }
  function info(r) { return r.kind === 'suit' ? SUITS[r.key] : r.kind === 'time' ? TIMES[r.key] : PACKS[r.key]; }
  /** Do you carry a timepiece that keeps this planet's clock? */
  function keepsTime(planet) {
    return Object.keys(state.times).some(function (k) { var T = TIMES[k]; return T && (T.reads.indexOf(planet) >= 0 || T.reads.indexOf('all') >= 0); });
  }
  /** The planets your timepieces keep (or 'all'). */
  function timeReads() {
    var out = [];
    Object.keys(state.times).forEach(function (k) { var T = TIMES[k]; if (T) T.reads.forEach(function (p) { if (out.indexOf(p) < 0) out.push(p); }); });
    return out.indexOf('all') >= 0 ? ['all'] : out;
  }
  function timeText(I) { return I.reads[0] === 'all' ? 'tells every world\'s time' : 'tells ' + I.reads.map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1); }).join(', ') + ' time'; }
  function choose(i) { if (!rows.length) return; sel = (i + rows.length) % rows.length; note = ''; render(); }
  function stepColour(d) {
    var i = COLOURS.map(function (c) { return c[0]; }).indexOf(previewColour);
    setColour(COLOURS[(i + d + COLOURS.length) % COLOURS.length][0]);
  }
  function setColour(c) {           // free, and it's what you wear from now on
    previewColour = c; state.colour = c; save();
    if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('blip');
    render();
  }

  // the wardrobe's Change look: the suit list and colours give way to the look editor (changes are free and
  // saved as you make them); Done goes back
  function lookMode(on) {
    if (!el) return;
    var box = el.querySelector('.gear-look');
    looking = on ? BridgeLook.editor(box, { look: BridgeLook.get(), onChange: function (l) { BridgeLook.set(l); } }) : null;
    if (!on) box.innerHTML = '';
    el.classList.toggle('gear-looking', !!on);
    note = on ? 'HOW YOU LOOK. IT COSTS NOTHING TO CHANGE.' : '';
    if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('blip');
    render();
  }

  function render() {
    if (!el) return;
    if (looking) {
      el.querySelector('.gear-note').textContent = note;
      el.querySelector('.gear-stats').innerHTML = '';
      var la = el.querySelector('.gear-actions');
      la.innerHTML = '<button class="wd-opt active" data-a="done">Done</button>';
      la.querySelector('.wd-opt').addEventListener('click', function (e) { e.stopPropagation(); lookMode(false); });
      el.querySelector('.wd-hint').innerHTML = '<span class="ip-key">Esc</span>Back';
      return;
    }
    el.querySelector('.wd-hint').innerHTML = '<span class="ip-key">Esc</span>Leave';
    var list = el.querySelector('.gear-list'), r = rows[sel];
    list.innerHTML = rows.map(function (row, i) {
      var I = info(row), tag;
      if (row.kind === 'suit') tag = state.style === row.key ? 'WEARING' : owned(row) ? 'OWNED' : I.price + ' COINS';
      else if (row.kind === 'time') tag = owned(row) ? 'CARRYING' : I.price + ' COINS';
      else tag = owned(row) ? (bestPack() === row.key ? 'CARRYING' : 'OWNED') : I.price + ' COINS';
      return '<button class="wd-item gear-row' + (i === sel ? ' active' : '') + '" data-i="' + i + '">' +
        '<span class="gear-name">' + esc(I.name) + '</span><span class="gear-tag">' + tag + '</span>' +
        '<span class="gear-perk">' + esc(row.kind === 'suit' ? perkText(I.perk) : row.kind === 'time' ? timeText(I) : '+' + I.slots + ' pack slots') + '</span></button>';
    }).join('') || '<div class="gear-perk">NOTHING HERE YET.</div>';
    list.querySelectorAll('.gear-row').forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); var i = +b.getAttribute('data-i'); if (i === sel) act(0); else choose(i); });
    });
    previewStyle = r && r.kind === 'suit' ? r.key : state.style;
    el.querySelectorAll('.gear-swatch').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-col') === previewColour); });
    el.querySelector('.gear-colname').textContent = previewColour.toUpperCase();
    // what you'd have with it
    var p = previewStyle ? SUITS[previewStyle].perk : perk();
    var slots = r && r.kind === 'pack' ? Math.max(packSlots(), PACKS[r.key].slots) : packSlots();
    el.querySelector('.gear-stats').innerHTML = '<span>HEALTH ' + (100 + (p.hp || 0)) + '</span><span>ENERGY ' + (100 + (p.energy || 0)) +
      '</span><span>PACK ' + (10 + slots) + ' SLOTS</span>' + (p.speed ? '<span>SPEED ' + (p.speed > 0 ? '+' : '') + Math.round(p.speed * 100) + '%</span>' : '');
    el.querySelector('.gear-note').textContent = note || (r ? info(r).blurb : '');
    // the action
    var acts = el.querySelector('.gear-actions'), label;
    if (!r) label = null;
    else if (!owned(r)) label = 'Buy for ' + info(r).price + ' coins';
    else if (r.kind === 'suit') label = state.style === r.key ? 'Wearing it' : 'Wear it';
    else label = 'Already yours';
    acts.innerHTML = (label ? '<button class="wd-opt active" data-a="go">' + label + '</button>' : '') +
      (el._shop ? '' : '<button class="wd-opt" data-a="look">Change look</button>') +
      '<button class="wd-opt" data-a="leave">Leave</button>';
    acts.querySelectorAll('.wd-opt').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var a = b.getAttribute('data-a');
        if (a === 'leave') close(); else if (a === 'look') lookMode(true); else act(0);
      });
    });
  }

  function act() {
    var r = rows[sel];
    if (!r || busy) return;
    if (owned(r)) {
      if (r.kind === 'suit' && state.style !== r.key) {
        state.style = r.key; save(); changed();
        note = 'YOU CHANGE INTO THE ' + SUITS[r.key].name.toUpperCase() + '.';
        if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('pickup');
      }
      render();
      return;
    }
    var I = info(r);
    if (typeof BridgeProgression === 'undefined' || !BridgeProgression.wagerCoins) { note = 'NO PURSE TO PAY FROM RIGHT NOW.'; render(); return; }
    busy = true; note = 'COUNTING OUT ' + I.price + ' COINS...'; render();
    BridgeProgression.wagerCoins(I.price, 'gear:' + r.key).then(function (res) {
      busy = false;
      if (!res || !res.ok) {
        note = res && (res.reason === 'insufficient' || res.reason === 'no_balance') ? 'NOT ENOUGH COINS FOR THAT ONE.'
             : res && res.reason === 'no_pilot' ? 'SIGN IN AS A PILOT TO BUY GEAR.' : 'THE SALE WON\'T GO THROUGH RIGHT NOW.';
        render(); return;
      }
      if (r.kind === 'suit') { state.suits[r.key] = 1; state.style = r.key; note = 'YOURS. YOU PUT IT ON THERE AND THEN.'; }
      else if (r.kind === 'time') { state.times[r.key] = 1; note = 'YOURS. THE TIME SHOWS BY THE PLACE\'S NAME NOW, WHEREVER IT KEEPS IT.'; }
      else { state.packs[r.key] = 1; note = 'YOURS. YOU MOVE YOUR THINGS INTO IT: ' + (10 + packSlots()) + ' SLOTS NOW.'; }
      save(); changed();
      if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('coin');
      render();
    }).catch(function () { busy = false; note = 'THE SALE WON\'T GO THROUGH RIGHT NOW.'; render(); });
  }

  // the pilot turning on the spot and walking in place, in the chosen suit and colour, looking as you look
  function drawPreview(t) {
    var c = el && el.querySelector('.gear-preview');
    if (!c) return;
    BridgeLook.drawPreview(c, t, looking ? state.style : previewStyle || state.style, previewColour, BridgeLook.get());
  }

  return { open: open, close: close, decorate: decorate, isOpen: function () { return !!el; },
           style: style, colour: colour, speed: speed, bonus: bonus, has: has, packSlots: packSlots, packName: function () { return PACKS[bestPack()].name; },
           keepsTime: keepsTime, timeReads: timeReads, SUITS: SUITS, PACKS: PACKS, TIMES: TIMES, SHOPS: SHOPS };
})();
