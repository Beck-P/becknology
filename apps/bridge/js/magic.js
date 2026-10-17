/**
 * BridgeMagic — the Peddler, the magic things he sells, and the curios people whisper about.
 *
 * WENDEL CRANE, PEDDLER OF ODDMENTS sets up in a different world each day (PLACES, by the date): the Market Square,
 * the District street, the village corner on Verdance, Fellhaven, Sapphire's quay, Enigma's docking bay. He sells
 * things that do something:
 *   - the Moonlit Wand: F casts a bolt of moonlight down the way you face, seven tiles, through the first creature
 *     it meets (2 energy a cast, most of it back once you stop for a breath — js/arms.js, the second wind);
 *   - the Heron Feather: carried, you walk a little quicker;
 *   - the Ring of Hoarfrost: carried, the cold can't touch you (like the Thermal Suit);
 *   - the Tide Charm: carried, the sloop sails a little faster;
 *   - the Glimmer Lantern: held, it shows what's hidden nearby (the curios) and tells you which way is warmer;
 * and two suits of clothes (the Starweave Robe, the Ranger's Cloak), and a rumour for a few coins.
 *
 * The CURIOS: twelve old things hidden round the worlds, each a piece of the same story — the Lantern Beyond the
 * Last Ridge, a light past the Hoarspire that sailors, miners and station crews all half-remember. A curio glints now
 * and then where it lies (much brighter to the lantern); pick it up and its piece of the tale goes in your journal.
 * All twelve tell the whole of it.
 *
 * Kept in localStorage bridge_magic.
 */
var BridgeMagic = (function () {
  var KEY = 'bridge_magic', DAY = 24 * 3600 * 1000;
  var PLACES = [
    { world: 'lumar-square', at: [11, 12], name: 'the Market Square on Lumar' },
    { world: 'arcadia-street', at: [18, 9], name: 'the District street in Arcadia' },
    { world: 'verdance-village', at: [19, 13], name: 'the square in Brambleford, on Verdance' },
    { world: 'hoarfell', at: [41, 21], name: 'Fellhaven, on Hoarfell' },
    { world: 'lumar-sapphire', at: [24, 22], name: 'the quay at Sapphire Port' },
    { world: 'enigma-dock', at: [11, 14], name: 'Docking Bay 3 on Enigma' }
  ];
  var WARES = [
    { id: 'moon_wand', price: 650 }, { id: 'glimmer_lantern', price: 240 }, { id: 'heron_feather', price: 380 },
    { id: 'frost_ring', price: 360 }, { id: 'tide_charm', price: 280 }
  ];
  var CURIOS = [
    { id: 'drowned_bell', name: 'Drowned Bell Clapper', world: 'lumar-midnight', at: [14, 21], near: 'the graveyard of the drowned on Midnight Isle',
      lore: 'Green bronze, heavy as a fist. Scratched along it in a sailor\'s hand: IT RANG ON ITS OWN THE NIGHT THE LANTERN WOKE.' },
    { id: 'glass_feather', name: 'Glass Feather', world: 'lumar-rose', at: [9, 24], near: 'the windmill in Rose Cove',
      lore: 'Spun glass, as light as a real one. The old glassblowers made them trying to catch the colour of the light past the ridge. None of them ever got it right.' },
    { id: 'keepers_lens', name: 'Chip of the Old Lens', world: 'lumar-sapphire', at: [6, 16], near: 'the lighthouse on Sapphire\'s hill',
      lore: 'A shard of the old light\'s lens. Hold it to your eye at night and one star in the north burns brighter than the rest — low, where the mountains would be.' },
    { id: 'ember_scale', name: 'Ember Scale', world: 'lumar-crimson', at: [26, 14], near: 'the great ribs on Crimson Reach',
      lore: 'Still warm. The pirates say dragons fly north at the end of their lives, to sleep beside a fire that never needs feeding.' },
    { id: 'wishing_coin', name: 'Old Wishing Coin', world: 'lumar-square', at: [11, 6], near: 'the fountain in the Market Square',
      lore: 'From the fountain\'s first year. A lantern on one face; on the other, a range of mountains, and a road going over them.' },
    { id: 'neon_koi', name: 'Neon Koi Charm', world: 'arcadia-street', at: [14, 8], near: 'the holo-billboard on the District street',
      lore: 'A street charm, a koi in pink glass. The seller swore it always turns to face "the cold light", wherever you hang it. It does.' },
    { id: 'circuit_coin', name: 'Bent Circuit Coin', world: 'arcadia-alley', at: [17, 9], near: 'the cat in the Backs',
      lore: 'Etched by a hacker ten years gone: a string of coordinates, a peak marked with a cross, and one word — BEYOND.' },
    { id: 'wren_patch', name: 'The Wren\'s Patch', world: 'enigma-dock', at: [7, 10], near: 'the Kestrel in Docking Bay 3',
      lore: 'The Wren crew\'s mission patch: a small bird flying at a light over a mountain. Nobody aboard ever said what it meant. They all wore it.' },
    { id: 'echo_shard', name: 'Echo Shard', world: 'singularity', at: [8, 20], near: 'the sundial at the Brink',
      lore: 'A splinter of a place that isn\'t here. Turn it in the light and you see a far ridge under snow, and in the ice of it, a lit door.' },
    { id: 'eddas_thimble', name: 'Edda\'s Thimble', world: 'verdance', at: [23, 6], near: 'the windmill on Verdance',
      lore: 'Silver, worn thin. Engraved inside: FOR THE ROAD NORTH, WHEN THE FARM\'S DONE WITH ME. She never went.' },
    { id: 'frozen_lantern', name: 'Frozen Lantern', world: 'hoarfell', at: [17, 20], near: 'the snowman in Fellhaven',
      lore: 'Iced solid, the flame still in it — not burning, not out. Ysolde won\'t touch it. "Things come down off the ridge like that," she says.' },
    { id: 'summit_rune', name: 'Rune Stone', world: 'hoarfell-summit', at: [6, 7], near: 'the observatory on the Hoarspire',
      lore: 'Carved by someone who came this far and went further: an arrow, and under it, THE LANTERN IS PAST THE LAST RIDGE. THE WIND TURNS BACK. DON\'T.' }
  ];

  var st = load();
  var bolts = [];
  function load() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    d = d || {};
    return { found: d.found || {}, rumours: d.rumours || 0 };
  }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode */ } }
  function say(t, x) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(t, x); }
  function toast(k, t, sub) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(k, t, sub); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }
  function carried(id) { return typeof BridgeInventory !== 'undefined' && BridgeInventory.getCount(id) > 0; }
  function held(id) { return typeof BridgeInventory !== 'undefined' && BridgeInventory.getSelectedItemId && BridgeInventory.getSelectedItemId() === id; }

  // ---- passive charms ---------------------------------------------------------------------------------------------
  function speed() { return carried('heron_feather') ? 1.12 : 1; }
  function has(what) {
    if (what === 'cold') return carried('frost_ring') || carried('lantern_beyond');
    if (what === 'tide') return carried('tide_charm');
    return false;
  }

  // ---- the Peddler: where he is today ------------------------------------------------------------------------------
  function today() { return Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / DAY); }
  function where() { return PLACES[today() % PLACES.length]; }
  function decorate(worldId, data) {
    var P = where();
    data.interactions = (data.interactions || []).filter(function (it) { return it.label !== 'PEDDLER'; });
    if (data.scene && data.scene.actors) data.scene.actors = data.scene.actors.filter(function (a) { return a.sheet !== 'npc-peddler'; });
    if (P.world === worldId) {
      data.interactions.push({ x: P.at[0], y: P.at[1], type: 'dialog', label: 'PEDDLER', text: '...' });
      if (data.scene) (data.scene.actors = data.scene.actors || []).push({ sheet: 'npc-peddler', x: P.at[0], y: P.at[1], facing: 'down' });
      if (data.collisions && data.collisions[P.at[1]]) data.collisions[P.at[1]][P.at[0]] = 1;
    }
    // curios still lying where they were left
    CURIOS.forEach(function (c) {
      if (c.world !== worldId || st.found[c.id]) return;
      if (data.interactions.some(function (it) { return it.curio === c.id; })) return;
      data.interactions.push({ x: c.at[0], y: c.at[1], type: 'curio', curio: c.id, label: 'SOMETHING GLINTING', prompt: 'PRESS E TO PICK IT UP', noBeacon: true });
    });
  }

  function shop() {
    var G = typeof BridgeGear !== 'undefined' ? BridgeGear : null;
    var rows = WARES.map(function (w) {
      var it = BridgeItems.get(w.id), have = carried(w.id);
      return { label: it.name, icon: w.id, stats: typeof it.damage === 'number' ? w.id : null, sub: have ? 'you have one' : it.desc,
               note: have ? 'owned' : w.price + ' coins', disabled: have,
               pick: function () { buy(w); } };
    });
    if (G) rows.push({ label: 'The clothes rail', sub: 'a starweave robe and a ranger\'s cloak', note: 'look', pick: function () {
      G.open({ shop: 'peddler', intro: '"WORN ONCE BY A WIZARD, AND ONCE BY A RANGER WHO WALKED PAST THE LAST RIDGE AND BACK. OR SO I\'M TOLD. TRY THEM ON."' });
    } });
    var left = CURIOS.filter(function (c) { return !st.found[c.id]; });
    if (left.length) rows.push({ label: 'A rumour', sub: 'where one of the old curios lies', note: '40 coins', pick: rumour });
    BridgeInteractions.choose({
      title: 'Wendel Crane, Peddler of Oddments',
      text: '"ODDMENTS, CURIOS, THINGS THAT DO WHAT THEY OUGHTN\'T. I\'M IN ' + where().name.toUpperCase() + ' TODAY - TOMORROW, WHO KNOWS. LOOK WITH YOUR HANDS, PAY WITH YOUR COINS."',
      rows: rows
    });
  }
  function buy(w) {
    var it = BridgeItems.get(w.id);
    BridgeProgression.wagerCoins(w.price, 'peddler:' + w.id).then(function (r) {
      if (!r || !r.ok) { say('WENDEL CRANE', '"COINS FIRST, FRIEND. THE MAGIC\'S PATIENT, BUT I\'M NOT."'); return; }
      if (!BridgeInventory.addItem(w.id, 1)) { say('WENDEL CRANE', '"YOUR PACK\'S FULL. I\'LL HOLD IT FOR YOU - NO, I WON\'T. MAKE ROOM."'); return; }
      sfx('pickup');
      toast('From the Peddler', it.name, 'In your pack');
      say('WENDEL CRANE', '"' + ({ moon_wand: 'POINT IT AWAY FROM YOUR FACE. F TO CAST. IT DRINKS A LITTLE OF YOU EACH TIME - THAT\'S THE PRICE.',
                                  glimmer_lantern: 'HOLD IT UP AND LOOK. THINGS THAT DON\'T WANT FINDING GET SHY OF IT.',
                                  heron_feather: 'TUCK IT IN YOUR COLLAR. YOU\'LL WALK LIKE YOU\'RE LATE FOR SOMETHING.',
                                  frost_ring: 'COLD AS A GRAVE, THAT RING. SO YOU WON\'T BE.',
                                  tide_charm: 'HANG IT ON THE MAST. THE SEA LIKES TO BE FLATTERED.' })[w.id] + '"');
    });
  }
  function rumour() {
    var left = CURIOS.filter(function (c) { return !st.found[c.id]; });
    BridgeProgression.wagerCoins(40, 'peddler:rumour').then(function (r) {
      if (!r || !r.ok) { say('WENDEL CRANE', '"RUMOURS COST, FRIEND. FORTY."'); return; }
      var c = left[(st.rumours++) % left.length];
      store();
      say('WENDEL CRANE', '"THEY SAY THERE\'S SOMETHING OLD BY ' + c.near.toUpperCase() + '. CATCHES THE LIGHT, IF YOU KNOW TO LOOK. A LANTERN HELPS."');
    });
  }

  // ---- curios ---------------------------------------------------------------------------------------------------
  function find(inter) {
    var c = CURIOS.filter(function (q) { return q.id === inter.curio; })[0];
    if (!c || st.found[c.id]) return;
    st.found[c.id] = Date.now(); store();
    var world = BridgeWorld.getWorld();
    if (world) world.interactions = world.interactions.filter(function (it) { return it.curio !== c.id; });
    var n = Object.keys(st.found).length;
    sfx(n === CURIOS.length ? 'quest' : 'clue');
    toast('Curio ' + n + ' of ' + CURIOS.length, c.name, 'The Lantern Beyond');
    say(c.name.toUpperCase(), c.lore.toUpperCase() + (n === CURIOS.length
      ? '\n\nTWELVE PIECES OF ONE STORY. PAST THE HOARSPIRE, PAST THE LAST RIDGE WHERE THE WIND TURNS BACK, A DOOR IN THE ICE, AND A LIGHT BEHIND IT THAT WAS OLD WHEN THE STARS WERE YOUNG. EVERYONE HAS HEARD OF IT. NOBODY HAS BEEN.'
      : '\n\n(' + n + ' OF ' + CURIOS.length + ' - THE REST OF THE STORY IS OUT THERE.)'));
    if (n === CURIOS.length && typeof BridgeProgression !== 'undefined' && BridgeProgression.recordAchievement) BridgeProgression.recordAchievement('lantern_beyond_tale', 300, { game: 'curios' });
  }
  // the lantern: which way is warmer
  function lantern() {
    var wid = BridgeWorld.getWorldId(), px = BridgeCharacter.getX(), py = BridgeCharacter.getY();
    var here = CURIOS.filter(function (c) { return c.world === wid && !st.found[c.id]; });
    if (!here.length) return say('GLIMMER LANTERN', 'THE FLAME SITS STILL AND SMALL. NOTHING HIDDEN HERE - NOTHING THAT\'S LEFT, ANYWAY.');
    var c = here[0], dx = c.at[0] - px, dy = c.at[1] - py, d = Math.hypot(dx, dy);
    var dir = Math.abs(dx) > Math.abs(dy) * 2 ? (dx > 0 ? 'EAST' : 'WEST') : Math.abs(dy) > Math.abs(dx) * 2 ? (dy > 0 ? 'SOUTH' : 'NORTH')
            : (dy > 0 ? 'SOUTH' : 'NORTH') + '-' + (dx > 0 ? 'EAST' : 'WEST');
    say('GLIMMER LANTERN', d < 2 ? 'THE FLAME FLARES WHITE. IT\'S RIGHT HERE.'
                         : 'THE FLAME LEANS ' + dir + (d < 6 ? ', BRIGHT AND EAGER. CLOSE.' : d < 14 ? ', AND BRIGHTENS A LITTLE.' : ', FAINT.'));
  }

  // ---- the wand -------------------------------------------------------------------------------------------------
  // The staff or wand is raised and thrust out (js/arms.js, the cast swing); the bolt leaves on the thrust. Charged
  // (F held), it's twice as strong, bigger, and goes on through whatever it meets.
  var lastCast = 0, COST = 2;
  function cost() { return COST - (typeof BridgeCodex !== 'undefined' && BridgeCodex.bonus('magic') ? 1 : 0); }          // the Collection's magic things, all found
  function cast(item) {
    var inv = BridgeInventory, A = typeof BridgeArms !== 'undefined' ? BridgeArms : null;
    var tired = function () { return inv.getStats && inv.getStats().energy < cost(); };
    // too tired: said over your head, not in a box mid-fight (the bolt's energy comes back once you stop - js/arms.js)
    var gutter = function () {
      sfx('error');
      if (typeof BridgeFX !== 'undefined' && BridgeFX.spawnFloatingText) BridgeFX.spawnFloatingText(BridgeCharacter.getX(), BridgeCharacter.getY() - 0.4, 'TOO TIRED', '#ffe0a0');
      return false;
    };
    if (tired()) return gutter();
    var fire = function (mult, charged) {
      if (A && A.spend ? !A.spend(cost()) : tired()) return gutter();
      if (!A && inv.useEnergy) inv.useEnergy(cost());
      var f = BridgeCharacter.getFacing(), dx = f === 'right' ? 1 : f === 'left' ? -1 : 0, dy = f === 'down' ? 1 : f === 'up' ? -1 : 0;
      var w = item;
      if (charged) { w = Object.create(item); w.damage = Math.round((item.damage || 30) * (mult || 2)); w.charged = true; }
      bolts.push({ x: BridgeCharacter.getX() + 0.5, y: BridgeCharacter.getY() + 0.3, dx: dx, dy: dy, d: 0, dmg: w.damage || 30, at: performance.now(), trail: [],
                   w: w, wisp: item.bolt === 'wisp', big: !!charged, struck: [] });
      sfx(item.bolt === 'wisp' ? 'zap' : 'swish');
      return false;
    };
    if (typeof BridgeArms !== 'undefined' && BridgeArms.swing({ item: item, cls: 'cast', onHit: fire })) return;
    var now = performance.now();
    if (now - lastCast < 450) return;
    lastCast = now;
    fire(1, false);
  }
  function stepBolts(dt) {
    var world = BridgeWorld.getWorld();
    bolts = bolts.filter(function (b) {
      var step = 14 * dt;
      b.x += b.dx * step; b.y += b.dy * step; b.d += step;
      b.trail.push([b.x, b.y]); if (b.trail.length > 8) b.trail.shift();
      if (!world) return false;
      var hit = world.interactions.filter(function (it) { return it.type === 'hostile' && b.struck.indexOf(it) < 0 && Math.hypot(it.x + 0.5 - b.x, it.y + 0.5 - b.y) < (b.big ? 0.95 : 0.75); })[0];
      if (hit) {
        var dmg = typeof BridgeCombat !== 'undefined' && BridgeCombat.damageFor ? BridgeCombat.damageFor(b.w, hit) : b.dmg;
        b.struck.push(hit);
        if (BridgeItems.strike) BridgeItems.strike(world, hit, dmg, b.w);
        sfx('impact_cast');
        if (!b.big) return false;                                 // a charged bolt goes on through
      }
      var tx = Math.floor(b.x), ty = Math.floor(b.y);
      if (world.collisions && world.collisions[ty] && world.collisions[ty][tx] && b.d > 1) return false;
      return b.d < 7;
    });
  }

  // ---- drawing (in every scene world) -----------------------------------------------------------------------------
  var lastT = 0;
  function over(ctx, world, offX, offY, ts, now) {
    var dt = Math.min(0.05, (now - (lastT || now)) / 1000);
    lastT = now;
    if (bolts.length) stepBolts(dt);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var FX = typeof BridgeFX !== 'undefined' && BridgeFX.disc ? BridgeFX : null;
    // a bolt: a soft round glow, a core of whole pixels, motes trailing off behind it (no squares)
    bolts.forEach(function (b) {
      b.trail.forEach(function (p, i) {
        var a = (i + 1) / b.trail.length, s = a > 0.6 ? 2 : 1;
        ctx.fillStyle = (b.wisp ? 'rgba(190,140,255,' : 'rgba(170,190,255,') + (0.55 * a).toFixed(2) + ')';
        ctx.fillRect(Math.round(offX + p[0] * ts + Math.sin(i * 2.1 + now / 80) * (1 - a) * 2) - (s >> 1), Math.round(offY + p[1] * ts) - (s >> 1), s, s);
      });
      var X = Math.round(offX + b.x * ts), Y = Math.round(offY + b.y * ts), R = b.big ? 13 : 9, r = b.big ? 3 : 2;
      if (FX) FX.glow(ctx, X, Y, R, b.wisp ? [190, 150, 255] : [180, 200, 255], b.big ? 0.65 : 0.5);
      ctx.fillStyle = b.wisp ? '#f0e4ff' : '#f4f6ff';
      if (FX) FX.disc(ctx, X, Y, r); else ctx.fillRect(X - r, Y - r, r * 2, r * 2);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(X, Y, 1, 1);
    });
    // curios: a glint now and then where one lies, bright to the lantern
    var wid = BridgeWorld.getWorldId && BridgeWorld.getWorldId(), lamp = held('glimmer_lantern') || held('lantern_beyond');
    var px = typeof BridgeCharacter !== 'undefined' ? BridgeCharacter.getX() : 0, py = typeof BridgeCharacter !== 'undefined' ? BridgeCharacter.getY() : 0;
    CURIOS.forEach(function (c, i) {
      if (c.world !== wid || st.found[c.id]) return;
      var X = Math.round(offX + (c.at[0] + 0.5) * ts), Y = Math.round(offY + (c.at[1] + 0.55) * ts);
      var near = Math.hypot(c.at[0] - px, c.at[1] - py), ph = ((now / 1000 + i * 0.7) % (lamp ? 1.2 : 3.4)) / (lamp ? 1.2 : 3.4);
      var s = Math.max(0, Math.sin(ph * Math.PI * 2));
      if (lamp && near < 9) {
        var g = ctx.createRadialGradient(X, Y, 0, X, Y, ts * 0.9);
        g.addColorStop(0, 'rgba(255,240,170,' + (0.25 + 0.2 * s).toFixed(2) + ')'); g.addColorStop(1, 'rgba(255,240,170,0)');
        ctx.fillStyle = g; ctx.fillRect(X - ts, Y - ts, ts * 2, ts * 2);
      }
      if (s < 0.25 && !(lamp && near < 9)) return;
      var L = 1 + Math.round(s * (lamp ? 4 : 2));
      ctx.fillStyle = 'rgba(255,250,220,' + (0.95 * Math.max(s, lamp ? 0.5 : 0)).toFixed(2) + ')';
      ctx.fillRect(X - L, Y, L * 2 + 1, 1); ctx.fillRect(X, Y - L, 1, L * 2 + 1);
    });
    ctx.restore();
  }
  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('*', { over: over });

  function use(inter) { if (inter.type === 'curio') find(inter); }
  function journal() {
    return CURIOS.filter(function (c) { return st.found[c.id]; }).map(function (c) { return { name: c.name, lore: c.lore, near: c.near }; });
  }

  return { decorate: decorate, shop: shop, use: use, cast: cast, lantern: lantern, speed: speed, has: has, where: where,
           journal: journal, total: CURIOS.length, CURIOS: CURIOS, _st: function () { return st; } };
})();
