/**
 * BridgeAlpine — Hoarfell's grander side (Workstream E): Aurelle, the château and the resort town up the line from
 * Fellhaven (`hoarfell-aurelle`, tools/bridge-art/scenes/hoarfell_aurelle.py), Fellhaven's promenade (the rink, the
 * heated pool, the fondue stübli, the après-ski terrace, the sleighs, the station: `hoarfell-promenade`), and the
 * mountain railway between them (js/railway.js draws the journey).
 *
 * Interactions (registered with BridgeInteractions):
 *   aurelle / promenade   by label: the concierge, the terraces and fire pits, the sleighs, the spa and the pools,
 *                         the rue's shops and bars (vendors set up here so a re-render can't lose them)
 *   railway               board the train: the journey (BridgeRailway.ride, or straight there without it)
 *   railway_board         the departures board
 * Warmth goes through BridgeHoarfell.warm(minutes); rest through BridgeActions.rest. Steam over the heated pools
 * (`scene.steam`, screen tiles) is drawn on the hoarfell tileset's `over` hook. Saved in localStorage `bridge_alpine`.
 *
 *   BridgeAlpine.use(inter)   BridgeAlpine.ride(from, to)   BridgeAlpine.decorate(worldId, data)
 */
var BridgeAlpine = (function () {
  var KEY = 'bridge_alpine';
  var save = load();
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode */ } }
  function say(l, t) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(l, t); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }
  function warm(m) { if (typeof BridgeHoarfell !== 'undefined') BridgeHoarfell.warm(m); }
  function energy(n) { if (typeof BridgeInventory !== 'undefined') BridgeInventory.restoreEnergy(n); }
  function health(n) { if (typeof BridgeInventory !== 'undefined') BridgeInventory.restoreHP(n); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function note(t, s) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.note) BridgeQuests.note('Aurelle', t, s); }
  function float(t, c) {
    if (typeof BridgeFX !== 'undefined' && BridgeFX.spawnFloatingText && typeof BridgeCharacter !== 'undefined')
      BridgeFX.spawnFloatingText(BridgeCharacter.getX(), BridgeCharacter.getY() - 0.3, t, c || '#ffd890');
  }
  function night() {
    var s = typeof BridgeClock !== 'undefined' && BridgeClock.sky ? BridgeClock.sky('hoarfell') : null;
    return s ? s.sun < 0.3 : false;
  }
  function season() {
    var s = typeof BridgeClock !== 'undefined' && BridgeClock.sky ? BridgeClock.sky('hoarfell') : null;
    return (s && s.season) || 'winter';
  }
  // pay, then do: `fn` only once the coins are taken
  function pay(cost, why, fn, broke) {
    if (!cost) return fn();
    BridgeProgression.wagerCoins(cost, why).then(function (r) {
      if (!r || !r.ok) return broke ? broke() : say('NOT ENOUGH', 'THAT\'S ' + cost + ' COINS, AND YOU HAVEN\'T GOT THEM.');
      fn();
    });
  }
  function choose(title, text, rows, close) {
    BridgeInteractions.choose({ title: title, text: text, rows: rows, closeLabel: close || 'Not now' });
  }

  // ---- the shops and bars: what they sell (set up on their interactions as the world loads) ----------------------------
  var SHOPS = {
    'hoarfell-aurelle': {
      'LE REFUGE': { items: [['vin_chaud', 8], ['rosti', 12], ['raclette', 16], ['hot_cocoa', 6], ['fondue', 14]],
                     intro: 'LOW BEAMS, SKI BOOTS STEAMING BY THE STOVE, A BAND OF THREE PLAYING SOMETHING WITH A TUBA IN IT. THE AFTER-SKI CROWD SINGING ALONG, BADLY.' },
      'PATISSERIE': { items: [['macarons', 18], ['mille_feuille', 14], ['truffles', 24], ['sweet_roll', 6]],
                      intro: 'PINK BOXES TIED WITH RIBBON, A GLASS CASE OF MACARONS IN EVERY COLOUR, AND MADAME CERISE DUSTING SUGAR LIKE IT\'S SNOWING INDOORS.' },
      'BAR ETOILE': { items: [['champagne', 40], ['vin_chaud', 10], ['truffles', 26]],
                      intro: 'BLACK LACQUER AND GILT, A PIANIST PLAYING TO NOBODY IN PARTICULAR, AND A BARMAN WHO POLISHES THE SAME COUPE EVERY TIME YOU LOOK.' }
    },
    'hoarfell-promenade': {
      'STUBLI': { items: [['fondue', 14], ['raclette', 16], ['rosti', 12], ['mulled_cider', 6]],
                  intro: 'A LITTLE PINE ROOM WITH RED CHECK CLOTHS, THE CHEESE BUBBLING IN ITS POT, BREAD IN A BASKET, AND OLD KASPAR STIRRING IN FIGURES OF EIGHT.' },
      'TERRACE BAR': { items: [['vin_chaud', 8], ['mulled_cider', 6], ['hot_cocoa', 6], ['champagne', 38]],
                       intro: 'A BAR BUILT OF LOGS ON THE TERRACE, FUR THROWS ON THE BENCHES, AND MUSIC BIG ENOUGH TO HEAR FROM THE LIFT.' }
    }
  };
  function shopFor(world, label) { return (SHOPS[world] || {})[label]; }

  // ---- what each place does ---------------------------------------------------------------------------------------------
  function use(inter) {
    var L = inter.label, w = typeof BridgeWorld !== 'undefined' ? BridgeWorld.getWorldId() : '';
    switch (L) {
      case 'CONCIERGE': return concierge();
      case 'LA TERRASSE': case 'APRES-SKI': return terrace(L);
      case 'FIRE PIT': return firePit();
      case 'SLEIGHS': return sleigh();
      case 'THE GREAT FIR': return say('THE GREAT FIR', season() === 'winter'
        ? 'TALLER THAN THE CANOPY, DRESSED IN A THOUSAND LITTLE LIGHTS AND A GILT STAR. CHILDREN DARE EACH OTHER TO TOUCH THE LOWEST BOUGH; THE DOORMAN PRETENDS NOT TO SEE.'
        : 'THE TOWN\'S GREAT FIR, ITS LIGHTS STILL STRUNG THROUGH THE BOUGHS. THEY LIGHT IT EVERY EVENING WHATEVER THE SEASON. "TRADITION," SAYS THE CONCIERGE, AS IF THAT SETTLES IT.');
      case 'ICE SWAN': return say('ICE SWAN', 'CARVED FRESH EVERY WEEK FROM A BLOCK OF THE GLACIER, LIT FROM BELOW. THIS WEEK\'S HAS A SLIGHTLY SMUG EXPRESSION.');
      case 'SKI-IN': return skiIn();
      case 'CHAIRLIFT': return chairlift();
      case 'LES THERMES': return thermes();
      case 'ALPENHOF': return thermes('alpenhof');
      case 'HEATED POOL': return pool();
      case 'LA TABLE': return dine();
      case 'MAISON VAUTRIN': return vautrin();
      case 'RINK': return rink();
      case 'STATIONMASTER': return say('STATIONMASTER', '"THE AURELLE LINE. UP THE GORGE, OVER THE VIADUCT, ROUND THE GLACIER AND THROUGH THE MOUNTAIN. THE PRETTIEST HOUR AND A HALF IN THE WORLD, AND I\'VE SEEN THEM ALL FROM THIS PLATFORM."');
    }
    var sh = shopFor(w, L);
    if (sh) return BridgeInteractions.execute({ type: 'vendor', label: L, items: sh.items.map(function (i) { return { id: i[0], price: i[1] }; }), dialog: sh.intro });
  }

  function concierge() {
    choose('The concierge', 'MONSIEUR AUBERT, IN A FROCK COAT WITH CROSSED GOLDEN KEYS ON THE LAPELS, INCLINES HIS HEAD EXACTLY ONE CENTIMETRE. "WELCOME TO AURELLE. HOW MAY THE CHATEAU BE OF SERVICE?"', [
      { label: 'A room for the night', sub: 'a suite under the mansard: health and energy full, warm through', note: '80 coins', pick: function () {
        pay(80, 'rest:chateau', function () {
          if (typeof BridgeActions === 'undefined' || !BridgeActions.rest) { health(999); energy(999); warm(30); return say('CONCIERGE', 'YOU SLEEP LIKE A KING.'); }
          BridgeActions.rest({ rate: 1.4, text: 'A suite under the mansard: a fire in the grate, a bed like a cloud, the turrets lit outside the window.',
            rested: 'Breakfast on a silver tray, the mountains pink in the window. Health and energy full, warm through.',
            onTick: function (dt) { warm(dt * 2); }, woke: function () {} });
        }, function () { say('CONCIERGE', '"OF COURSE. PERHAPS MONSIEUR WOULD PREFER THE LODGE IN FELLHAVEN. IT IS VERY… RUSTIC."'); });
      } },
      { label: 'What is there to do?', sub: 'his recommendations', pick: function () {
        say('CONCIERGE', '"THE SALON DE JEU, OF COURSE, THROUGH THE GRAND HALL. LA TABLE FOR DINNER - BOOK, OR BRIBE. THE THERMES BEFORE, THE CHAMPAGNE AT BAR ETOILE AFTER. A SLEIGH ROUND THE TOWN AT DUSK. AND FOR THE VERY BRAVE, THE GUIDES TAKE PARTIES ACROSS THE GLACIER, HUT TO HUT. I HAVE NEVER UNDERSTOOD THE APPEAL."');
      } },
      { label: 'The way to the slopes', sub: 'the chairlift by the ski-in', pick: function () {
        say('CONCIERGE', '"THE CHAIRLIFT, MONSIEUR, BESIDE THE SKI-IN. IT TAKES YOU TO THE SUMMIT OF THE HOARSPIRE; FROM THERE EVERY RUN ON THE MOUNTAIN. ONE SKIS BACK TO THE DOOR. ONE DOES NOT WALK."');
      } }
    ], 'Thank you');
  }

  function terrace(L) {
    var shop = L === 'APRES-SKI' ? shopFor('hoarfell-promenade', 'TERRACE BAR') : null;
    choose(L === 'APRES-SKI' ? 'Après-ski' : 'La Terrasse', L === 'APRES-SKI'
      ? 'THE TERRACE IS PACKED: SKI BOOTS ON THE TABLES, FUR THROWS, A MAN IN A FOX HAT CONDUCTING THE SINGING WITH A BREADSTICK.'
      : 'THE CHATEAU\'S TERRACE: WHITE CLOTHS, HEATERS GLOWING OVER EVERY TABLE, FUR THROWS ON THE CHAIRS AND THE WHOLE RANGE IN FRONT OF YOU.', [
      { label: 'Sit under a heater', sub: 'warm through, a little rest', note: L === 'APRES-SKI' ? 'free' : '5 coins', pick: function () {
        pay(L === 'APRES-SKI' ? 0 : 5, 'apres', function () {
          warm(12); energy(15); sfx('sit'); float('+15 EN', '#60c8ff');
          say(L, night() ? 'THE HEATER HUMS OVERHEAD. ABOVE THE LAMPS THE STARS ARE OUT OVER THE PEAKS, AND SOMEBODY ORDERS ANOTHER ROUND.'
                         : 'YOU SINK INTO A FUR THROW UNDER THE GLOW. THE SUN ON YOUR FACE, THE COLD ON THE BACK OF YOUR NECK. PERFECT.');
        });
      } },
      { label: 'Order from the bar', sub: 'vin chaud, cocoa, champagne', pick: function () {
        var items = (shop || { items: [['vin_chaud', 10], ['champagne', 42], ['hot_cocoa', 8]] }).items;
        BridgeInteractions.execute({ type: 'vendor', label: L, items: items.map(function (i) { return { id: i[0], price: i[1] }; }) });
      } }
    ]);
  }

  function firePit() {
    warm(15); energy(5); sfx('sit');
    say('FIRE PIT', 'LOGS CRACKLING IN A STONE RING, LOUNGERS DRAWN UP ROUND IT, SOMEONE\'S GLOVES DRYING ON THE EDGE. WARM THROUGH FOR A QUARTER OF AN HOUR.');
  }

  // a ride round the town in a sleigh, bells on the horse, a fur rug over your knees
  function sleigh() {
    var w = BridgeWorld.getWorldId(), aurelle = w === 'hoarfell-aurelle';
    var cost = aurelle ? 30 : 20;
    choose('A sleigh ride', aurelle ? 'ANOUK HOLDS THE GREY\'S HEAD. "ROUND THE TOWN, UP PAST THE CHATEAU AND ALONG THE LAKE ROAD, BACK BY THE FIR. A FUR RUG, A FLASK OF SOMETHING HOT."'
                                    : 'OLD PER AND HIS BAY, BELLS ON THE HARNESS. "DOWN THE PROMENADE, ROUND THE RINK, OUT ALONG THE TARN AND BACK. NOBODY\'S COLD IN MY SLEIGH."', [
      { label: 'Take the ride', sub: 'warm for half an hour; energy', note: cost + ' coins', pick: function () {
        pay(cost, 'sleigh', function () { sleighRide(aurelle); });
      } }
    ]);
  }
  function sleighRide(aurelle) {
    sfx('jingle');
    var lines = aurelle
      ? [night() ? 'THE BELLS RING OUT OVER THE SNOW. THE CHATEAU\'S WINDOWS GO BY, EVERY ONE OF THEM LIT, THE TURRETS BLACK AGAINST THE STARS.' : 'THE BELLS RING OUT OVER THE SNOW. THE CHATEAU GOES BY, CREAM AND GREEN AND GOLD, FLAGS STANDING OUT IN THE WIND.',
         'ALONG THE LAKE ROAD THE GREY BLOWS STEAM. THE ICE ON THE LAKE GROANS SOMEWHERE OUT IN THE DARK; ANOUK SAYS IT ALWAYS DOES.',
         'BACK UNDER THE GREAT FIR, ITS LIGHTS ON YOUR FACE. ANOUK PASSES YOU THE FLASK. IT IS NOT COCOA.']
      : ['THE BELLS RING DOWN THE PROMENADE. SKATERS WAVE FROM THE RINK; STEAM ROLLS OFF THE POOL.',
         'OUT ALONG THE TARN, THE ICEFALL BLUE IN THE LAST LIGHT, THE LODGE\'S WINDOWS WARM BEHIND YOU.',
         'BACK IN THE VILLAGE, PER TUCKS THE RUG ROUND YOU ONE MORE TIME BEFORE HE LETS YOU OUT.'];
    var i = 0;
    (function next() {
      if (i >= lines.length) {
        warm(30); energy(25); float('+25 EN', '#60c8ff');
        if (save.sleigh !== today()) { save.sleigh = today(); store(); note('A sleigh ride', aurelle ? 'Round Aurelle, the château lit' : 'Down the promenade and round the tarn'); }
        return;
      }
      say(aurelle ? 'ANOUK\'S SLEIGH' : 'PER\'S SLEIGH', lines[i++]);
      setTimeout(function () { sfx('jingle'); }, 300);
      // the next line once this one's dismissed
      var check = setInterval(function () {
        if (!document.querySelector('.dialog-box.visible, #dialog-box.visible, .dlg.visible')) { clearInterval(check); next(); }
      }, 300);
      setTimeout(function () { clearInterval(check); }, 60000);
    })();
  }

  function skiIn() {
    choose('Ski-in', 'THE RUN COMES DOWN OFF THE MOUNTAIN STRAIGHT INTO TOWN UNDER THE BANNER, SKIERS SWINGING TO A STOP IN A SPRAY OF SNOW BY THE RACKS. NOBODY HERE CARRIES THEIR SKIS FURTHER THAN THEY HAVE TO.', [
      { label: 'Up the chairlift', sub: 'to the summit of the Hoarspire', pick: chairlift },
      { label: 'Watch them come in', sub: 'a minute in the sun', pick: function () {
        energy(5);
        say('SKI-IN', 'A RED-SUITED INSTRUCTOR WITH A LINE OF TINY SKIERS BEHIND HER LIKE DUCKLINGS. A MAN IN A FUR HAT WHO FALLS OVER STANDING STILL. A GIRL WHO STOPS SO HARD SHE SPRAYS THE DOORMAN.');
      } }
    ]);
  }
  function chairlift() {
    var opts = [{ label: 'Ride up to the summit', action: 'enter_world', target: 'hoarfell-summit', spawn: [20, 15] }, { label: 'Not now', action: 'close' }];
    BridgeInteractions.execute({ type: 'menu', label: 'CHAIRLIFT', options: opts,
      dialog: 'THE CHATEAU\'S CHAIRLIFT, PAINTED GREEN AND GOLD. A LIFTIE IN A FUR-TRIMMED HOOD BRUSHES THE SNOW OFF A SEAT FOR YOU.' });
  }

  // les Thermes: the spa
  function thermes(where) {
    choose(where === 'alpenhof' ? 'The Alpenhof spa' : 'Les Thermes', where === 'alpenhof'
      ? 'PINE PANELS, A STOVE, A ROW OF ROBES ON PEGS. FRAU HOLZER AT THE DESK, KNITTING: "SAUNA\'S HOT. MASSAGE IS MY SISTER, AND SHE\'S STRONGER THAN SHE LOOKS."'
      : 'MARBLE, STEAM, EUCALYPTUS. A WOMAN IN WHITE AT A DESK OF PALE STONE: "WELCOME. THE WATERS ARE WARM TODAY. THEY ARE ALWAYS WARM. IT\'S THE MOUNTAIN."', [
      { label: 'The sauna', sub: 'warm through for twenty minutes, energy', note: '15 coins', pick: function () {
        pay(15, 'spa', function () { warm(20); energy(30); float('+30 EN', '#60c8ff'); sfx('sit');
          say('LES THERMES', 'CEDAR AND HEAT. YOU SIT TILL YOU CAN\'T, THEN ROLL IN THE SNOW OUTSIDE LIKE THE LOCALS DO, THEN DO IT AGAIN.'); });
      } },
      { label: 'A massage', sub: 'health and energy full, warm for half an hour', note: '60 coins', pick: function () {
        pay(60, 'spa', function () { health(999); energy(999); warm(30); float('RESTORED', '#ffd890'); sfx('sit');
          say('LES THERMES', 'HOT STONES, WARM OIL, AND A MASSEUSE WITH THUMBS LIKE A CLIMBER. EVERY KNOT FROM EVERY RUN, GONE.'); });
      } },
      { label: 'The whole day', sub: 'all of it, and the cold won\'t touch you for an hour', note: '120 coins', pick: function () {
        pay(120, 'spa', function () { health(999); energy(999); warm(60); float('RESTORED', '#ffd890'); sfx('sit');
          if (save.spa !== today()) { save.spa = today(); store(); note('A day at Les Thermes', 'Sauna, pool, massage, nap'); }
          say('LES THERMES', 'SAUNA, POOL, MASSAGE, A NAP IN A ROBE BY A WINDOW FULL OF MOUNTAINS. YOU HAVE NEVER BEEN THIS RELAXED. THE COLD WON\'T FIND YOU FOR AN HOUR.'); });
      } }
    ]);
  }
  function pool() {
    warm(10); energy(10); sfx('splash');
    say('HEATED POOL', night()
      ? 'YOU SLIP INTO THE WATER. STEAM ROLLS OFF IT INTO THE DARK; SNOW ON THE COPING, STARS OVERHEAD, THE CHATEAU\'S WINDOWS SHAKING GOLD ON THE SURFACE.'
      : 'YOU SLIP INTO THE WATER. IT\'S HOT AS A BATH, SNOW ON THE COPING, STEAM ROLLING AWAY OVER THE LOUNGERS. YOU MIGHT NEVER GET OUT.');
  }
  function rink() {
    choose('The rink', 'SKATES IN A WOODEN RACK, EVERY SIZE. MUSIC FROM A SPEAKER IN A LAMP POST, A FEW COUPLES GOING ROUND, ONE SMALL BOY GOING BACKWARDS VERY FAST.', [
      { label: 'Hire skates and go round', sub: 'a few laps, warm and cheerful', note: '5 coins', pick: function () {
        pay(5, 'rink', function () { energy(10); warm(8); sfx('swish');
          say('THE RINK', 'ROUND AND ROUND UNDER THE LAMPS. YOU ONLY FALL ONCE, AND THE SMALL BOY HELPS YOU UP, WHICH IS WORSE.');
          if (save.rink !== today()) { save.rink = today(); store(); note('Skating', 'Round the rink on the promenade'); } });
      } }
    ]);
  }

  // La Table: dinner
  function dine() {
    choose('La Table', 'CANDLES, SILVER, A VIEW OF THE TURRETS. THE MAITRE D\' CONSULTS A BOOK THE SIZE OF A GRAVESTONE. "WE HAVE… ONE TABLE."', [
      { label: 'The tasting menu', sub: 'seven courses from the mountain; health and energy full, warm for an hour', note: '150 coins', pick: function () {
        pay(150, 'dine', function () {
          health(999); energy(999); warm(60); float('MAGNIFIQUE', '#ffd890'); sfx('sit');
          if (save.dined !== today()) { save.dined = today(); store(); note('Dinner at La Table', 'Seven courses, a view of the turrets'); }
          say('LA TABLE', 'CHAR FROM THE TARN ON A SLATE. A CONSOMME OF MOUNTAIN HERBS. VENISON WITH JUNIPER. A CHEESE TROLLEY WHEELED OVER LIKE A DIGNITARY. A SOUFFLE THAT ARRIVES TREMBLING. YOU ARE FULL, AND WARM, AND SLIGHTLY IN LOVE WITH THE SOMMELIER.');
        }, function () { say('LA TABLE', '"PERHAPS ANOTHER EVENING," SAYS THE MAITRE D\', CLOSING THE BOOK VERY GENTLY.'); });
      } },
      { label: 'Fondue at the bar', sub: 'the cheaper end of the room', note: '14 coins', pick: function () {
        pay(14, 'dine', function () { if (typeof BridgeInventory !== 'undefined') BridgeInventory.addItem('fondue', 1); say('LA TABLE', 'A LITTLE POT OF IT, TRUFFLED, BREAD IN A SILVER BASKET. YOU TAKE IT FOR LATER.'); });
      } }
    ]);
  }

  // Maison Vautrin: furs (a coat that keeps the cold out, in style) and a watch
  function vautrin() {
    if (typeof BridgeGear !== 'undefined' && BridgeGear.open && BridgeGear.SHOPS && BridgeGear.SHOPS.vautrin) return BridgeGear.open({ shop: 'vautrin' });
    say('MAISON VAUTRIN', 'COATS OF EVERY FUR ON BRASS RAILS AND A GLASS CASE OF WATCHES. MADAME VAUTRIN LOOKS AT YOUR FLIGHT SUIT THE WAY A DOCTOR LOOKS AT A WOUND.');
  }

  // ---- the railway ------------------------------------------------------------------------------------------------------
  var STATIONS = {
    'hoarfell-promenade': { name: 'Fellhaven', key: 'fellhaven', spawn: [28, 23] },
    'hoarfell-aurelle': { name: 'Aurelle', key: 'aurelle', spawn: [28, 34] }
  };
  function railway(inter) {
    var here = BridgeWorld.getWorldId(), to = inter.to || (here === 'hoarfell-aurelle' ? 'hoarfell-promenade' : 'hoarfell-aurelle');
    var A = STATIONS[here] || STATIONS['hoarfell-promenade'], B = STATIONS[to];
    var cost = 12;
    choose('The Aurelle Line', 'THE RED PANORAMIC TRAIN HUMS AT THE PLATFORM, ITS WINDOWS CURVING UP INTO THE ROOF. A CONDUCTOR IN A PEAKED CAP CHECKS HIS WATCH. "' +
           B.name.toUpperCase() + ', ALL STATIONS. UP THE GORGE, OVER THE VIADUCT, ROUND THE GLACIER."', [
      { label: 'Ride to ' + B.name, sub: save.rode ? 'about a minute and a half, through the mountains' : 'the first time: sit back and watch', note: cost + ' coins', pick: function () {
        pay(cost, 'railway', function () { ride(A.key, B.key, to, B.spawn); });
      } }
    ], 'Not now');
  }
  function ride(fromKey, toKey, to, spawn) {
    sfx('horn');
    var go = function () { BridgeWorld.enterWorld(to, spawn); };
    var first = !save.rode;
    save.rode = (save.rode || 0) + 1; store();
    if (first) note('The Aurelle Line', 'Fellhaven to Aurelle by the mountain railway');
    if (typeof BridgeRailway !== 'undefined' && BridgeRailway.ride) {
      BridgeRailway.ride(fromKey, toKey, { name: 'THE AURELLE LINE', sub: (fromKey === 'aurelle' ? 'AURELLE TO FELLHAVEN' : 'FELLHAVEN TO AURELLE') }).then(go, go);
    } else go();
  }
  function departures() {
    var h = typeof BridgeClock !== 'undefined' && BridgeClock.time ? BridgeClock.time('hoarfell') : null;
    say('DEPARTURES', 'THE AURELLE LINE - PANORAMIC SERVICE\n\nFELLHAVEN .......... DEP. ON THE HOUR\nTHE GORGE ......... \nTHE GREAT VIADUCT . \nGLACIER HALT ...... REQUEST\nCOL TUNNEL ........ \nAURELLE ........... ARR.\n\nAND BACK AGAIN ALL DAY. ' +
        (h ? 'THE STATION CLOCK SAYS ' + h.text + '. ' : '') + 'A NOTE PINNED UNDER IT: "TRAINS WAIT FOR SKIERS. WITHIN REASON."');
  }

  // ---- worlds as they load ------------------------------------------------------------------------------------------------
  function decorate(worldId, data) {
    if (!data || !data.interactions) return;
    if (worldId === 'hoarfell' && !data.interactions.some(function (i) { return i.label === 'THE PROMENADE'; })) {
      // Fellhaven's way down to its promenade: from the village's west end (js-added: the village's own render is
      // another session's — scenes/hoarfell.py — so the door lives here, at the foot of the street's west end)
      var spot = openNear(data, 2, 16, 3);
      if (spot) data.interactions.push({ x: spot[0], y: spot[1], type: 'enter_world', label: 'THE PROMENADE', prompt: 'PRESS E TO WALK DOWN',
        target: 'hoarfell-promenade', spawn: [42, 17] });
    }
    // the gear on Maison Vautrin's rail
    if (typeof BridgeGear !== 'undefined' && BridgeGear.SHOPS && !BridgeGear.SHOPS.vautrin) addVautrin();
  }
  // the nearest open cell to (x, y) within r tiles
  function openNear(data, x, y, r) {
    for (var d = 0; d <= r; d++) for (var dy = -d; dy <= d; dy++) for (var dx = -d; dx <= d; dx++) {
      var cx = x + dx, cy = y + dy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
      if (data.collisions[cy] && data.collisions[cy][cx] === 0) return [cx, cy];
    }
    return null;
  }
  function addVautrin() {
    var G = BridgeGear;
    if (G.SUITS && !G.SUITS.furs) G.SUITS.furs = { name: 'Aurelle Furs', price: 1200, perk: { energy: 20, cold: true },
      blurb: 'A long coat of silver fox over the suit, a fur hat to match. The cold can\'t get in, and nobody in Aurelle will look down their nose at you again.' };
    if (G.TIMES && !G.TIMES.vautrin_watch) G.TIMES.vautrin_watch = { name: 'Vautrin Chronograph', price: 1800, reads: ['hoarfell', 'lumar'],
      blurb: 'Gold, guilloché, two faces: Hoarfell\'s twelve hours and Lumar\'s eight. Madame Vautrin winds it for you before she lets it go.' };
    G.SHOPS.vautrin = { title: 'MAISON VAUTRIN', goods: ['suit:furs', 'time:vautrin_watch', 'suit:thermal'] };
  }

  // ---- drawing: steam off the heated pools -----------------------------------------------------------------------------------
  function over(ctx, world, offX, offY, ts, now) {
    var st = world.scene && world.scene.steam;
    if (!st || !st.length) return;
    var cold = 1 + (night() ? 0.5 : 0);
    st.forEach(function (p, i) {
      for (var q = 0; q < 7; q++) {
        var ph = ((now / 2600) + q / 7 + i * 0.37) % 1;
        var sx = offX + (p[0] + Math.sin(now / 1400 + q * 1.7 + i) * 0.35) * ts + ph * ts * 0.4;
        var sy = offY + p[1] * ts - ph * ts * 1.6;
        var sz = Math.round(ts * (0.18 + ph * 0.45));
        ctx.fillStyle = 'rgba(240,244,250,' + (0.32 * cold * (1 - ph) * Math.min(1, ph * 4)).toFixed(3) + ')';
        ctx.beginPath(); ctx.ellipse(Math.round(sx), Math.round(sy), sz, Math.round(sz * 0.6), 0, 0, Math.PI * 2); ctx.fill();
      }
    });
  }

  function init() {
    if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.register) {
      BridgeInteractions.register('aurelle', use, 'Go');
      BridgeInteractions.register('promenade', use, 'Go');
      BridgeInteractions.register('railway', railway, 'Board');
      BridgeInteractions.register('railway_board', departures, 'Read');
    }
    if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('hoarfell', { over: over });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  return { use: use, ride: ride, decorate: decorate, railway: railway, SHOPS: SHOPS, _save: function () { return save; } };
})();
