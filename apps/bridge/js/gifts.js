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
    cook: { love: ['carrot', 'pumpkin'], like: ['turnip', 'silverfin'], hate: ['old_boot'] },
    keeper: { love: ['sunflower', 'honey', 'moonstone'], like: ['bread', 'silverfin', 'hot_cocoa'], hate: ['old_boot'],
              loveLine: 'SUNFLOWERS FOR THE LAMP ROOM. THE BEAM WILL HAVE COMPANY ON THE LONG NIGHTS. THREE LONG, ONE SHORT - THAT MEANS THANK YOU.' },
    sev: { love: ['heron_coin', 'starfruit'], like: ['sweet_roll', 'apple'], hate: ['old_boot'] },
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
              loveLine: 'NOW THAT\'S PRETTY WORK. SOMEBODY MADE THIS TO LAST. I\'LL KEEP IT IN THE LIFT HUT WHERE BRYN CAN\'T WIN IT OFF ME.' }
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
