/**
 * BridgeObservatory — the observatory aboard the Wayfarer (ship-observatory, a module: js/wayfarer.js).
 *
 * The great telescope (and the spotting scope by the glass) open the stars (js/actions.js's `stars` view) with the ship's
 * day's sight in the caption: each ship's day the sky has something worth logging (SIGHTS, picked by the day: a comet,
 * the Singularity's ring, an aether whale…). Log it the first time you see each and the log pays (LOG_PAY) and the
 * journal notes it; log all twelve and the captain's an astronomer (a bonus, once). The observer's desk and the
 * celestial globe open the log; the star chart reads the sky for every world (BridgeWeather.outlook); the orrery keeps
 * every world's time (BridgeHours.chronometer).
 *
 * W1 · sights that add up (spec-deeper-worlds): each sight belongs to a sky (`sky`: the world the Wayfarer's parked over,
 * or `deep` for anywhere), and the ship's day's sight is picked from the sky she's over and the deep sky; log every sight
 * of a world's sky and its star chart is drawn up for you (`CHARTS`: an item, `sky_chart_<world>`, in the Collection's
 * *The night sky* set, js/codex.js — all seven: the log pays double). The log reads as the star chart, sky by sky.
 *
 * `observatory` interactions by `part`: scope, chart, orrery, log. localStorage `bridge_observatory` ({ seen: { id: at },
 * all, charts: { world: at } }).
 */
var BridgeObservatory = (function () {
  var KEY = 'bridge_observatory', LOG_PAY = 40, ALL_PAY = 500;
  var SIGHTS = [
    { id: 'comet', sky: 'deep', name: 'A comet', text: 'A COMET, ITS TAIL LONG AND FAINT AND FORKED, FALLING TOWARD A SUN YOU CAN\'T SEE.' },
    { id: 'ring', sky: 'singularity', name: 'The Singularity\'s ring', text: 'FAR OFF, A RING OF BENT LIGHT ROUND NOTHING AT ALL: THE SINGULARITY, LENSING THE STARS BEHIND IT.' },
    { id: 'whale', sky: 'deep', name: 'An aether whale', text: 'SOMETHING VAST AND SLOW CROSSES THE STARS, BLOTTING THEM OUT IN TURN. AN AETHER WHALE, FIFTY SHIPS LONG.' },
    { id: 'nova', sky: 'deep', name: 'A new star', text: 'A STAR WHERE THERE WASN\'T ONE YESTERDAY, BRIGHT AS A LANTERN. A NOVA, A LONG WAY OFF AND A LONG TIME AGO.' },
    { id: 'shower', sky: 'deep', name: 'A meteor shower', text: 'METEORS, ONE A SECOND, STREAKING OUT OF THE SAME CORNER OF THE SKY LIKE SPARKS OFF A WHEEL.' },
    { id: 'moons', sky: 'verdance', name: 'Verdance\'s two moons', text: 'VERDANCE\'S TWO LITTLE MOONS, ONE PASSING IN FRONT OF THE OTHER. THE FARMERS CALL IT THE KISS.' },
    { id: 'aurora', sky: 'hoarfell', name: 'Hoarfell\'s aurora', text: 'GREEN CURTAINS OVER HOARFELL\'S POLE, MOVING, SEEN FROM ABOVE SO THEY LOOK LIKE WEED IN A CURRENT.' },
    { id: 'derelict', sky: 'enigma', name: 'A derelict', text: 'A DERELICT, TUMBLING END OVER END, NO LIGHTS. THE TELESCOPE READS A NAME ON HER BOW YOU DON\'T RECOGNISE.' },
    { id: 'double', sky: 'deep', name: 'A double star', text: 'A DOUBLE STAR, GOLD AND BLUE, CIRCLING EACH OTHER. THE ALMANAC CALLS THEM THE CAPTAIN AND THE COOK.' },
    { id: 'giant', sky: 'enigma', name: 'The giant\'s rings edge-on', text: 'ENIGMA\'S RINGED GIANT, ITS RINGS EXACTLY EDGE-ON, A LINE RULED ACROSS IT IN SILVER.' },
    { id: 'lights', sky: 'arcadia', name: 'Arcadia from above', text: 'ARCADIA\'S NIGHT SIDE, ONE CITY FROM POLE TO POLE, AND A STORM OF TRAFFIC LIGHTS ROUND THE SPIRES.' },
    { id: 'spores', sky: 'lumar', name: 'The spore tide', text: 'LUMAR\'S SEA GLOWING IN BANDS: THE SPORE TIDE, VISIBLE FROM ORBIT, TURNING ITS OCEANS TO A MAP OF LIGHT.' },
    // W1: the rest of each world's sky, so every world has three to chart
    { id: 'beacon', sky: 'lumar', name: 'Diggen\'s Point light', text: 'ON LUMAR\'S NIGHT SIDE, ONE PINPRICK SWEEPING ROUND AND ROUND: THE LIGHTHOUSE ON DIGGEN\'S POINT, SEEN FROM ORBIT.' },
    { id: 'squall', sky: 'lumar', name: 'A squall on the Crimson', text: 'A KNOT OF CLOUD OVER THE CRIMSON SEA, LIT FROM INSIDE BY LIGHTNING. SOMEBODY DOWN THERE IS HAVING A NIGHT OF IT.' },
    { id: 'airship', sky: 'arcadia', name: 'The Royale\'s airship', text: 'A LIT AIRSHIP CROSSING ARCADIA\'S SPIRES, ITS SIDE ONE LONG ADVERT. YOU CAN READ IT FROM HERE. YOU WISH YOU COULDN\'T.' },
    { id: 'lanes', sky: 'arcadia', name: 'The traffic lanes', text: 'THE AIR LANES OVER ARCADIA, A BRAID OF RED AND WHITE LIGHTS GOING ROUND THE PLANET LIKE A RING.' },
    { id: 'shepherds', sky: 'enigma', name: 'The shepherd moons', text: 'TWO LITTLE MOONS INSIDE ENIGMA\'S GIANT\'S RINGS, HERDING THE ICE INTO LINES WITH THEIR GRAVITY.' },
    { id: 'disc', sky: 'singularity', name: 'The disc, close', text: 'THE ACCRETION DISC, CLOSE ENOUGH TO SEE IT TURN: WHITE AT THE INNER EDGE, VIOLET AT THE RIM.' },
    { id: 'arcs', sky: 'singularity', name: 'Stars bent into arcs', text: 'STARS NEAR THE HOLE DRAWN OUT INTO ARCS, AS IF SOMEONE HAD TRIED TO WIPE THEM OFF THE GLASS.' },
    { id: 'patchwork', sky: 'verdance', name: 'Verdance\'s patchwork', text: 'VERDANCE AT DAWN: THE FIELDS A PATCHWORK OF GREENS AND GOLDS, THE RIVERS SILVER STITCHES BETWEEN THEM.' },
    { id: 'harvestmoon', sky: 'verdance', name: 'The harvest moon', text: 'THE BIGGER OF VERDANCE\'S MOONS, LOW AND ORANGE OVER THE WOLD. THE ALMANAC SAYS IT MEANS RAIN. IT ALWAYS SAYS THAT.' },
    { id: 'spire', sky: 'hoarfell', name: 'The Hoarspire\'s shadow', text: 'THE HOARSPIRE\'S SHADOW LAID ACROSS A HUNDRED MILES OF ICE AT SUNRISE, SHARP AS A SUNDIAL\'S.' },
    { id: 'glaciers', sky: 'hoarfell', name: 'The glaciers', text: 'HOARFELL\'S GLACIERS CATCHING THE LOW SUN ONE AFTER ANOTHER, LIKE LAMPS BEING LIT DOWN A STREET.' },
    { id: 'canopy', sky: 'sylvara', name: 'The one forest', text: 'SYLVARA FROM POLE TO POLE: ONE FOREST, DARK GREEN, THE LAKES BLACK IN IT AND THE RIVERS SILVER.' },
    { id: 'elflights', sky: 'sylvara', name: 'The elf-lights', text: 'AT DUSK ON SYLVARA, GOLD LIGHTS PRICKING OUT ALONG THE RIVERS ONE BY ONE: THE ELVES\' LANTERNS, SEEN FROM SPACE.' },
    { id: 'greenmoon', sky: 'sylvara', name: 'The silver-green moon', text: 'SYLVARA\'S MOON, SILVER-GREEN AS THE MOONWELL, AND THE MOONWELL SOMEWHERE BELOW IT, NO BIGGER THAN A PIN.' }
  ];
  var SKIES = { lumar: 'Lumar', arcadia: 'Arcadia', enigma: 'Enigma', singularity: 'the Singularity', verdance: 'Verdance', hoarfell: 'Hoarfell', sylvara: 'Sylvara' };
  var CHARTS = Object.keys(SKIES).map(function (w) { return 'sky_chart_' + w; });
  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { state = {}; }
  state.seen = state.seen || {};
  state.charts = state.charts || {};
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ } }
  function has(n) { return typeof window[n] !== 'undefined'; }
  function say(t, x) { BridgeInteractions.say(t, x); }

  /** Where she's parked: the sky out of the telescope. */
  function over() { var l = has('BridgeOrbit') && BridgeOrbit.getLocation ? BridgeOrbit.getLocation() : null; return SKIES[l] ? l : null; }                // (out in deep space: the deep sky only)
  /** Tonight's sight (by the ship's day and the sky she's over: everyone aboard sees the same). The world's own sights
   *  you haven't logged come up first, so a chart can always be finished by coming back. */
  function tonight() {
    var d = has('BridgeWayfarer') ? BridgeWayfarer.clock().day : 0, h = (d * 2654435761) >>> 0, w = over();
    var pool = SIGHTS.filter(function (S) { return S.sky === w || S.sky === 'deep'; });
    var want = pool.filter(function (S) { return S.sky === w && !state.seen[S.id]; });
    if (want.length && h % 3) return want[h % want.length];        // two days in three, one you still need
    return pool[h % pool.length];
  }
  function skyDone(w) { return SIGHTS.every(function (S) { return S.sky !== w || state.seen[S.id]; }); }
  // a world's whole sky logged: its chart drawn up and handed over (once; js/codex.js counts it into The night sky)
  function charts(quiet) {
    Object.keys(SKIES).forEach(function (w) {
      if (state.charts[w] || !skyDone(w) || !has('BridgeInventory')) return;
      state.charts[w] = Date.now(); save();
      if (BridgeInventory.give) BridgeInventory.give('sky_chart_' + w, 1); else BridgeInventory.addItem('sky_chart_' + w, 1);
      if (!quiet && has('BridgeQuests')) BridgeQuests.toast('The observatory', 'A star chart of ' + SKIES[w] + '\'s sky', 'Every sight over ' + SKIES[w] + ' in the log');
    });
  }
  /** One world's chart, read (the item's Use). */
  function read(w) {
    var rows = SIGHTS.filter(function (S) { return S.sky === w; }).map(function (S) { return '* ' + S.name.toUpperCase() + (state.seen[S.id] ? '' : ' (NOT YET LOGGED)'); });
    say('STAR CHART: ' + (SKIES[w] || w).toUpperCase(), 'THE SKY OVER ' + (SKIES[w] || w).toUpperCase() + ', INKED IN BY YOUR OWN HAND FROM THE OBSERVING LOG:\n' + rows.join('\n') +
      '\n\nPINNED UP IN THE OBSERVATORY IT WOULD MAKE THE ASTRONOMERS JEALOUS.');
  }
  function pay() { return LOG_PAY * (has('BridgeCodex') && BridgeCodex.bonus && BridgeCodex.bonus('sky') ? 2 : 1); }
  function scope(inter) {
    var S = tonight(), fresh = !state.seen[S.id];
    if (fresh) {
      state.seen[S.id] = Date.now(); save();
      var n = Object.keys(state.seen).length;
      var got = pay();
      if (has('BridgeProgression') && BridgeProgression.awardCoins) BridgeProgression.awardCoins(got, 'observatory:' + S.id);
      if (has('BridgeQuests')) BridgeQuests.toast('The observatory', 'Logged: ' + S.name, n + ' of ' + SIGHTS.length + ' in the log · +' + got + ' coins');
      setTimeout(function () { charts(false); }, 2600);
      if (n === SIGHTS.length && !state.all) {
        state.all = Date.now(); save();
        if (has('BridgeProgression') && BridgeProgression.awardCoins) BridgeProgression.awardCoins(ALL_PAY, 'observatory:all');
        if (has('BridgeQuests')) BridgeQuests.toast('The observatory', 'Every sight in the log', 'An astronomer\'s captain · +' + ALL_PAY + ' coins');
      }
    }
    var caption = S.text + (fresh ? ' YOU WRITE IT IN THE LOG.' : ' IT\'S IN THE LOG ALREADY.');
    if (has('BridgeActions') && BridgeActions.run) BridgeActions.run({ x: inter.x, y: inter.y, label: inter.label, action: 'view', view: 'stars', caption: caption });
    else say(inter.label, caption);
  }
  function log() {
    var t = tonight();
    var order = Object.keys(SKIES).concat(['deep']);
    BridgeInteractions.choose({ title: 'The observing log', text: 'SIGHTS LOGGED: ' + Object.keys(state.seen).filter(function (id) { return SIGHTS.some(function (S) { return S.id === id; }); }).length + ' OF ' + SIGHTS.length +
        '. THE TELESCOPE SEES THE SKY OF WHEREVER SHE\'S PARKED, AND THE DEEP SKY BEYOND IT. LOG A WORLD\'S WHOLE SKY AND ITS STAR CHART IS YOURS.',
      rows: SIGHTS.slice().sort(function (a, b) { return order.indexOf(a.sky) - order.indexOf(b.sky); }).map(function (S) {
        var at = state.seen[S.id], w = S.sky;
        return { label: at ? S.name : '? ? ?', sub: (w === 'deep' ? 'the deep sky' : SKIES[w] + (state.charts[w] ? ' · charted' : '')) + ' · ' + (at ? new Date(at).toLocaleDateString() : (S === t ? 'in the sky now' : 'not yet seen')), info: true,
                 draw: function (g, s) { g.fillStyle = at ? '#e0b040' : S === t ? '#80c0ff' : '#3a3a50'; var u = s / 8; g.fillRect(3 * u, 1 * u, 2 * u, 6 * u); g.fillRect(1 * u, 3 * u, 6 * u, 2 * u); } };
      }), closeLabel: 'Done' });
  }
  function chart() {
    var W = has('BridgeWeather') ? BridgeWeather : null, lines = [];
    if (W && W.REGIONS && W.outlook) Object.keys(W.REGIONS).forEach(function (r) { var o = W.outlook(r); if (o) lines.push(W.REGIONS[r].name.toUpperCase() + ': ' + o.toUpperCase()); });
    say('STAR CHART', 'THE SKY READ PROPERLY, WORLD BY WORLD: WHAT THE WEATHER\'S DOING BELOW AND WHAT IT WILL DO NEXT.\n\n' + (lines.join('\n') || 'THE CLOUDS ARE HIDING THEIR HAND.'));
  }
  function orrery() {
    say('ORRERY', has('BridgeHours') && BridgeHours.chronometer ? BridgeHours.chronometer() : 'BRASS WORLDS ON BRASS ARMS, TICKING ROUND A LAMP.');
  }
  function use(inter) {
    if (inter.part === 'scope') scope(inter);
    else if (inter.part === 'chart') chart();
    else if (inter.part === 'orrery') orrery();
    else if (inter.part === 'log') log();
  }
  if (has('BridgeInteractions') && BridgeInteractions.register) BridgeInteractions.register('observatory', use, 'Use');

  setTimeout(function () { charts(true); }, 3000);                // an older log that already covers a sky: its chart, quietly
  return { SIGHTS: SIGHTS, SKIES: SKIES, CHARTS: CHARTS, tonight: tonight, over: over, read: read, charts: charts, skyDone: skyDone,
           seen: function () { return Object.keys(state.seen); }, _state: function () { return state; } };
})();
