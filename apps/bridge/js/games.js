/**
 * BridgeGames — the games found out in the worlds, and the game room aboard
 * the Wayfarer where they end up (worlds/gameroom.json, scenes/gameroom.py).
 *
 * Playing a game anywhere (an arcade cabinet, the chess table, a terminal on
 * Enigma, the canvas at the Brink, NULL's rig, Lucky 7's pachinko, a table at the Neon Royale —
 * Royale Link, under the old `runouts` key) marks it found; its slot in
 * the game room swaps its dust sheet for the real thing (scene layers
 * `g_<game>`: `on` / `off`) and you can play it from there. The score board
 * says what you've found and hints at what's still out there.
 */
var BridgeGames = (function () {
  var KEY = 'bridge_games';
  var GAMES = {
    'runouts':         { title: 'Royale Link',  url: '/runouts/?link=1', kind: 'cabinet', where: 'the Neon Royale, in Arcadia', hint: 'Chips, cards and a wheel, under the neon in Arcadia' },
    'asteroids':       { title: 'Asteroids',    url: '/asteroids',       kind: 'cabinet', where: "the Arcade, in Arcadia", hint: 'Something with rocks in it, in a neon arcade' },
    'helicopter':      { title: 'Helicopter',   url: '/helicopter',      kind: 'cabinet', where: "the Arcade, in Arcadia", hint: 'A cave, a helicopter, an arcade' },
    'breakout':        { title: 'Breakout',     url: '/breakout',        kind: 'cabinet', where: "the Arcade, in Arcadia", hint: 'A wall of bricks, a paddle, an arcade' },
    'space-invaders':  { title: 'Invaders',     url: '/space-invaders',  kind: 'cabinet', where: "the Arcade, in Arcadia", hint: 'Rows of them, coming down, in an arcade' },
    'missile-command': { title: 'Missile Cmd',  url: '/missile-command', kind: 'cabinet', where: "the Arcade, in Arcadia", hint: 'Cities to defend, in an arcade' },
    'chess':           { title: 'Chess',        url: '/chess?theme=ship',           kind: 'app',     where: 'your quarters',          hint: 'A game left half-played, closer than you think' },
    'cipher-room':     { title: 'Cipher',       url: '/cipher-room',     kind: 'app',     where: "Enigma's relay deck",    hint: 'A terminal on a dead station that keeps making codes' },
    'typist':          { title: 'Signal Relay', url: '/typist',          kind: 'app',     where: "Enigma's relay deck",    hint: 'A relay on a dead station, still taking messages' },
    'genart':          { title: 'The Canvas',   url: '/genart',          kind: 'app',     where: 'the Brink',              hint: 'Something that paints itself at the edge of everything' },
    'splice':          { title: 'Splice',                                kind: 'splice',  where: "NULL's den, in Arcadia", hint: 'A rig in a shipping container, behind a chained gate' },
    'pachinko':        { title: 'Pachinko',                              kind: 'pachinko', where: 'Lucky 7, in Arcadia',   hint: 'A roar of ball bearings behind a bulb sign' }
  };
  var found = {};
  try { found = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { found = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(found)); } catch (e) { /* private mode */ } }

  function keyOf(inter) {
    if (!inter) return null;
    if (inter.type === 'splice') return 'splice';
    if (inter.type === 'pachinko') return 'pachinko';
    if (inter.type === 'casino') return 'runouts';             // the Neon Royale's tables and terminals (js/casino.js)
    if ((inter.type === 'cabinet' || inter.type === 'app') && inter.target) {
      var k = String(inter.target).split('?')[0].replace(/^\/+|\/+$/g, '');
      return GAMES[k] ? k : null;
    }
    return null;
  }

  // a game played somewhere: it's yours now
  function note(inter) {
    var k = keyOf(inter);
    if (!k || found[k]) return;
    found[k] = Date.now();
    save();
    if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) {
      BridgeQuests.toast('Game room', GAMES[k].title, 'Now waiting for you aboard the Wayfarer', false);
    }
  }

  // `over`: whose finds to show (aboard someone else's Wayfarer, theirs — js/party.js)
  function layers(over) {
    var m = {}, F = over || found;
    Object.keys(GAMES).forEach(function (k) { m['g_' + k] = F[k] ? 'on' : 'off'; });
    return m;
  }

  function play(k) {
    var g = GAMES[k];
    if (g.kind === 'splice') { if (typeof BridgeSplice !== 'undefined') BridgeSplice.open(); return; }
    if (g.kind === 'pachinko') { if (typeof BridgePachinko !== 'undefined') BridgePachinko.open({ machine: 'lucky-cat' }); return; }
    BridgeInteractions.execute({ type: g.kind, target: g.url, label: g.title.toUpperCase(), gameKey: k });
  }

  function use(inter) {
    if (inter.type === 'game_scores') { BridgeInteractions.say(inter.arcade ? 'HIGH SCORES' : 'SCORE BOARD', scores(inter), inter); return; }
    var k = inter.game, g = GAMES[k];
    if (!g) return;
    if (found[k]) { play(k); return; }
    BridgeInteractions.say(g.title.toUpperCase(),
      'A DUST SHEET OVER SOMETHING. THE TAG ON IT IS BLANK - YOU HAVEN\'T FOUND THIS ONE YET.\n\nA NOTE IN YOUR OWN HAND: "' +
      g.hint.toUpperCase() + '."', inter);
  }

  // best scores, kept by the arcade kit (js/shared/arcade-kit.js) as you play
  function bests() { try { return JSON.parse(localStorage.getItem('bridge_scores') || '{}') || {}; } catch (e) { return {}; } }
  var CABINETS = ['asteroids', 'helicopter', 'breakout', 'space-invaders', 'missile-command'];

  function scores(inter) {
    var b = bests();
    if (inter && inter.arcade) {                    // the Arcade's own boards: the five classics
      var rows = CABINETS.map(function (k) {
        var r = b[k] || {};
        return GAMES[k].title.toUpperCase() + ' - ' + (r.best ? r.best : '---') + (r.plays ? '  (' + r.plays + (r.plays === 1 ? ' GAME)' : ' GAMES)') : '');
      });
      return 'YOUR BEST SCORES\n\n' + rows.join('\n') + '\n\nUNDER THE TAPE, THE OLD BOARD STILL SAYS: ACE - 9999.';
    }
    var keys = Object.keys(GAMES), have = keys.filter(function (k) { return found[k]; });
    var lines = ['GAMES FOUND: ' + have.length + ' OF ' + keys.length + '.'];
    if (have.length) lines.push('', have.map(function (k) { return GAMES[k].title.toUpperCase() + ' (' + GAMES[k].where.toUpperCase() + ')'; }).join(' \u00b7 '));
    var top = CABINETS.filter(function (k) { return b[k] && b[k].best; })
      .map(function (k) { return GAMES[k].title.toUpperCase() + ' ' + b[k].best; });
    if (top.length) lines.push('', 'BEST SCORES: ' + top.join(' \u00b7 ') + '.');
    var splice = (function () { try { return JSON.parse(localStorage.getItem('bridge_splice') || '{}'); } catch (e) { return {}; } })();
    var best = splice.best || {};
    var bs = Object.keys(best).sort().map(function (n) { return n + 'x' + n + ' IN ' + best[n] + 'S'; });
    if (bs.length) lines.push('', 'SPLICE, FASTEST: ' + bs.join(', ') + '.');
    if (have.length < keys.length) lines.push('', (keys.length - have.length) + ' STILL OUT THERE.');
    return lines.join('\n');
  }

  return { note: note, use: use, layers: layers, has: function (k) { return !!found[k]; }, all: function () { return GAMES; } };
})();
