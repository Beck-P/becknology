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
 * localStorage bridge_crown: {blessed, lit (day), rung (day)}.
 *   BridgeCrown.use(inter) / .blessed() / .takeBlessing()
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

  return { use: use, blessed: blessed, takeBlessing: takeBlessing, _state: function () { return st; } };
})();
