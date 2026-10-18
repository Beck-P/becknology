/**
 * BridgeSapphire — the Sapphire Sea's own places (workstream B1): Lanternfall, the cliff town (world "lumar-cliff",
 * scenes/lumar_cliff.py), and what its places do. Interactions of type `lanternfall` carry an `act`:
 *
 *   donkey_up / donkey_down   Yannis's donkeys: five coins and you ride the zigzag up to the promenade, or down to the port
 *   cable_up / cable_down     the cable car down the face: three coins, the quicker way
 *   taverna                   Despina's on the rim: a dish eaten at the best table on the five seas (energy, health)
 *   fish_taverna              Marina's under the vine on the quay: the day's catch
 *   lamp                      a lamp in the great church: a coin or two, warm through the next cold passage (js/worlds/hoarfell.js)
 *   bell                      ring the church bell over the caldera
 *   lanterns                  the lantern maker: a caldera lantern to carry (an item; sells, gifts)
 *   view                      look out over the caldera — by the planet's hour, a different picture; at golden hour,
 *                             once a day, the sunset lifts you
 *
 * And the floating market's glassworks (world "lumar-sapphire-glassworks", type `sapphire`): `glassblow` at the pipe.
 * Sapphire Port gets the gate to the floating market (`decorate`, so a re-render of Sapphire Port never loses it).
 *
 * BridgeSapphire.use(inter) · .decorate(worldId, data)
 */
var BridgeSapphire = (function () {
  var KEY = 'bridge_sapphire';
  var st = load();
  var CLIFF = 'lumar-cliff';
  var DONKEY = 5, LAMP = 2;
  var UP = [50, 19], DOWN = [44, 30];          // where the donkeys leave you: the promenade by the zigzag's head, the quay
  var DISHES = {
    taverna: [
      { label: 'Tomato fritters and fava', sub: 'the island\'s tomatoes, small and fierce', price: 8, hp: 10, en: 20 },
      { label: 'Lamb baked in paper', sub: 'with lemon and wild oregano off the rim', price: 18, hp: 30, en: 30 },
      { label: 'A glass of caldera wine', sub: 'sweet, from vines grown in baskets against the wind', price: 6, hp: 0, en: 25 }
    ],
    fish_taverna: [
      { label: 'Grilled octopus', sub: 'dried on the line by the door all afternoon', price: 12, hp: 20, en: 20 },
      { label: 'The day\'s catch, fried', sub: 'whatever the caiques brought in, with lemon', price: 9, hp: 15, en: 15 },
      { label: 'Fish soup', sub: 'Marina\'s grandmother\'s, which she will not discuss', price: 7, hp: 12, en: 12 }
    ]
  };

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode */ } }
  function day() { return Math.floor(Date.now() / 86400000); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }
  function say(t, x) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(t, x); }
  function choose(o) { if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.choose) BridgeInteractions.choose(o); }
  function toast(a, b, c) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(a, b, c); }
  function note(a, b, c) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.note) BridgeQuests.note(a, b, c); }
  function pay(n, why) {
    return typeof BridgeProgression !== 'undefined' && BridgeProgression.wagerCoins ? BridgeProgression.wagerCoins(n, why) : Promise.resolve({ ok: false });
  }
  function restore(hp, en) {
    if (typeof BridgeInventory === 'undefined') return;
    if (hp) BridgeInventory.restoreHP(hp);
    if (en) BridgeInventory.restoreEnergy(en);
  }
  function part() {                            // the planet's part of the day: morning … dusk, night
    var s = typeof BridgeClock !== 'undefined' && BridgeClock.sky ? BridgeClock.sky(CLIFF) : null;
    return s ? s.part : null;
  }

  function use(inter) {
    switch (inter.act) {
      case 'donkey_up': return donkey(true);
      case 'donkey_down': return donkey(false);
      case 'cable_up': return cable(true);
      case 'cable_down': return cable(false);
      case 'taverna': return eat('taverna', 'Despina\'s, on the rim', 'THE TABLES STAND ON THE VERY EDGE OF THE RIM. BELOW: THE WHOLE CALDERA, THE ISLET SMOKING IN THE MIDDLE, THE LAMPS OF THE ZIGZAG. DESPINA PUTS A MENU IN FRONT OF YOU AND TELLS YOU WHAT TO HAVE.');
      case 'fish_taverna': return eat('fish_taverna', 'Marina\'s, on the quay', 'BLUE CLOTHS UNDER THE VINE, THE WATER LAPPING A STEP AWAY. OCTOPUS HANGS DRYING ON A LINE BY THE DOOR. MARINA WIPES THE TABLE AND WAITS.');
      case 'lamp': return lamp();
      case 'bell': return bell();
      case 'lanterns': return lanterns();
      case 'view': return view();
      case 'glassblow': return glassblow();
    }
  }

  // ---- the donkeys --------------------------------------------------------------------------------------------------
  function donkey(up) {
    choose({
      title: up ? 'Up the zigzag' : 'Down the zigzag',
      text: up ? 'STAMATIA LOOKS AT YOU, THEN AT THE FIVE HUNDRED STEPS, THEN BACK AT YOU, AS IF TO SAY SHE HAS DONE THIS BEFORE AND YOU HAVE NOT. YANNIS HOLDS OUT HIS HAND FOR THE COINS.'
               : 'YANNIS\'S COUSIN SADDLES ZOE. "DOWN IS FASTER THAN UP," HE SAYS. "HOLD ON. SHE LIKES THE CORNERS."',
      rows: [{ label: up ? 'Ride up to the town' : 'Ride down to the old port', sub: up ? 'to the promenade at the top' : 'to the quay, by the boats', note: DONKEY + ' coins',
               pick: function () {
                 pay(DONKEY, 'lanternfall:donkey').then(function (r) {
                   if (!r || !r.ok) return say('THE DONKEYS', 'FIVE COINS, SAYS YANNIS. THE DONKEY SAYS NOTHING, BUT AGREES.');
                   sfx('pickup');
                   note('Lanternfall', up ? 'Rode a donkey up the zigzag' : 'Rode a donkey down the zigzag', 'Five hundred steps, none of them yours');
                   if (typeof BridgeWorld !== 'undefined' && BridgeWorld.enterWorld) BridgeWorld.enterWorld(CLIFF, up ? UP : DOWN);
                 });
               } }],
      closeLabel: up ? 'Walk it' : 'Not now'
    });
  }

  // ---- the cable car: quicker than the donkeys, less opinionated -------------------------------------------------------
  var CABLE = 3, CAB_UP = [13, 20], CAB_DOWN = [15, 30];
  function cable(up) {
    choose({
      title: 'The cable car',
      text: up ? 'A LITTLE RED GONDOLA SWINGS IN AT THE QUAY STATION. THE ATTENDANT, WHO HAS SEEN THE VIEW TEN THOUSAND TIMES, IS READING A BOOK.'
               : 'THE GONDOLA WAITS AT THE TOP STATION, SWAYING OVER A DROP OF TWO HUNDRED FEET. THE ATTENDANT TAKES YOUR COINS WITHOUT LOOKING UP.',
      rows: [{ label: up ? 'Ride up to the promenade' : 'Ride down to the old port', sub: 'past the cave houses and the gulls', note: CABLE + ' coins',
               pick: function () {
                 pay(CABLE, 'lanternfall:cable').then(function (r) {
                   if (!r || !r.ok) return say('THE CABLE CAR', 'THREE COINS, SAYS THE ATTENDANT, STILL NOT LOOKING UP.');
                   sfx('pickup');
                   if (typeof BridgeWorld !== 'undefined' && BridgeWorld.enterWorld) BridgeWorld.enterWorld(CLIFF, up ? CAB_UP : CAB_DOWN);
                 });
               } }],
      closeLabel: 'Not now'
    });
  }

  // ---- eating -------------------------------------------------------------------------------------------------------
  function eat(which, title, text) {
    choose({
      title: title, text: text,
      rows: DISHES[which].map(function (d) {
        return { label: d.label, sub: d.sub + (d.hp ? ' · +' + d.hp + ' health' : '') + (d.en ? ' · +' + d.en + ' energy' : ''), note: d.price + ' coins',
                 pick: function () {
                   pay(d.price, 'lanternfall:' + which).then(function (r) {
                     if (!r || !r.ok) return say(title.toUpperCase(), 'NOT ENOUGH COINS. NOBODY MINDS YOU SITTING AND LOOKING, THOUGH.');
                     restore(d.hp, d.en);
                     sfx('coin');
                     say(title.toUpperCase(), which === 'taverna'
                       ? 'IT ARRIVES WITH BREAD AND OLIVES YOU DIDN\'T ORDER AND A VIEW NOBODY COULD. YOU EAT SLOWLY. THE CALDERA TURNS FROM BLUE TO DEEPER BLUE.'
                       : 'IT COMES STRAIGHT OFF THE GRILL, SMELLING OF SMOKE AND LEMON. A CAT ARRIVES FROM NOWHERE AND SITS, POLITELY, AT YOUR FEET.');
                   });
                 } };
      }),
      closeLabel: 'Just looking'
    });
  }

  // ---- the great church ---------------------------------------------------------------------------------------------
  function lamp() {
    if (st.lamp === day()) return say('CHURCH LAMPS', 'YOUR LAMP BURNS AMONG THE OTHERS UNDER THE BLUE DOME. FATHER ILIAS HAS TRIMMED ITS WICK.');
    choose({
      title: 'The lamps under the dome',
      text: 'OIL LAMPS IN RED AND BLUE GLASS, HUNG ON CHAINS UNDER THE GREAT DOME, ONE FOR EVERY BOAT OUT ON THE CALDERA TONIGHT. THE SAILORS SAY A LAMP LIT HERE KEEPS THE COLD OFF YOU WHEREVER YOU SAIL NEXT.',
      rows: [{ label: 'Light a lamp', sub: 'warm through the cold for an hour · +15 energy', note: LAMP + ' coins', pick: function () {
        pay(LAMP, 'lanternfall:lamp').then(function (r) {
          if (!r || !r.ok) return say('CHURCH LAMPS', 'THE BOX FOR THE OIL WANTS ' + LAMP + ' COINS.');
          st.lamp = day(); store();
          restore(0, 15);
          if (typeof BridgeHoarfell !== 'undefined' && BridgeHoarfell.warm) BridgeHoarfell.warm(60);
          sfx('clue');
          toast('A lamp lit', 'Under the great dome at Lanternfall', 'Warm through the cold for an hour');
          say('CHURCH LAMPS', 'THE WICK CATCHES. THE LITTLE BLUE GLASS GLOWS, AND SWAYS ON ITS CHAIN AS IF SOMEONE HAD BREATHED ON IT.\n\nFATHER ILIAS, FROM THE DOORWAY: "THERE. NOW THE SEA KNOWS YOUR FACE."');
        });
      } }],
      closeLabel: 'Not now'
    });
  }
  function bell() {
    sfx('bell');
    if (st.bell === day()) return say('BELL', 'THE BELL RINGS OUT OVER THE CALDERA AND COMES BACK OFF THE FAR CLIFFS A MOMENT LATER, SMALLER.');
    st.bell = day(); store();
    say('BELL', 'YOU PULL THE ROPE AND ALL THREE BELLS ANSWER, ONE AFTER ANOTHER. DOWN IN THE OLD PORT A FISHERMAN LOOKS UP AND RAISES HIS CAP.\n\nTHEY RING FOR EVERY BOAT THAT COMES IN THROUGH THE CALDERA\'S MOUTH. TONIGHT, IT SEEMS, THEY RING FOR YOU.');
  }

  // ---- the lantern maker --------------------------------------------------------------------------------------------
  function lanterns() {
    var price = 30;
    choose({
      title: 'The lantern maker',
      text: 'A WORKSHOP NO WIDER THAN A CORRIDOR, EVERY INCH OF CEILING HUNG WITH LANTERNS: TIN AND BLUE GLASS, PIERCED BRASS, ONE MADE FROM A SHIP\'S BELL. "THE ONES ON THE ZIGZAG ARE MINE," SHE SAYS. "THEY HAVE NEVER ONCE BLOWN OUT."',
      rows: [{ label: 'A caldera lantern', icon: 'caldera_lantern', sub: 'blue glass in a tin frame; burns in any wind', note: price + ' coins', pick: function () {
        pay(price, 'lanternfall:lantern').then(function (r) {
          if (!r || !r.ok) return say('LANTERN MAKER', 'THIRTY COINS. "THE GLASS COMES FROM SAPPHIRE PORT," SHE SAYS. "THE GLASSWORKS DOESN\'T DO FAVOURS."');
          if (typeof BridgeInventory !== 'undefined') BridgeInventory.addItem('caldera_lantern', 1);
          sfx('pickup');
          say('LANTERN MAKER', 'SHE WRAPS IT IN NEWSPAPER, THEN THINKS BETTER OF IT AND LIGHTS IT FOR YOU INSTEAD. "CARRY IT LIT," SHE SAYS. "IT LIKES TO BE SEEN."');
        });
      } }],
      closeLabel: 'Done'
    });
  }

  // ---- the view -----------------------------------------------------------------------------------------------------
  function view() {
    var p = part(), golden = p === 'dusk', night = p === 'night';
    var text = golden
      ? 'THE SUN GOES DOWN BEHIND THE WEST ARM AND THE WHOLE CALDERA TURNS GOLD, THEN ROSE, THEN A BLUE SO DEEP IT LOOKS WET. ALONG THE PROMENADE PEOPLE STOP TALKING. SOMEBODY CLAPS, THE WAY THEY DO HERE, AS IF THE SUN HAD DONE SOMETHING CLEVER.'
      : night ? 'BELOW THE PARAPET THE ZIGZAG\'S LAMPS RUN DOWN THE CLIFF ONE AFTER ANOTHER TO THE WATER, AND THE ISLET GLOWS RED IN THE MIDDLE OF THE BLACK BAY. LUMAR\'S MOON SITS ON THE RIM LIKE A COIN ON A TABLE.'
      : 'THE CALDERA FROM THE TOP: A BOWL OF SAPPHIRE WATER RINGED BY CLIFFS IN STRIPES OF RUST, BLACK AND CREAM, THE CAIQUES DOWN AT THE OLD PORT SMALL AS SEEDS. A HUNDRED FEET BELOW YOUR TOES, A GULL TURNS LAZY CIRCLES.';
    if (golden && st.sunset !== day()) {
      st.sunset = day(); store();
      restore(10, 30);
      toast('A Lanternfall sunset', 'From the promenade', '+30 energy');
      note('Lanternfall', 'Watched the sun go down over the caldera', 'Everyone clapped');
    }
    say('THE VIEW', text);
  }

  // ---- Sapphire Port: the gate to the floating market, at the east end of the quay ---------------------------------
  var MARKET_GATE = { x: 44, y: 22, type: 'enter_world', target: 'lumar-sapphire-market', spawn: [1, 6], label: 'FLOATING MARKET',
                      prompt: 'PRESS E TO GO' };
  var MARKET_OPEN = true;                    // (off until the floating market's world is in the game)
  function decorate(worldId, data) {
    if (!MARKET_OPEN || worldId !== 'lumar-sapphire' || !data) return;
    data.interactions = data.interactions || [];
    if (!data.interactions.some(function (it) { return it.target === MARKET_GATE.target; })) data.interactions.push(Object.assign({}, MARKET_GATE));
  }

  // ---- the Sapphire Glassworks: blowing glass --------------------------------------------------------------------
  // Three moments, each a needle swinging through the glass's heat: GATHER when it glows gold in the glory hole, BLOW
  // while it's soft, SHAPE before it stiffens. Space / E / a tap at each; dead centre is perfect (2), the band good
  // (1), outside it a miss. Six is a flawless pair of floats; four or five a float; two or three a lopsided one (sea
  // glass — the cullet goes back in the pot); less, a potato, kept by nobody. The first go each day is on the house,
  // then five coins for the glass.
  var GO = 5;
  var STEPS = [
    { name: 'Gather', hint: 'Turn the pipe in the glory hole. Lift it out when the glow is gold - not pale, not red.', band: 0.2, speed: 1.1 },
    { name: 'Blow', hint: 'A breath down the pipe while it\'s soft. The bubble swells. Stop before it goes thin.', band: 0.16, speed: 1.45 },
    { name: 'Shape', hint: 'Roll it on the bench arms, the wet paddle under it. Now, while it still glows.', band: 0.12, speed: 1.8 }
  ];
  var gb = null;
  function glassblow() {
    if (gb) return;
    var free = st.blown !== day();
    choose({
      title: 'The pipe',
      text: free ? 'IONE HANDS YOU A BLOWPIPE AS LONG AS YOU ARE TALL. "FIRST ONE\'S ON THE HOUSE. MIND THE END - IT\'S THE HOT END."'
                 : 'IONE HANDS YOU THE PIPE AGAIN. "GLASS ISN\'T FREE TWICE. FIVE COINS FOR THE GATHER."',
      rows: [{ label: 'Blow a float', sub: 'gather, blow, shape: three good moments', note: free ? 'free today' : GO + ' coins', pick: function () {
        (free ? Promise.resolve({ ok: true }) : pay(GO, 'glassworks:gather')).then(function (r) {
          if (!r || !r.ok) return say('THE PIPE', 'FIVE COINS FOR THE GLASS, SAYS IONE. THE FURNACE DOESN\'T RUN ON GOODWILL.');
          if (free) { st.blown = day(); store(); }
          setTimeout(startBlow, 60);
        });
      } }],
      closeLabel: 'Not now'
    });
  }
  function startBlow() {
    var root = document.createElement('div');
    root.id = 'glassblow';
    root.innerHTML = '<div class="gb-card"><div class="gb-title">The Sapphire Glassworks</div><div class="gb-step"></div>' +
      '<canvas width="200" height="96"></canvas><div class="gb-hint"></div><div class="gb-keys">Space / E / tap - Esc to put it down</div></div>';
    document.body.appendChild(root);
    if (typeof BridgeControls !== 'undefined' && BridgeControls.disable) BridgeControls.disable();
    var cv = root.querySelector('canvas'), cx = cv.getContext('2d');
    cx.imageSmoothingEnabled = false;
    gb = { root: root, cv: cv, cx: cx, step: 0, score: 0, marks: [], t0: performance.now(), done: false, flash: 0, word: '' };
    function label() {
      var S = STEPS[Math.min(gb.step, 2)];
      root.querySelector('.gb-step').textContent = gb.done ? 'Done' : (gb.step + 1) + ' / 3 · ' + S.name;
      root.querySelector('.gb-hint').textContent = gb.done ? gb.word : S.hint;
    }
    function needle(now) {                                    // 0..1, a swing that eases at its ends
      var S = STEPS[gb.step];
      return 0.5 - 0.5 * Math.cos((now - gb.t0) / 1000 * S.speed * Math.PI);
    }
    function hit() {
      if (gb.done) { finish(); return; }
      var v = needle(performance.now()), S = STEPS[gb.step], d = Math.abs(v - 0.62);
      var got = d < S.band * 0.3 ? 2 : d < S.band ? 1 : 0;
      gb.score += got; gb.marks.push(got); gb.flash = performance.now();
      gb.word = got === 2 ? 'PERFECT' : got === 1 ? 'GOOD' : 'MISSED';
      sfx(got ? 'chime' : 'blip');
      gb.step++; gb.t0 = performance.now() + 250;
      if (gb.step >= 3) {
        gb.done = true;
        var s = gb.score;
        gb.result = s >= 6 ? 'flawless' : s >= 4 ? 'float' : s >= 2 ? 'lopsided' : 'potato';
        gb.word = { flawless: 'A pair of flawless floats, blue as deep water. Ione looks, looks again, and says nothing, which is high praise.',
                    float: 'A glass float - round, blue, only a little lopsided if you hold it to the light. It goes in the lehr overnight and comes out yours.',
                    lopsided: 'Something between a float and a pear. Ione taps it, sighs, and drops it in the cullet bin. She hands you back a chip of it.',
                    potato: 'It is, unmistakably, a potato. A blue glass potato. The whole workshop stops to look at it.' }[gb.result];
      }
      label();
    }
    function finish() {
      var r = gb.result;
      close();
      if (typeof BridgeInventory === 'undefined') return;
      if (r === 'flawless') BridgeInventory.addItem('glass_float', 2);
      else if (r === 'float') BridgeInventory.addItem('glass_float', 1);
      else if (r === 'lopsided') BridgeInventory.addItem('sea_glass', 1);
      if (r === 'flawless' || r === 'float') {
        toast('You blew glass', r === 'flawless' ? 'Two flawless glass floats' : 'A glass float', 'The Sapphire Glassworks');
        if (!st.firstFloat) { st.firstFloat = Date.now(); store(); note('Sapphire Port', 'Blew your first glass float at the glassworks', 'Only a little lopsided'); }
      }
    }
    function close() {
      document.removeEventListener('keydown', onKey, true);
      if (root.parentNode) root.parentNode.removeChild(root);
      if (typeof BridgeControls !== 'undefined' && BridgeControls.enable) BridgeControls.enable();
      cancelAnimationFrame(gb.raf);
      gb = null;
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
      if (e.key === ' ' || e.key === 'e' || e.key === 'E' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (!e.repeat) hit(); }
    }
    document.addEventListener('keydown', onKey, true);
    cv.addEventListener('pointerdown', function (e) { e.preventDefault(); hit(); });
    function draw(now) {
      if (!gb) return;
      var c = cx, W = 200, Hh = 96, i;
      c.fillStyle = '#140c0a'; c.fillRect(0, 0, W, Hh);
      // the furnace wall and its glory hole, the glow by the needle's heat
      var v = gb.done ? 0.62 : needle(now);
      c.fillStyle = '#3a1e16'; c.fillRect(0, 0, 64, 70);
      for (var y = 0; y < 70; y += 6) for (var x = (y / 6) % 2 ? 0 : 6; x < 64; x += 12) { c.fillStyle = '#4a2a1e'; c.fillRect(x, y, 11, 5); }
      var heat = ['#5a1a08', '#a83a10', '#e8701a', '#ffb040', '#ffe080', '#fff6e0'][Math.min(5, Math.floor(v * 6))];
      c.fillStyle = '#1a0806'; c.beginPath(); c.arc(32, 34, 17, 0, Math.PI * 2); c.fill();
      c.fillStyle = heat; c.beginPath(); c.arc(32, 34, 13, 0, Math.PI * 2); c.fill();
      // the pipe out of it and the gob of glass, growing by step
      c.fillStyle = '#6a6a72'; c.fillRect(44, 33, 120, 3);
      var r = 4 + gb.marks.length * 4 + (gb.marks[1] === 0 ? -2 : 0);
      var gx = 50 + gb.marks.length * 10;
      c.fillStyle = gb.done ? (gb.result === 'potato' ? '#7a6a8a' : '#2a5ad8') : heat;
      c.beginPath(); if (gb.done && gb.result === 'potato') c.ellipse(gx, 34, r + 4, r - 1, 0.3, 0, Math.PI * 2); else c.arc(gx, 34, r, 0, Math.PI * 2); c.fill();
      if (gb.done && gb.result !== 'potato') { c.fillStyle = '#8ab0f0'; c.fillRect(gx - r / 2, 34 - r / 2, 2, 2); }
      // the gauge: cold to hot, the sweet band, the needle
      var gx0 = 72, gw = 120, gy = 50;
      for (i = 0; i < gw; i++) { var t = i / gw; c.fillStyle = 'hsl(' + Math.round(10 + 40 * t) + ', 85%, ' + Math.round(20 + 50 * t) + '%)'; c.fillRect(gx0 + i, gy, 1, 8); }
      if (!gb.done) {
        var S = STEPS[gb.step];
        c.strokeStyle = '#e8f0ff'; c.strokeRect(gx0 + Math.round((0.62 - S.band) * gw) + 0.5, gy - 2.5, Math.round(S.band * 2 * gw), 13);
        c.fillStyle = '#fff6d0'; c.fillRect(gx0 + Math.round((0.62 - S.band * 0.3) * gw), gy + 9, Math.max(2, Math.round(S.band * 0.6 * gw)), 2);
        c.fillStyle = '#ffffff'; c.fillRect(gx0 + Math.round(v * (gw - 1)) - 1, gy - 5, 3, 18);
      }
      // the three marks so far
      for (i = 0; i < 3; i++) {
        var m = gb.marks[i];
        c.fillStyle = m == null ? '#3a2e28' : m === 2 ? '#ffd060' : m === 1 ? '#8ad070' : '#a04030';
        c.fillRect(gx0 + 30 + i * 22, 72, 16, 6);
      }
      if (gb.flash && now - gb.flash < 600 && gb.word.length < 10) {     // PERFECT / GOOD / MISSED, not the verdict
        c.globalAlpha = 1 - (now - gb.flash) / 600;
        c.fillStyle = gb.word === 'PERFECT' ? '#ffd060' : gb.word === 'GOOD' ? '#8ad070' : '#e06050';
        c.font = '12px monospace'; c.textAlign = 'center'; c.fillText(gb.word, 132, 30); c.globalAlpha = 1;
      }
      gb.raf = requestAnimationFrame(draw);
    }
    label();
    gb.raf = requestAnimationFrame(draw);
  }

  return { use: use, decorate: decorate, CLIFF: CLIFF, MARKET_GATE: MARKET_GATE, _glass: function () { return gb ? { step: gb.step, score: gb.score, done: gb.done, result: gb.result } : null; } };
})();
