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
 * `observatory` interactions by `part`: scope, chart, orrery, log. localStorage `bridge_observatory` ({ seen: { id: at } }).
 */
var BridgeObservatory = (function () {
  var KEY = 'bridge_observatory', LOG_PAY = 40, ALL_PAY = 500;
  var SIGHTS = [
    { id: 'comet', name: 'A comet', text: 'A COMET, ITS TAIL LONG AND FAINT AND FORKED, FALLING TOWARD A SUN YOU CAN\'T SEE.' },
    { id: 'ring', name: 'The Singularity\'s ring', text: 'FAR OFF, A RING OF BENT LIGHT ROUND NOTHING AT ALL: THE SINGULARITY, LENSING THE STARS BEHIND IT.' },
    { id: 'whale', name: 'An aether whale', text: 'SOMETHING VAST AND SLOW CROSSES THE STARS, BLOTTING THEM OUT IN TURN. AN AETHER WHALE, FIFTY SHIPS LONG.' },
    { id: 'nova', name: 'A new star', text: 'A STAR WHERE THERE WASN\'T ONE YESTERDAY, BRIGHT AS A LANTERN. A NOVA, A LONG WAY OFF AND A LONG TIME AGO.' },
    { id: 'shower', name: 'A meteor shower', text: 'METEORS, ONE A SECOND, STREAKING OUT OF THE SAME CORNER OF THE SKY LIKE SPARKS OFF A WHEEL.' },
    { id: 'moons', name: 'Verdance\'s two moons', text: 'VERDANCE\'S TWO LITTLE MOONS, ONE PASSING IN FRONT OF THE OTHER. THE FARMERS CALL IT THE KISS.' },
    { id: 'aurora', name: 'Hoarfell\'s aurora', text: 'GREEN CURTAINS OVER HOARFELL\'S POLE, MOVING, SEEN FROM ABOVE SO THEY LOOK LIKE WEED IN A CURRENT.' },
    { id: 'derelict', name: 'A derelict', text: 'A DERELICT, TUMBLING END OVER END, NO LIGHTS. THE TELESCOPE READS A NAME ON HER BOW YOU DON\'T RECOGNISE.' },
    { id: 'double', name: 'A double star', text: 'A DOUBLE STAR, GOLD AND BLUE, CIRCLING EACH OTHER. THE ALMANAC CALLS THEM THE CAPTAIN AND THE COOK.' },
    { id: 'giant', name: 'The giant\'s rings edge-on', text: 'ENIGMA\'S RINGED GIANT, ITS RINGS EXACTLY EDGE-ON, A LINE RULED ACROSS IT IN SILVER.' },
    { id: 'lights', name: 'Arcadia from above', text: 'ARCADIA\'S NIGHT SIDE, ONE CITY FROM POLE TO POLE, AND A STORM OF TRAFFIC LIGHTS ROUND THE SPIRES.' },
    { id: 'spores', name: 'The spore tide', text: 'LUMAR\'S SEA GLOWING IN BANDS: THE SPORE TIDE, VISIBLE FROM ORBIT, TURNING ITS OCEANS TO A MAP OF LIGHT.' }
  ];
  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { state = {}; }
  state.seen = state.seen || {};
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ } }
  function has(n) { return typeof window[n] !== 'undefined'; }
  function say(t, x) { BridgeInteractions.say(t, x); }

  /** Tonight's sight (by the ship's day: everyone aboard sees the same). */
  function tonight() {
    var d = has('BridgeWayfarer') ? BridgeWayfarer.clock().day : 0, h = (d * 2654435761) >>> 0;
    return SIGHTS[h % SIGHTS.length];
  }
  function scope(inter) {
    var S = tonight(), fresh = !state.seen[S.id];
    if (fresh) {
      state.seen[S.id] = Date.now(); save();
      var n = Object.keys(state.seen).length;
      if (has('BridgeProgression') && BridgeProgression.awardCoins) BridgeProgression.awardCoins(LOG_PAY, 'observatory:' + S.id);
      if (has('BridgeQuests')) BridgeQuests.toast('The observatory', 'Logged: ' + S.name, n + ' of ' + SIGHTS.length + ' in the log · +' + LOG_PAY + ' coins');
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
    BridgeInteractions.choose({ title: 'The observing log', text: 'SIGHTS LOGGED: ' + Object.keys(state.seen).length + ' OF ' + SIGHTS.length +
        '. A NEW ONE MOST SHIP\'S DAYS; THE TELESCOPE KNOWS WHERE TO LOOK.',
      rows: SIGHTS.map(function (S) {
        var at = state.seen[S.id];
        return { label: at ? S.name : '? ? ?', sub: at ? new Date(at).toLocaleDateString() : (S === t ? 'in the sky now' : 'not yet seen'), info: true,
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

  return { SIGHTS: SIGHTS, tonight: tonight, seen: function () { return Object.keys(state.seen); } };
})();
