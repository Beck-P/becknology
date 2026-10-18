/**
 * BridgeOldQuarter — Lantern Row's small pleasures (arcadia-oldquarter, arcadia-oldquarter-shrine).
 *
 *   goldfish   the goldfish scoop on the lane: 5 coins a paper net; now and then you land one (a goldfish in a bag,
 *              a gift children love), mostly the paper tears
 *   omikuji    the roof shrine's offering box: a coin in, the bell rung, a fortune drawn — great blessing (and Kanna
 *              gives you a charm), blessing, small blessing, or a curse you tie to the cord and walk away from
 *
 * Both register their interaction types with BridgeInteractions (no case in interactions.js).
 */
var BridgeOldQuarter = (function () {
  var NET = 5, COIN = 5;
  function say(t, x) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(t, x); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  var TORE = [
    'THE PAPER GOES SOFT, A FISH FLICKS ITS TAIL, AND THERE\'S A HOLE WHERE YOUR NET WAS. THE STALLHOLDER NODS SADLY. IT HAPPENS.',
    'YOU HAVE ONE - YOU HAVE ONE - YOU DON\'T. THE PAPER TEARS AT THE LAST MOMENT. A CHILD BESIDE YOU GROANS ON YOUR BEHALF.',
    'TOO SLOW, TOO DEEP. THE NET COMES UP EMPTY AND RAGGED. THE GOLDFISH LOOK, IF ANYTHING, AMUSED.'
  ];
  function goldfish() {
    BridgeInteractions.choose({
      title: 'GOLDFISH SCOOP',
      text: 'SHALLOW TUBS OF WATER, GOLDFISH TURNING IN THEM LIKE LITTLE FLAMES. A PAPER NET IS ' + NET + ' COINS. CATCH ONE BEFORE THE PAPER TEARS AND IT\'S YOURS, IN A BAG, TIED WITH A KNOT.',
      rows: [{ label: 'Buy a paper net', sub: 'and try your luck', note: NET + ' coins', pick: function () {
        BridgeProgression.wagerCoins(NET, 'goldfish').then(function (r) {
          if (!r || !r.ok) return say('GOLDFISH SCOOP', '"NETS ARE ' + NET + ' COINS, LOVE. THE FISH ARE FREE."');
          sfx('splash');
          if (Math.random() < 0.42) {
            sfx('pickup');
            if (typeof BridgeInventory !== 'undefined') BridgeInventory.give('goldfish_bag', 1);
            say('GOLDFISH SCOOP', 'A FLICK, A LIFT, AND THERE IT IS IN THE BOWL, ORANGE AND FURIOUS. THE STALLHOLDER TIPS IT INTO A BAG OF WATER AND TIES IT OFF. A CHILD BESIDE YOU APPLAUDS.');
          } else say('GOLDFISH SCOOP', pick(TORE));
        });
      } }],
      closeLabel: 'Walk on'
    });
  }

  var FORTUNES = [
    [10, 'GREAT BLESSING', 'YOUR ROAD IS WIDE AND THE WEATHER KIND. WHAT YOU LOST WILL COME BACK BY WATER.', 'charm'],
    [35, 'BLESSING', 'A FRIEND IS NEARER THAN YOU THINK. SAY YES TO THE NEXT INVITATION.'],
    [35, 'SMALL BLESSING', 'PATIENCE. THE TRAIN YOU WANT IS NOT THE FIRST ONE. IT IS THE SECOND.'],
    [20, 'CURSE', 'DO NOT LEND MONEY TO A MAN IN A HAT. DO NOT BET ON A SEVEN. DO NOT LOOK DOWN FROM THE SKYWALK.', 'tie']
  ];
  function omikuji() {
    BridgeInteractions.choose({
      title: 'THE OFFERING BOX',
      text: 'A SLATTED BOX UNDER THE BELL ROPE, WORN SMOOTH BY HANDS. A COIN IN, RING THE BELL, AND DRAW A FORTUNE FROM THE HEXAGONAL BOX BESIDE IT.',
      rows: [{ label: 'An offering and a fortune', sub: 'ring the bell', note: COIN + ' coins', pick: function () {
        BridgeProgression.wagerCoins(COIN, 'shrine').then(function (r) {
          if (!r || !r.ok) return say('THE OFFERING BOX', 'NO COIN? RING THE BELL ANYWAY. KANNA SAYS THE FOXES DON\'T KEEP ACCOUNTS.');
          sfx('bell');
          var total = 0, roll = Math.random() * 100, f = FORTUNES[0];
          for (var i = 0; i < FORTUNES.length; i++) { total += FORTUNES[i][0]; if (roll < total) { f = FORTUNES[i]; break; } }
          var text = 'THE BELL RINGS OUT OVER THE ROOFS. YOU SHAKE THE BOX AND A STICK FALLS OUT; KANNA HANDS YOU THE SLIP IT NAMES.\n\n' +
                     f[1] + '\n"' + f[2] + '"';
          if (f[3] === 'charm') {
            if (typeof BridgeInventory !== 'undefined') BridgeInventory.give('omamori', 1);
            text += '\n\nKANNA SMILES. "THE FOXES LIKE YOU." SHE PRESSES A CHARM INTO YOUR HAND.';
          } else if (f[3] === 'tie') text += '\n\nYOU TIE IT TO THE CORD WITH THE OTHERS AND WALK AWAY FROM IT. YOU FEEL LIGHTER ALREADY.';
          say('FORTUNE', text);
        });
      } }],
      closeLabel: 'Bow and step back'
    });
  }

  if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.register) {
    BridgeInteractions.register('goldfish', goldfish, 'Try');
    BridgeInteractions.register('omikuji', omikuji, 'Ring');
  }
  return { goldfish: goldfish, omikuji: omikuji };
})();
