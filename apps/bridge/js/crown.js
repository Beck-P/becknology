/**
 * BridgeCrown — what Crownhaven's rooms do (the capital, lumar-crown).
 *
 * St Brendan's: the candles for the missing (`chapel_candle`) — light one (5 coins) and your next passage is blessed:
 * squalls and Midnight's rocks do half the harm and pirates think twice (js/sloop.js takes the blessing as she casts off,
 * js/seafight.js asks `blessed`). The bell rope (`chapel_bell`). The Harbour Office: the Registry window (`registry`, your
 * ships), the Chart window (`charts`, js/chart.js shop), the Office's wall chart (`sea_chart`, opens your chart). The
 * Merchants' Exchange: the Charter Office (`charters`, js/trade.js charters — three long hauls a day). The Crown & Anchor:
 * the bosun's list (`hands`, the port's hands looking for a berth).
 *
 * The palace (`palace_gate`, `audience`, `commissions`): the guards let in a captain with three ships or more. The
 * Queen-Regent gives three commissions in turn (COMMISSIONS): the Crown's moon salt (a royal contract, delivered at
 * Crownhaven's harbourmaster like any other: 12 crates), the Crimson seam (beat three pirate ships after taking it —
 * js/seafight.js `noteWin`), and show the flag (bring a galleon of your own into Crownhaven). Each pays, and each gives
 * something for good: a royal warrant (the Exchange's charters pay a fifth more), a letter of marque (pirates beaten pay
 * double), and the title — Captain of the Crown: your ships fly the Crown's gold pennant and the yards mend them for a
 * quarter less.
 *
 * localStorage bridge_crown: {blessed, lit (day), rung (day), won (pirates beaten), stage (commissions done), took
 * (the current one taken), base (wins when the seam was taken)}.
 *   BridgeCrown.use(inter) / .blessed() / .takeBlessing() / .noteWin(K) / .warrant() / .marque() / .captain() / .journal()
 */
var BridgeCrown = (function () {
  var KEY = 'bridge_crown', CANDLE = 5;
  var st = load();
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode */ } }
  function day() { return Math.floor(Date.now() / 86400000); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }
  function say(t, x) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(t, x); }
  function choose(o) { if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.choose) BridgeInteractions.choose(o); }
  function toast(a, b, c) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(a, b, c); }
  function here() { return typeof BridgeWorld !== 'undefined' ? BridgeWorld.getWorldId() : 'lumar-crown'; }

  function use(inter) {
    switch (inter.type) {
      case 'chapel_candle': return candle();
      case 'chapel_bell': return bell();
      case 'sea_chart': if (typeof BridgeChart !== 'undefined') BridgeChart.open(); return;
      case 'charts':
        if (typeof BridgeChart !== 'undefined') BridgeChart.shop(here(), 'PIM UNROLLS ONE WITH GREAT CARE. "EVERY SOUNDING TAKEN BY SOMEBODY BRAVER THAN ME. ONCE A SEA\'S ON YOUR CHART YOU CAN SET A COURSE FOR ANY ISLAND IN IT."');
        return;
      case 'registry': if (typeof BridgeHarbour !== 'undefined') BridgeHarbour.registry(inter.port || 'lumar-crown'); return;
      case 'hands':
        if (typeof BridgeHarbour !== 'undefined') BridgeHarbour.hands(inter.port || 'lumar-crown', 'THE BOSUN RUNS A TARRY FINGER DOWN THE LIST. "HANDS LOOKING FOR A BERTH. THEY\'LL GO ABOARD WHICHEVER SHIP OF YOURS IN THE HARBOUR HAS ROOM."');
        return;
      case 'charters': return charters();
      case 'palace_gate': return gate();
      case 'audience': return audience();
      case 'commissions': return table();
    }
  }

  // ---- St Brendan's -------------------------------------------------------------------------------------------------
  function blessed() { return !!st.blessed; }
  function takeBlessing() { if (!st.blessed) return false; st.blessed = 0; store(); return true; }
  function candle() {
    if (st.blessed) return say('CANDLES', 'YOUR CANDLE IS STILL BURNING AMONG THE OTHERS, FOR THE NEXT TIME YOU PUT TO SEA.');
    choose({
      title: 'Candles for the missing',
      text: 'A HUNDRED LITTLE FLAMES ON THE IRON STAND, ONE FOR EVERY CREW STILL OUT. MOTHER CORALIE SAYS A SAILOR WHO LIGHTS ONE GOING OUT GETS A FAIRER PASSAGE: THE SQUALLS AND THE ROCKS HALF AS CRUEL, AND THE PIRATES LESS KEEN.',
      rows: [{ label: 'Light a candle', sub: 'a blessing on your next passage', note: CANDLE + ' coins', pick: function () {
        var pay = typeof BridgeProgression !== 'undefined' && BridgeProgression.wagerCoins ? BridgeProgression.wagerCoins(CANDLE, 'chapel:candle') : Promise.resolve({ ok: false });
        pay.then(function (r) {
          if (!r || !r.ok) return say('CANDLES', 'THE ALMS BOX WANTS ' + CANDLE + ' COINS. MOTHER CORALIE SAYS THE CANDLE WILL WAIT FOR YOU.');
          st.blessed = 1; st.lit = day(); store();
          sfx('clue');
          toast('Blessed', 'A candle at St Brendan\'s', 'Your next passage: squalls and rocks half as cruel, pirates less keen');
          say('CANDLES', 'YOU LIGHT IT FROM ONE OF THE OTHERS. IT CATCHES, GUTTERS, AND STANDS UP STRAIGHT.\n\nMOTHER CORALIE, NOT LOOKING UP FROM HER CANDLES: "FAIR WINDS, CAPTAIN."');
          if (typeof BridgeTalk !== 'undefined' && BridgeTalk.nudge) BridgeTalk.nudge('coralie', 0.5, 'lit a candle for the missing at St Brendan\'s');
        });
      } }],
      closeLabel: 'Not now'
    });
  }
  function bell() {
    sfx('bell');
    if (st.rung === day()) return say('BELL ROPE', 'THE BELL SPEAKS ONCE OVER THE HARBOUR. SOMEWHERE ON THE QUAY A DOG ANSWERS IT.');
    st.rung = day(); store();
    say('BELL ROPE', 'YOU HAUL ON THE SALLY AND THE BELL TOLLS OUT OVER THE HARBOUR - FOR THE SHIPS STILL OUT, MOTHER CORALIE SAYS, SO THEY KNOW WHICH WAY IS HOME.');
  }

  // ---- the Exchange's Charter Office ---------------------------------------------------------------------------------
  function charters(note) {
    var T = typeof BridgeTrade !== 'undefined' ? BridgeTrade : null, F = typeof BridgeFleet !== 'undefined' ? BridgeFleet : null;
    if (!T || !F) return;
    var d = T.today(), biggest = F.all().reduce(function (m, s) { return Math.max(m, F.effective(s).hold || 0); }, 0);
    var isles = typeof BridgeVoyage !== 'undefined' ? BridgeVoyage._isles : {};
    function nm(id) { return isles[id] ? isles[id].name : id; }
    choose({
      title: 'The Charter Office',
      text: note || 'THE REGISTRAR TAPS THE DAY\'S CHARTERS WITH HIS PEN. "LONG HAULS FOR CAPTAINS WITH HOLDS. BUY THE GOODS WHEREVER THEY\'RE CHEAPEST, DELIVER TO THE HARBOURMASTER AT THE FAR END, BEFORE THE DAY. THE WHOLE LOAD IN ONE HOLD, MIND." YOUR BIGGEST HOLD: ' + biggest + ' CRATES.',
      rows: T.charters().map(function (c) {
        var days = c.due - d, fits = biggest >= c.n;
        return { label: c.n + ' × ' + T.name(c.good) + ' to ' + nm(c.to), icon: c.good,
                 sub: (c.done ? 'delivered' : c.taken ? 'yours - ' : '') + (c.done ? '' : days + ' days to do it') + (fits || c.taken || c.done ? '' : ' · too big for any hold of yours'),
                 note: c.done ? 'paid' : c.taken ? 'taken' : c.fee + ' coins', disabled: c.taken || c.done || !fits,
                 pick: function () {
                   T.take(c);
                   sfx('pick');
                   toast('Charter', c.n + ' × ' + T.name(c.good) + ' to ' + nm(c.to), c.fee + ' coins on delivery · ' + days + ' days');
                   charters('THE REGISTRAR BLOTS YOUR NAME INTO THE BOOK. "' + c.n + ' ' + T.name(c.good).toUpperCase() + ' TO ' + nm(c.to).toUpperCase() + '. THE HARBOURMASTER THERE PAYS ON SIGHT OF THE CARGO."');
                 } };
      }),
      closeLabel: 'Done'
    });
  }

  // ---- the palace: the Queen-Regent's commissions -------------------------------------------------------------------
  var FLEET = 3, SALT = 12, SEAM = 3;
  function F() { return typeof BridgeFleet !== 'undefined' ? BridgeFleet : null; }
  function T() { return typeof BridgeTrade !== 'undefined' ? BridgeTrade : null; }
  function pay(n, why) { if (typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins) BridgeProgression.awardCoins(n, why); }
  var COMMISSIONS = [
    { id: 'salt', title: 'The Crown\'s Salt', coins: 3000, gift: 'warrant',
      ask: '"THE PALACE KITCHENS HAVE NOT SEEN MOON SALT SINCE THE FERRYMAN STOPPED TRUSTING OUR CAPTAINS. BRING ME ' + SALT + ' CRATES OF IT, CAPTAIN. THE FERRYMAN SELLS IT AT MIDNIGHT. HAND IT TO ROWENA ON THE QUAY; SHE KNOWS IT\'S FOR ME."',
      todo: 'Bring ' + SALT + ' crates of moon salt from Midnight to Crownhaven\'s harbourmaster',
      done: function () { var t = T(); return !!(t && t._state().done['royal:salt']); },
      prog: function () { return ''; },
      thanks: '"MOON SALT ON MY TABLE AGAIN. YOU HAVE NO IDEA WHAT THAT MEANS TO A COOK. OR A QUEEN." SHE SIGNS A WARRANT WITH A FLOURISH: THE EXCHANGE\'S CHARTERS PAY YOU A FIFTH MORE FROM NOW ON.' },
    { id: 'seam', title: 'The Crimson Seam', coins: 4000, gift: 'marque',
      ask: '"PIRATES ON THE CRIMSON SEAM, BOLDER EVERY MONTH. GARRO SAYS THEY\'RE NOT HIS. I SAY THEY\'RE SOMEBODY\'S. BEAT ' + SEAM + ' OF THEIR SHIPS, CAPTAIN - SINK THEM OR TAKE THEM - AND COME BACK TO ME."',
      todo: 'Beat ' + SEAM + ' pirate ships at sea',
      done: function () { return (st.won || 0) - (st.base || 0) >= SEAM; },
      prog: function () { return Math.min(SEAM, (st.won || 0) - (st.base || 0)) + ' of ' + SEAM; },
      thanks: '"THREE. THE QUAYS ARE SAYING YOUR NAME." THE STEWARD HANDS YOU A LETTER UNDER THE GREAT SEAL: A LETTER OF MARQUE. EVERY PIRATE YOU BEAT FROM NOW ON, THE CROWN PAYS ITS BOUNTY TWICE OVER.' },
    { id: 'flag', title: 'Show the Flag', coins: 6000, gift: 'captain',
      ask: '"ONE MORE THING. THE OTHER PORTS SHOULD SEE A GALLEON IN CROWNHAVEN THAT ISN\'T MINE AND ISN\'T FOR SALE. BUY ONE, BUILD ONE - ROWENA\'S YARD WILL - AND BRING HER INTO MY HARBOUR. THEN COME AND KNEEL."',
      todo: 'Bring a galleon of your own into Crownhaven',
      done: function () { var f = F(); return !!(f && f.all().some(function (x) { return x.type === 'galleon' && x.at === 'lumar-crown'; })); },
      prog: function () { return ''; },
      thanks: 'YOU KNEEL. THE QUEEN-REGENT TOUCHES YOUR SHOULDER WITH A CUTLASS THAT HAS CLEARLY SEEN USE. "CAPTAIN OF THE CROWN. YOUR SHIPS FLY MY GOLD NOW, AND THE YARDS WILL MEND THEM AS IF THEY WERE MINE." THE STEWARD CLEARS HIS THROAT. "A QUARTER LESS, MAJESTY." "A QUARTER LESS."' }
  ];
  function ships() { var f = F(); return f ? f.all().length : 1; }
  function gate() {
    if (ships() >= FLEET || st.stage) {
      if (typeof BridgeWorld !== 'undefined') BridgeWorld.enterWorld('lumar-crown-palace', [10, 12]);
      return;
    }
    say('PALACE GATE', 'THE GUARD LOOKS YOU UP AND DOWN. "THE QUEEN-REGENT SEES CAPTAINS OF FLEETS, NOT CAPTAINS OF SLOOPS." THE OTHER ONE, QUIETLY: "THREE SHIPS, THEY SAY. COME BACK WITH THREE AND WE\'LL OPEN THE GATE."\n\nYOU HAVE ' + ships() + '.');
  }
  function current() { return COMMISSIONS[st.stage || 0] || null; }
  // her face beside what she says (assets/portraits/npc-queen.png, js/look.js)
  function queenFace(cv, expr) { if (typeof BridgeLook !== 'undefined' && BridgeLook.npcFace) BridgeLook.npcFace(cv, 'npc-queen', { blink: true, expr: expr }); else cv.remove(); }
  function audience(note) {
    var c = current();
    if (!c) {
      return choose({ title: 'The Queen-Regent', face: function (cv) { queenFace(cv, note ? null : 'happy'); }, text: note || '"MY CAPTAIN." SHE SMILES - THE FIRST TIME ANYONE IN THE HALL HAS SEEN HER DO IT THIS YEAR. "THE SEAS ARE QUIETER WITH YOU ON THEM. GO AND MAKE THEM QUIETER STILL."', rows: [], closeLabel: 'Bow and go' });
    }
    if (!st.took) {
      var first = !st.met;
      st.met = 1; store();
      return choose({ title: 'The Queen-Regent', face: queenFace, text: (first ? 'A WOMAN IN EMERALD ON A GILT THRONE, A CIRCLET ON HER DARK HAIR, A SAILOR\'S HANDS FOLDED IN HER LAP. "SO YOU\'RE THE CAPTAIN WITH THREE KEELS AND NO MANNERS. GOOD. I HAVE WORK FOR BOTH."\n\n' : '') + c.ask,
                      rows: [{ label: c.title, sub: c.todo, note: c.coins + ' coins', pick: function () { take(c); } }], closeLabel: 'Not yet' });
    }
    if (c.done()) return report(c);
    choose({ title: 'The Queen-Regent', face: queenFace, text: note || '"' + c.title.toUpperCase() + '. IS IT DONE?" IT IS NOT, AND SHE CAN SEE IT IS NOT. "THEN WHY ARE YOU HERE AND NOT AT SEA?"',
             rows: [{ label: c.title, sub: c.todo + (c.prog() ? ' · ' + c.prog() : ''), note: 'in hand', disabled: true }], closeLabel: 'Bow and go' });
  }
  function take(c) {
    st.took = 1;
    if (c.id === 'seam') st.base = st.won || 0;
    store();
    if (c.id === 'salt' && T()) T().take({ id: 'royal:salt', from: 'lumar-crown', to: 'lumar-crown', good: 'moon_salt', n: SALT, fee: 0, due: T().today() + 3650, royal: true });
    sfx('quest');
    toast('Royal commission', c.title, c.todo);
    audience('THE STEWARD WRITES IT IN HIS BOOK. "THE QUEEN-REGENT\'S COMMISSION: ' + c.title.toUpperCase() + '." HE BLOTS IT. IT IS, APPARENTLY, OFFICIAL.');
  }
  function report(c) {
    st.stage = (st.stage || 0) + 1; st.took = 0; store();
    pay(c.coins, 'royal:' + c.id);
    sfx('quest');
    toast('Royal commission', c.title + ' - done', '+' + c.coins + ' coins');
    if (typeof BridgeProgression !== 'undefined' && BridgeProgression.recordAchievement) BridgeProgression.recordAchievement('royal_' + c.id, 0, { source: 'crown' });
    var next = current();
    choose({ title: 'The Queen-Regent', face: queenFace, text: c.thanks + '\n\n' + c.coins + ' COINS FROM THE TREASURY.',
             rows: next ? [{ label: 'Hear the next commission', sub: next.title, pick: function () { audience(); } }] : [], closeLabel: 'Bow and go' });
  }
  function table() {                                       // the Admiralty table: the commissions on the Crown's chart
    var lines = COMMISSIONS.map(function (c, i) {
      var state = i < (st.stage || 0) ? 'DONE' : i === (st.stage || 0) && st.took ? 'IN HAND' + (c.prog() ? ' (' + c.prog() + ')' : '') : i === (st.stage || 0) ? 'ASK THE QUEEN-REGENT' : '-';
      return c.title.toUpperCase() + ': ' + state;
    });
    choose({ title: 'The Admiralty table', text: 'THE CROWN\'S OWN CHART OF THE FIVE SEAS, MODEL SHIPS PUSHED ABOUT ON IT WITH A LONG POLE. RED PINS WHERE PIRATES HAVE BEEN SEEN; A CLUSTER OF THEM ON THE CRIMSON SEAM.\n\n' + lines.join('\n'), rows: [], closeLabel: 'Done' });
  }
  function noteWin(K) { if (K && !K.ghost) { st.won = (st.won || 0) + 1; store(); } }
  function warrant() { return (st.stage || 0) >= 1; }
  function marque() { return (st.stage || 0) >= 2; }
  function captain() { return (st.stage || 0) >= 3; }
  function journal() {
    var c = current();
    if (captain()) return 'Captain of the Crown: your ships fly the Queen-Regent\'s gold';
    if (!c || !st.took) return st.met ? 'The Queen-Regent has work for you at the palace' : '';
    return 'Royal commission: ' + c.title + ' - ' + c.todo.toLowerCase() + (c.prog() ? ' (' + c.prog() + ')' : '');
  }

  return { use: use, blessed: blessed, takeBlessing: takeBlessing, noteWin: noteWin, warrant: warrant, marque: marque, captain: captain,
           journal: journal, COMMISSIONS: COMMISSIONS, _state: function () { return st; } };
})();
