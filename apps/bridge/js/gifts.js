/**
 * BridgeGifts — giving people things.
 *
 * Anyone you can talk to can be given something from your pack ("Give a gift" in the conversation). Each has
 * their tastes (TASTES: what they love, like and can't stand; everyone else's reaction comes from what the thing
 * is), and a gift moves how they feel about you (js/talk.js bonds): loved +2, liked +1, something ordinary +0.5,
 * disliked -1. One gift a person a day — a second the same day is only polite. What you gave is remembered (a
 * memory in their bond), so the AI conversations know about it.
 *
 *   BridgeGifts.can()               // is there anything in your pack you could give?
 *   BridgeGifts.open(person)        // the gift picker, from a conversation
 */
var BridgeGifts = (function () {
  var KEY = 'bridge_gifts';
  var TASTES = {
    bridget: { love: ['honey', 'strawberry', 'posy'], like: ['apple', 'pumpkin', 'egg', 'milk'], hate: ['old_boot', 'stone'],
               loveLine: 'HONEY FROM YOUR OWN SKEPS? OH, THAT\'S GOING STRAIGHT IN THE CAKES. THE FIRST SLICE IS YOURS, AND I WON\'T HEAR OTHERWISE.' },
    percy: { love: ['heron_coin', 'pocket_watch'], like: ['posy', 'sea_glass', 'starfruit'], hate: ['old_boot'],
             loveLine: 'WELL, NOW. THAT\'S A COLLECTOR\'S PIECE. IT\'S GOING IN THE WINDOW - NOT FOR SALE. JUST TO LOOK AT.' },
    wat: { love: ['iron_ore', 'star_iron', 'mug_of_ale'], like: ['silver_ore', 'ploughmans', 'apple'], hate: ['posy'],
           loveLine: 'GOOD IRON. YOU CAN HEAR IT\'S GOOD - LISTEN. NO? WELL. I CAN. I\'LL MAKE SOMETHING FINE OF IT.' },
    ludd: { love: ['pumpkin', 'honey_cake'], like: ['turnip', 'carrot', 'bread', 'apple'], hate: ['sea_glass'],
            loveLine: 'A PUMPKIN LIKE THAT TAKES A SUMMER. YOU\'VE GOT THE KNACK. EDDA HAD IT TOO. IT SUITS THE FARM, HAVING SOMEONE WITH THE KNACK.' },
    // the harbour people of Lumar's seas
    bess: { love: ['ember_rum', 'pocket_watch'], like: ['silverfin', 'sea_glass', 'mug_of_ale'], hate: ['old_boot'],
            loveLine: 'NOW THAT\'S A GIFT A HARBOURMISTRESS CAN USE. IT\'S GOING IN THE DESK DRAWER WITH THE GOOD PEN.' },
    aldous: { love: ['star_pearl', 'heron_coin'], like: ['sapphire_crystal', 'pocket_watch', 'bread'], hate: ['old_boot', 'stone'],
              loveLine: 'EXTRAORDINARY. I SHALL HAVE IT ENTERED IN THE BOOK - UNDER GIFTS, NOT DUTIES, YOU UNDERSTAND.' },
    mira: { love: ['roseite', 'posy', 'glowtail'], like: ['rose_shrimp', 'sea_glass', 'honey'], hate: ['old_boot'],
            loveLine: 'IT HUMS, CAN YOU HEAR? I\'LL WEAVE IT INTO THE NEXT SAIL. SOMEONE WILL SAIL A LITTLE FASTER BECAUSE OF YOU.' },
    garro: { love: ['ember_rum', 'heron_coin', 'cutlass'], like: ['ember_snapper', 'iron_ore', 'mug_of_ale'], hate: ['posy'],
             loveLine: 'HAH. YOU\'VE GOT TASTE FOR A LANDLUBBER. I\'LL DRINK TO YOU - FROM THIS VERY BOTTLE, IF YOU DON\'T MIND.' },
    ferryman: { love: ['moon_eel', 'wisp_ember', 'star_pearl'], like: ['glowtail', 'midnight_crystal', 'bottle'], hate: ['posy'],
                loveLine: '...THIS WAS THE SEA\'S, AND NOW IT IS MINE. I HAVE NOT BEEN GIVEN A THING IN A HUNDRED YEARS.' },
    rowena: { love: ['pocket_watch', 'spore_silk', 'star_pearl'], like: ['bread', 'honey_cake', 'sapphire_crystal'], hate: ['old_boot'],
              loveLine: 'FOR ME? NOBODY BRINGS THE HARBOURMISTRESS ANYTHING BUT PAPERWORK. THANK YOU. TRULY.' },
    tern_pell: { love: ['silverfin', 'mug_of_ale', 'pipe'], like: ['bread', 'harbour_crab', 'apple'], hate: ['moon_eel'],
                 loveLine: 'A FINE FISH. I\'LL SMOKE HER TONIGHT AND THINK OF YOU. NOT MUCH, MIND. BUT I WILL.' },
    maud: { love: ['posy', 'honey_cake', 'sapphire_ray'], like: ['apple', 'bread', 'silverfin'], hate: ['old_boot'],
            loveLine: 'WELL! ISN\'T THAT LOVELY. DON\'T TELL MY HUSBAND - HE\'LL THINK HE HAS TO TRY HARDER.' },
    hetty: { love: ['honey_cake', 'posy', 'pumpkin_pie'], like: ['apple', 'bread', 'harbour_crab'], hate: ['old_boot', 'moon_eel'],
             loveLine: 'FOR ME? NOBODY BUYS THE LANDLADY ANYTHING. I\'LL PUT IT BEHIND THE BAR WHERE THE LANDLADY CAN SEE IT. THE OTHER ONE.' },
    annie: { love: ['mug_of_ale', 'star_pearl', 'sea_glass'], like: ['silverfin', 'sea_biscuit', 'bread'], hate: ['posy'],
             loveLine: 'NOW THAT\'S A GIFT FOR A SAILOR. YOU\'RE ALL RIGHT, CAPTAIN. DON\'T LET IT GO TO YOUR HEAD.' },
    joss: { love: ['pocket_watch', 'mug_of_ale', 'ember_snapper'], like: ['bowl_of_stew', 'iron_ore', 'silver_nail'], hate: ['posy', 'honey_cake'],
            loveLine: 'HUH. FOR ME? NOBODY\'S GIVEN JOSS ANYTHING SINCE... HUH. I\'LL GO EASY ON YOU AT BONES. ONCE.' },
    bosun: { love: ['mug_of_ale', 'bowl_of_stew', 'harbour_crab'], like: ['sea_biscuit', 'bread', 'silverfin'], hate: ['old_boot'],
             loveLine: 'NOW THERE\'S A CAPTAIN WHO LOOKS AFTER HER PEOPLE. I\'LL PUT YOUR NAME AT THE TOP OF THE LIST.' },
    registrar: { love: ['pocket_watch', 'sapphire_crystal', 'spore_silk'], like: ['honey_cake', 'bread'], hate: ['old_boot', 'harbour_crab'],
                 loveLine: 'A GIFT. HOW... IRREGULAR. I SHALL NOTE IT IN THE BOOK. FAVOURABLY.' },
    quill: { love: ['honey_cake', 'sweet_roll', 'pocket_watch'], like: ['bread', 'apple'], hate: ['old_boot', 'moon_eel'],
             loveLine: 'FOR ME? I\'LL HAVE IT AT ELEVEN, WITH THE TEA, AFTER THE SUMS.' },
    wynn: { love: ['pocket_watch', 'honey_cake'], like: ['bread', 'apple', 'sweet_roll'], hate: ['old_boot', 'harbour_crab'],
            loveLine: 'I\'LL ENTER THIS IN THE REGISTER UNDER "KINDNESSES". IT\'S A SHORT PAGE.' },
    pim: { love: ['sea_glass', 'star_pearl', 'edelweiss'], like: ['apple', 'honey_cake'], hate: ['old_boot'],
           loveLine: 'OH! I\'LL KEEP IT ON THE CHART TABLE. IT CAN BE A CONTINENT.' },
    liesl: { love: ['roseite', 'sea_glass', 'honey'], like: ['apple', 'sunflower', 'posy'], hate: ['old_boot', 'stone_shard'],
             loveLine: 'OH, LOOK AT THE CLARITY ON THAT. I\'LL GROW YOU ONE BACK. IN ABOUT SIX YEARS.' },
    bryony: { love: ['harbour_crab', 'honey_cake', 'pumpkin_pie'], like: ['bread', 'apple', 'silverfin'], hate: ['old_boot'],
              loveLine: 'CRAB! IN THE POT IT GOES. YOU\'RE IN THE STEW NOW, CAPTAIN. THAT\'S A COMPLIMENT.' },
    coralie: { love: ['posy', 'sunflower', 'honey'], like: ['bread', 'apple', 'sea_glass'], hate: [],
               loveLine: 'THANK YOU, DEAR. IT\'LL GO ON THE ALTAR TONIGHT, FOR THE ONES STILL OUT.' },
    nell: { love: ['sunflower', 'posy', 'strawberry'], like: ['honey', 'apple', 'edelweiss'], hate: ['old_boot', 'stone_shard'],
            loveLine: 'SUNFLOWERS! FROM YOUR OWN FIELD? THEY\'RE GOING IN THE MIDDLE OF THE STALL WHERE EVERYONE CAN SEE.' },
    'gran-wilde': { love: ['strawberry', 'honey', 'sweet_roll'], like: ['apple', 'silverfin', 'bread', 'sea_glass'], hate: ['old_boot'],
                    loveLine: 'OH, YOU DEAR. MY HUSBAND USED TO BRING ME THESE. SIT DOWN, I\'LL PUT THE KETTLE ON.' },
    corra: { love: ['crimson_crystal', 'ember_snapper'], like: ['iron_dagger', 'cutlass', 'mug_of_ale'], hate: ['sunflower', 'sweet_roll'],
             loveLine: 'A CRIMSON STONE. YOU KNOW WHAT THIS MEANS ON THE REACH? NO. YOU DON\'T. KEEP BEING THE KIND WHO DOESN\'T.' },
    ilsa: { love: ['heron_coin', 'sea_glass'], like: ['moonstone', 'edelweiss', 'star_pearl'], hate: ['turnip'],
            loveLine: 'A HERON COIN. THESE TURN UP ON MAPS, YOU KNOW - AS LANDMARKS. I\'LL DRAW THIS ONE IN.' },
    traveller: { love: ['mug_of_ale', 'roast_chestnuts'], like: ['bread', 'apple', 'hot_cocoa'], hate: ['old_boot'] },
    morwen: { love: ['midnight_crystal', 'starfruit', 'moon_eel'], like: ['moonstone', 'songstone', 'star_pearl'], hate: ['turnip', 'carrot'],
              loveLine: 'STARFRUIT. GROWN UNDER A TRUE SUN, AND BROUGHT TO MY TOWER IN THE DARK. THE MOON NOTICED. SO DID I.' },
    pell: { love: ['roseite', 'rose_shrimp'], like: ['sapphire_crystal', 'crimson_crystal', 'sea_glass'], hate: ['old_boot'] },
    zephyr: { love: ['bluefin', 'sapphire_ray'], like: ['silverfin', 'pumpkin', 'starfruit'], hate: ['stone'] },
    potter: { love: ['sunflower', 'sea_glass'], like: ['stone_shard', 'honey', 'apple'], hate: ['old_boot'],
              loveLine: 'SUNFLOWERS! I\'VE BEEN TRYING TO GET THAT YELLOW INTO A GLAZE FOR A YEAR. HOLD STILL - NO, HOLD IT UP. YES.' },
    regular: { love: ['mug_of_ale', 'bowl_of_stew'], like: ['turnip', 'bread', 'roast_chestnuts'], hate: ['strawberry'] },
    merchant: { love: ['heron_coin', 'star_pearl'], like: ['silver_ore', 'silverfin'], hate: ['old_boot'] },
    stranger: { love: ['songstone', 'heartsong'], like: ['moonstone', 'star_iron'], hate: ['apple'] },
    pip: { love: ['strawberry', 'sweet_roll', 'heron_coin'], like: ['apple', 'honey', 'sea_glass', 'hot_cocoa'], hate: ['turnip', 'carrot'],
           loveLine: 'NO WAY. FOR ME? I\'M NOT SHARING IT. ...OKAY ONE BITE. NO. MINE.' },
    nakuri: { love: ['health_draught', 'antidote'], like: ['honey', 'apple', 'carrot'], hate: ['mug_of_ale'] },
    tinker: { love: ['star_iron', 'silver_nail'], like: ['iron_ore', 'silver_ore', 'old_boot'], hate: ['strawberry'],
              loveLine: 'STAR IRON. DO YOU KNOW WHAT I CAN DO WITH STAR IRON? NEITHER DO I YET. THAT\'S THE BEST PART.' },
    miyu: { love: ['carrot', 'bluefin', 'pumpkin'], like: ['turnip', 'silverfin', 'rose_shrimp'], hate: ['old_boot'],
            loveLine: 'CARROTS THAT GREW IN DIRT. UNDER A SKY. I COULD CRY. I WON\'T, THE BROTH IS SALTY ENOUGH.' },
    marshal: { love: ['hot_cocoa', 'roast_chestnuts'], like: ['bread', 'apple'], hate: ['sunflower'] },
    joro: { love: ['starfruit', 'heron_coin', 'star_pearl'], like: ['silver_ore', 'moonstone', 'sea_glass'], hate: ['turnip'] },
    okafor: { love: ['carrot', 'strawberry', 'sunflower'], like: ['turnip', 'apple', 'honey'], hate: ['old_boot'],
              loveLine: 'SOMETHING GROWN. OUT THERE. IN SOIL. THE HYDRO BAY GROWS FOR NUMBERS; THIS GREW BECAUSE SOMEONE WANTED IT TO. THANK YOU.' },
    vex: { love: ['songstone', 'star_iron'], like: ['lockpick', 'moonstone'], hate: ['sunflower', 'strawberry'] },
    // Arcadia below (js/undercity.js)
    roo: { love: ['egg', 'eel_fillet'], like: ['carrot', 'turnip', 'honey'], hate: ['scrap_metal'],
           loveLine: 'FRESH! FROM A FARM, WITH SUN ON IT! THIS GOES IN TOMORROW\'S BROTH, AND THE WHOLE WARRENS WILL TASTE IT.' },
    sallow: { love: ['chrome_part', 'circuit'], like: ['medkit', 'sump_pearl'], hate: ['posy', 'honey'],
              loveLine: 'NOW THAT\'S A JOINT. HARDLY USED. SOMEONE WILL WALK BETTER BECAUSE OF YOU. PROBABLY ME.' },
    nell: { love: ['ember_rum', 'pocket_watch'], like: ['drip_lager', 'mug_of_ale', 'sea_glass'], hate: ['old_boot'] },
    tally: { love: ['pocket_watch', 'heron_coin'], like: ['kopi', 'pit_rotgut'], hate: ['posy'] },
    brick: { love: ['roo_broth'], like: ['char_skewers', 'steam_dumplings'], hate: ['glow_shot'] },
    gage: { love: ['sump_pearl', 'chrome_part'], like: ['circuit', 'scrap_metal', 'kopi'], hate: ['posy'] },
    static: { love: ['songstone'], like: ['foundry_tonic', 'circuit', 'glow_shot'], hate: ['kopi'] },
    teo: { love: ['eel_fillet', 'silverfin'], like: ['sump_laksa', 'bread', 'kopi'], hate: ['scrap_metal'],
           loveLine: 'A FISH FROM A SEA WITH A SKY OVER IT. I\'LL COOK IT TONIGHT AND THINK ABOUT THE SKY.' },
    wen: { love: ['posy', 'moonstone'], like: ['honey', 'sea_glass', 'sump_pearl'], hate: ['pit_rotgut'],
           loveLine: 'FLOWERS. DOWN HERE. I WILL PUT THEM ON THE TOP STEP, WHERE THE WATER CAN SEE THEM.' },
    lux: { love: ['glow_shot', 'void_fizz'], like: ['foundry_tonic', 'sump_pearl'], hate: ['kopi'] },
    cook: { love: ['carrot', 'pumpkin'], like: ['turnip', 'silverfin'], hate: ['old_boot'] },
    keeper: { love: ['sunflower', 'honey', 'moonstone'], like: ['bread', 'silverfin', 'hot_cocoa'], hate: ['old_boot'],
              loveLine: 'SUNFLOWERS FOR THE LAMP ROOM. THE BEAM WILL HAVE COMPANY ON THE LONG NIGHTS. THREE LONG, ONE SHORT - THAT MEANS THANK YOU.' },
    sev: { love: ['heron_coin', 'starfruit'], like: ['sweet_roll', 'apple'], hate: ['old_boot'] },
    // the Neon Royale (the casino on the District street)
    duchess: { love: ['star_pearl', 'champagne', 'pocket_watch'], like: ['gold_chip', 'starfruit', 'royale_martini'], hate: ['old_boot', 'turnip'],
               loveLine: 'WELL. NOBODY BRINGS THE HOUSE ANYTHING - THEY ONLY EVER TAKE. I SHALL KEEP THIS WHERE I CAN SEE IT FROM MY CHAIR.' },
    lou: { love: ['lucky_dice', 'pocket_watch'], like: ['gold_rush', 'roast_chestnuts', 'mug_of_ale'], hate: ['void_fizz'],
           loveLine: 'THESE DICE ROLLED ON MY FLOOR. I KNOW THEM BY THE CHIP ON THE FIVE. ...THANK YOU. THEY WERE GOOD DICE.' },
    penny: { love: ['gold_chip', 'heron_coin'], like: ['honey_cake', 'royale_globe', 'sweet_roll'], hate: ['old_boot'],
             loveLine: 'A REAL GOLD CHIP - I CAN HEAR IT. IT\'S GOING IN THE FRAME BY MY WINDOW. THE WHOLE CAGE WILL BE JEALOUS.' },
    bruno: { love: ['wagyu_royale', 'roast_chestnuts'], like: ['gold_rush', 'apple'], hate: ['posy'] },
    ozzie: { love: ['honey', 'strawberry'], like: ['champagne', 'apple', 'void_fizz'], hate: ['old_boot'],
             loveLine: 'REAL HONEY. DO YOU KNOW WHAT THIS DOES TO A GOLD RUSH? NEITHER DOES ANYONE ELSE IN ARCADIA. YET.' },
    velvet: { love: ['posy', 'champagne', 'star_pearl'], like: ['souffle_royale', 'royale_martini', 'sunflower'], hate: ['old_boot', 'stone'],
              loveLine: 'FLOWERS, FOR ME? FROM SOMEWHERE WITH A SKY? DARLING, I\'LL SING THE NEXT ONE FOR YOU.' },
    rafe: { love: ['gold_chip', 'pocket_watch'], like: ['champagne', 'royale_globe'], hate: ['old_boot'] },
    mimi: { love: ['royale_globe', 'posy'], like: ['sweet_roll', 'strawberry', 'sea_glass'], hate: ['old_boot'] },
    kit: { love: ['void_fizz', 'songstone'], like: ['lucky_dice', 'stim_pack', 'apple'], hate: ['turnip'] },
    laurent: { love: ['champagne', 'starfruit'], like: ['honey', 'strawberry', 'souffle_royale'], hate: ['old_boot', 'void_fizz'] },
    mori: { love: ['starfruit', 'pumpkin', 'honey'], like: ['strawberry', 'bluefin', 'sun_carp', 'egg'], hate: ['neon_udon'],
            loveLine: 'THIS GREW UNDER A SUN. I CAN TELL. I CAN ALWAYS TELL. TONIGHT\'S MENU JUST CHANGED, AND YOU EAT FIRST.' },
    gideon: { love: ['gold_rush', 'pocket_watch'], like: ['roast_chestnuts', 'hot_cocoa'], hate: ['old_boot'] },
    hob: { love: ['songstone', 'star_iron', 'pumpkin'], like: ['iron_ore', 'roseite', 'mug_of_ale'], hate: ['sunflower'],
           loveLine: 'A PUMPKIN. I HAVEN\'T HAD PUMPKIN SINCE MY MAM MADE IT. DON\'T TELL ANYONE I SAID THAT. DON\'T TELL ANYONE ANYTHING.' },
    hollin: { love: ['starfruit', 'sun_carp'], like: ['honey', 'apple', 'pumpkin'], hate: ['old_boot'] },
    marlo: { love: ['starfruit', 'pumpkin'], like: ['honey', 'strawberry', 'sunflower'], hate: ['old_boot'] },
    ysolde: { love: ['edelweiss', 'summit_crystal', 'climbing_rope'], like: ['honey', 'chalk', 'hot_cocoa'], hate: ['sweet_roll'] },
    tove: { love: ['pumpkin', 'honey', 'strawberry'], like: ['apple', 'roast_chestnuts'], hate: ['old_boot'],
            loveLine: 'PUMPKIN! THE LIFT CREW WILL HAVE PIE BY SUPPER, AND YOU\'LL HAVE THE FIRST SLICE. NO ARGUING.' },
    ansgar: { love: ['hot_cocoa', 'roast_chestnuts'], like: ['bread', 'arctic_char'], hate: ['strawberry'] },
    liv: { love: ['ski_goggles', 'edelweiss'], like: ['hot_cocoa', 'honey', 'apple'], hate: ['mug_of_ale'] },
    tam: { love: ['strawberry', 'mug_of_ale'], like: ['apple', 'bread', 'sweet_roll'], hate: ['old_boot'] },
    odile: { love: ['honey', 'sunflower'], like: ['turnip', 'bread', 'pumpkin'], hate: ['old_boot'] },
    juno: { love: ['summit_crystal', 'ski_goggles'], like: ['hot_cocoa', 'roast_chestnuts', 'strawberry'], hate: ['old_boot'],
            loveLine: 'NO. WAY. THIS IS GOING ON THE RAIL. RIGHT AT THE KINK. EVERYONE WHO SLIDES IT WILL SEE IT AND NOT KNOW WHERE IT CAME FROM.' },
    mette: { love: ['honey', 'strawberry'], like: ['apple', 'milk', 'egg', 'edelweiss'], hate: ['old_boot', 'void_fizz'],
             loveLine: 'OH, NOW. FOR THE KITCHEN? I\'LL MAKE SOMETHING WITH IT AND YOU\'LL HAVE THE FIRST OF IT, AND THAT\'S THAT.' },
    bryn: { love: ['mulled_cider', 'edelweiss'], like: ['hot_cocoa', 'roast_chestnuts', 'fondue', 'pocket_watch'], hate: ['void_fizz'],
            loveLine: 'WELL. I HAVEN\'T BEEN GIVEN ONE OF THESE SINCE I COULD STILL GET UP THE STAIRCASE FOR MY OWN. THANK YOU, CLIMBER.' },
    sigrun: { love: ['silver_nail', 'pocket_watch'], like: ['mulled_cider', 'fondue', 'hoar_crystal'], hate: ['old_boot'],
              loveLine: 'NOW THAT\'S PRETTY WORK. SOMEBODY MADE THIS TO LAST. I\'LL KEEP IT IN THE LIFT HUT WHERE BRYN CAN\'T WIN IT OFF ME.' },
    // Elderglade's elves (Sylvara)
    elf_bard: { love: ['heron_feather', 'honey_cake', 'mulled_cider'], like: ['honey', 'apple', 'posy'], hate: ['old_boot'],
                loveLine: 'A FEATHER FIT FOR A CAP! I\'LL WEAR IT TONIGHT AND PUT YOU IN A VERSE. A SHORT VERSE. YOU\'VE ONLY JUST ARRIVED.' },
    elf_herbalist: { love: ['edelweiss', 'honey', 'sunflower'], like: ['strawberry', 'apple', 'carrot', 'posy'], hate: ['void_fizz'],
                     loveLine: 'EDELWEISS, FROM THE ICE WORLD. IT KEEPS ITS SCENT EVEN DRIED. I\'LL PRESS IT IN THE BOOK WITH THE ONES THAT MATTER.' },
    elf_warden: { love: ['heron_feather', 'glimmer_lantern'], like: ['bread', 'apple', 'roast_chestnuts'], hate: ['void_fizz'],
                  loveLine: 'A HERON\'S FEATHER. STRAIGHT AND TRUE. IT WILL FLETCH AN ARROW THAT DOESN\'T MISS, AND I\'LL THINK OF YOU WHEN IT DOESN\'T.' },
    elf_lamplighter: { love: ['moonstone', 'glimmer_lantern', 'star_pearl'], like: ['honey', 'edelweiss', 'posy'], hate: ['old_boot'],
                       loveLine: 'IT HOLDS A LITTLE LIGHT, LIKE THE WELL DOES. I\'LL HANG IT IN THE LANTERN BY THE GREAT TREE. WHEN YOU PASS, IT WILL BE A LITTLE BRIGHTER.' },
    elf_weaver: { love: ['heron_feather', 'sunflower', 'strawberry'], like: ['posy', 'honey', 'sea_glass'], hate: ['stone', 'old_boot'],
                  loveLine: 'OH, THE COLOUR OF IT. THAT\'S GOING INTO A CLOAK. YOU\'LL KNOW IT WHEN YOU SEE A WARDEN WEARING IT.' },
    elf_child: { love: ['honey_cake', 'strawberry', 'sweet_roll'], like: ['apple', 'posy', 'sea_glass', 'heron_feather'], hate: ['turnip'],
                 loveLine: 'FOR ME? FOR ACTUALLY ME? I\'M GOING TO KEEP IT FOREVER. OR EAT IT. PROBABLY EAT IT.' }
  };
  var NOT = { key: 1, map: 1, seed: 1 };                  // things that aren't gifts

  var given = {};
  try { given = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { given = {}; }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(given)); } catch (e) { /* private mode */ } }
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

  function giftable() {
    if (typeof BridgeInventory === 'undefined' || typeof BridgeItems === 'undefined') return [];
    var all = BridgeInventory.getAll() || {};
    return Object.keys(all).filter(function (id) {
      var it = BridgeItems.get(id);
      return it && all[id] > 0 && !NOT[it.type] && !/^tmap_/.test(id);
    }).map(function (id) { return { id: id, n: all[id], item: BridgeItems.get(id) }; });
  }
  function can() { return giftable().length > 0; }

  /** How they take it: love / like / plain / hate. */
  function taste(pid, id) {
    var T = TASTES[pid] || {};
    if ((T.love || []).indexOf(id) >= 0) return 'love';
    if ((T.like || []).indexOf(id) >= 0) return 'like';
    if ((T.hate || []).indexOf(id) >= 0) return 'hate';
    if (id === 'old_boot' || id === 'stone') return 'hate';
    return 'plain';
  }

  function open(person) {
    var list = giftable(), g = given[person.id], again = g && g.day === today();
    if (typeof BridgeInteractions === 'undefined' || !BridgeInteractions.choose) return;
    BridgeInteractions.choose({
      title: 'A gift for ' + person.name.split(' ')[0],
      text: again ? 'YOU\'VE ALREADY GIVEN ' + person.name.split(' ')[0].toUpperCase() + ' SOMETHING TODAY. ANOTHER WOULD BE KIND, BUT IT WON\'T COUNT FOR MORE.'
                  : 'WHAT WOULD THEY LIKE? EVERYONE HAS THEIR TASTES - YOU LEARN THEM BY GIVING.',
      rows: list.map(function (r) {
        var known = g && g.known && g.known[r.id];
        return { label: r.item.name, icon: r.id, sub: 'you have ' + r.n, note: known ? ({ love: 'loves it', like: 'likes it', plain: 'fine', hate: 'dislikes it' })[known] : '',
                 pick: function () { give(person, r.id); } };
      })
    });
  }

  function give(person, id) {
    var it = BridgeItems.get(id), first = person.name.split(' ')[0].toUpperCase();
    if (!BridgeInventory.removeItem(id, 1)) return;
    var t = taste(person.id, id), g = given[person.id] || (given[person.id] = { day: '', n: 0, known: {} });
    var counts = g.day !== today();
    g.known = g.known || {}; g.known[id] = t;
    if (counts) { g.day = today(); g.n = (g.n || 0) + 1; }
    store();
    var delta = counts ? { love: 2, like: 1, plain: 0.5, hate: -1 }[t] : 0;
    var T = TASTES[person.id] || {};
    var lines = {
      love: T.loveLine || first + ' LIGHTS UP. "FOR ME? HOW DID YOU KNOW?"',
      like: first + ' TURNS IT OVER IN THEIR HANDS AND SMILES. "THAT\'S KIND OF YOU. THANK YOU."',
      plain: first + ' TAKES IT POLITELY. "OH - THANK YOU."',
      hate: first + ' LOOKS AT THE ' + it.name.toUpperCase() + ', THEN AT YOU. "...RIGHT. THANKS. I SUPPOSE."'
    };
    if (typeof BridgeTalk !== 'undefined' && BridgeTalk.nudge) {
      BridgeTalk.nudge(person.id, delta, 'They gave me ' + (/^[aeiou]/i.test(it.name) ? 'an ' : 'a ') + it.name.toLowerCase() +
                       (t === 'love' ? ', and I loved it' : t === 'hate' ? ', which I did not care for' : ''));
    }
    if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(t === 'hate' ? 'fail' : t === 'love' ? 'success' : 'pickup');
    if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(person.name.toUpperCase(), lines[t] + (counts ? '' : '\n\n(A SECOND GIFT TODAY - THANKS ENOUGH FOR NOW.)'));
    if (counts && t === 'love' && typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast('Gift', person.name + ' loved it', it.name);
  }

  return { can: can, open: open, taste: taste, _given: function () { return given; } };
})();
