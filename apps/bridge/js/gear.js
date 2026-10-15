/**
 * BridgeGear — what the pilot wears and carries.
 *
 * Suits are Blender models (tools/bridge-art/characters.py pilot-<style>),
 * each rendered in the six suit colours, standing and seated:
 * pilot-<style>-<colour>.png / pilot-sit-<style>-<colour>.png (the Flight Suit
 * is plain pilot-<colour>.png). A suit carries a perk — more health, more
 * energy, a quicker step, warmth. The colour is yours to change any time.
 * Backpacks add rows to the inventory (js/inventory.js asks packSlots()).
 *
 * Outfitters sell them: a tailor in the Lumar market, the import stall on
 * Sapphire, Cyber Gear on the District street, Joro's back room, Vex's
 * stash. A person's conversation topic with `outfit: <shop>` opens one too.
 * The wardrobe (the coat rack on the bridge, or OUTFIT in the inventory)
 * changes what you wear. Saved in localStorage `bridge_gear`.
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
               blurb: 'Corp security plate, a cuirass and pauldrons over the suit. Heavy, and very hard to hurt.' }
  };
  var PACKS = {
    flight:     { name: 'Flight Pack', slots: 6, price: 0, blurb: 'The little pack on every flight suit.' },
    satchel:    { name: "Courier's Satchel", slots: 12, price: 150, blurb: 'Waxed canvas, brass buckles, room for a day\'s gathering.' },
    expedition: { name: 'Expedition Pack', slots: 20, price: 400, blurb: 'A frame pack with a dozen pockets. Smells faintly of new nylon.' },
    voidweave:  { name: 'Voidweave Rucksack', slots: 30, price: 900, blurb: 'Folds space. Weighs nothing. Don\'t look inside for long.' }
  };
  var SHOPS = {
    lumar_tailor:     { title: 'THE TRAVELLING TAILOR', goods: ['suit:coat', 'pack:satchel'] },
    sapphire_imports: { title: 'RARE IMPORTS', goods: ['suit:thermal', 'pack:satchel'] },
    cyber_gear:       { title: 'CYBER GEAR', goods: ['suit:runner', 'pack:expedition'] },
    joro:             { title: "JORO'S BACK ROOM", goods: ['suit:plate', 'pack:expedition'] },
    vex:              { title: "VEX'S STASH", goods: ['pack:voidweave'] }
  };
  // outfitters set up on world interactions as worlds load (so a re-render can't lose them)
  var PLACES = [
    { world: 'lumar-square', label: 'MERCHANT', shop: 'lumar_tailor', prompt: 'PRESS E TO BROWSE',
      intro: 'A TRAVELLING TAILOR WITH BOLTS OF SAILCLOTH AND A BOX OF GOLD BRAID. "A CAPTAIN SHOULD LOOK LIKE ONE, FRIEND."' },
    { world: 'lumar-sapphire', label: 'STALL', at: [33, 18], shop: 'sapphire_imports', prompt: 'PRESS E TO BROWSE',
      intro: 'RARE IMPORTS. QUILTED SUITS FROM SOMEWHERE COLD, HUNG UP BESIDE THE ROPE. "QUALITY GUARANTEED. SURVIVAL NOT GUARANTEED."' },
    { world: 'arcadia-street', label: 'CYBER GEAR', shop: 'cyber_gear', prompt: 'PRESS E TO BROWSE',
      intro: 'CHROME HEADPHONES, MOD KITS, WIRES IN A DOZEN COLOURS, AND A RACK OF RUNNER JACKETS HUMMING ON THEIR HANGERS.' },
    { world: 'bridge', label: 'COAT RACK', wardrobe: true, prompt: 'PRESS E TO CHANGE' }
  ];

  var state = load();
  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    s = s && typeof s === 'object' ? s : {};
    s.suits = s.suits || { flight: 1 };
    s.packs = s.packs || { flight: 1 };
    if (!SUITS[s.style] || !s.suits[s.style]) s.style = 'flight';
    return s;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ } }

  function style() { return state.style; }
  function colour() { return state.colour || null; }
  function perk() { return SUITS[state.style].perk; }
  function speed() { return 1 + (perk().speed || 0); }
  function bonus() { return { hp: perk().hp || 0, energy: perk().energy || 0 }; }
  function has(what) { return !!perk()[what]; }
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
  var sheets = {};
  function sheet(styleKey, col) {
    var name = 'pilot-' + (styleKey === 'flight' ? '' : styleKey + '-') + col;
    if (!sheets[name]) { var im = new Image(); im.src = '/bridge/assets/characters/' + name + '.png'; sheets[name] = im; }
    return sheets[name];
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function theme() {
    var id = (BridgeWorld.getWorldId && BridgeWorld.getWorldId()) || '', w = BridgeWorld.getWorld(), ts = (w && w.tileset) || '';
    if (/^lumar/.test(id) || ts === 'lumar' || ts === 'tavern') return 'parchment';
    if (ts === 'arcadia' || /^(arcadia|cyber|chrome|junk|tech|null)/.test(id)) return 'neon';
    if (ts === 'enigma' || /^enigma/.test(id)) return 'crt';
    if (ts === 'verdance' || /^verdance/.test(id)) return 'meadow';
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
    for (var i = 0; i < rows.length; i++) if (rows[i].kind === 'suit' && rows[i].key === state.style && !shop) sel = i;
    previewColour = pilotColour();
    note = '';
    if (typeof BridgeControls !== 'undefined') BridgeControls.disable();
    el = document.createElement('div');
    el.id = 'gear-dialog';
    el.className = 'world-dialog wd-' + theme() + ' wd-gear';
    el.innerHTML = '<div class="wd-body"><div class="wd-title">' + esc(shop ? shop.title : 'WARDROBE') + '</div>' +
      (opts.intro ? '<div class="wd-text">' + esc(opts.intro) + '</div>' : '') +
      '<div class="gear-main"><canvas class="gear-preview" width="96" height="144"></canvas><div class="gear-list"></div></div>' +
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
    var t0 = performance.now();
    (function tick(now) { if (!el) return; drawPreview(now - t0); raf = requestAnimationFrame(tick); })(t0);
  }

  function close() {
    if (!el) return;
    cancelAnimationFrame(raf);
    document.removeEventListener('keydown', keyFn, true);
    el.remove(); el = null;
    if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('close');
    if (typeof BridgeControls !== 'undefined') BridgeControls.enable();
  }

  function owned(r) { return r.kind === 'suit' ? !!state.suits[r.key] : !!state.packs[r.key]; }
  function info(r) { return r.kind === 'suit' ? SUITS[r.key] : PACKS[r.key]; }
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

  function render() {
    if (!el) return;
    var list = el.querySelector('.gear-list'), r = rows[sel];
    list.innerHTML = rows.map(function (row, i) {
      var I = info(row), tag;
      if (row.kind === 'suit') tag = state.style === row.key ? 'WEARING' : owned(row) ? 'OWNED' : I.price + ' COINS';
      else tag = owned(row) ? (bestPack() === row.key ? 'CARRYING' : 'OWNED') : I.price + ' COINS';
      return '<button class="wd-item gear-row' + (i === sel ? ' active' : '') + '" data-i="' + i + '">' +
        '<span class="gear-name">' + esc(I.name) + '</span><span class="gear-tag">' + tag + '</span>' +
        '<span class="gear-perk">' + esc(row.kind === 'suit' ? perkText(I.perk) : '+' + I.slots + ' pack slots') + '</span></button>';
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
    acts.innerHTML = (label ? '<button class="wd-opt active" data-a="go">' + label + '</button>' : '') + '<button class="wd-opt" data-a="leave">Leave</button>';
    acts.querySelectorAll('.wd-opt').forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); if (b.getAttribute('data-a') === 'leave') close(); else act(0); });
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
      else { state.packs[r.key] = 1; note = 'YOURS. YOU MOVE YOUR THINGS INTO IT: ' + (10 + packSlots()) + ' SLOTS NOW.'; }
      save(); changed();
      if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('coin');
      render();
    }).catch(function () { busy = false; note = 'THE SALE WON\'T GO THROUGH RIGHT NOW.'; render(); });
  }

  // the pilot turning on the spot and walking in place, in the chosen suit and colour
  function drawPreview(t) {
    var c = el && el.querySelector('.gear-preview');
    if (!c) return;
    var g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    var im = sheet(previewStyle || state.style, previewColour);
    if (!im.complete || !im.naturalWidth) return;
    var dir = [0, 1, 2, 3][Math.floor(t / 1600) % 4], walking = Math.floor(t / 800) % 2;
    var col = walking ? 4 + Math.floor(t / 110) % 8 : [0, 1, 2, 1][Math.floor(t / 340) % 4];
    g.imageSmoothingEnabled = false;
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.beginPath(); g.ellipse(48, 135, 27, 8, 0, 0, Math.PI * 2); g.fill();
    g.drawImage(im, col * 32, dir * 48, 32, 48, 0, 0, 96, 144);
  }

  return { open: open, close: close, decorate: decorate, isOpen: function () { return !!el; },
           style: style, colour: colour, speed: speed, bonus: bonus, has: has, packSlots: packSlots, packName: function () { return PACKS[bestPack()].name; },
           SUITS: SUITS, PACKS: PACKS, SHOPS: SHOPS };
})();
