/**
 * BridgeTogether — playing the Bridge's games together (on js/net.js and js/multi.js).
 *
 * Walk up to someone (or find them on the players pill) → *Play a game…* → pick one of the games in the place
 * you're both in (the Arcade's cabinets, the dice table, the dance floor, Lucky 7's machines, NULL's rig, the relay
 * deck's terminals), or any game you've both found (the game room's) → how to play it (a score duel, co-op, a race,
 * a game of chess, a seat at the table) → a stake (just for fun, or coins each). They're asked; they say yes (and
 * come over, if they were somewhere else) and you're both taken into it.
 *
 * Stakes: both put theirs in (BridgeProgression.wagerCoins) before anything starts. Against each other the pot goes
 * to the winner and a tie gives the stakes back; co-op, you stake together against the house — make the target
 * and it pays each of you double. Each client pays itself (trust-based: it's two people who like each other). If
 * the other one vanishes mid-game your stake comes back; a stake still on the table when the page closed comes back
 * the next time (`bridge_together`, which also keeps your record against each partner).
 *
 * The games plug in by kind (ADAPTERS): `cabinet` — any game in the cabinet (js/cabinet-modal.js), which reads
 * `?together=` with js/shared/together-frame.js (the arcade kit, chess, the cipher, Signal Relay); `dice`
 * (js/lodge.js), `dance` (js/dance.js), `pachinko` (js/pachinko.js), `splice` (js/splice.js). A game reports
 * with BridgeTogether.score(n, label) as it goes and .done(n, label) at the end (or .result('win'|'lose'|'draw'|
 * 'house') when it decides for itself), and talks to the other copy with .send(k, d) / .on(k, fn).
 *
 * On the wire (BridgeNet, all `g-…`): g-ask, g-yes, g-no, g-go, g-off (asking, staking, starting, calling off);
 * g-ready (a cabinet game loaded), g-score { s, done, label }, g-data { k, d }, g-beat, g-quit. Presence carries
 * `play` (what you're playing, with whom, the scores) so others nearby see it over your head, and `found` (the
 * games you've found, for the game-room list).
 */
var BridgeTogether = (function () {
  var KEY = 'bridge_together';
  var STAKES = [0, 10, 25, 50, 100];

  // ---- the games ---------------------------------------------------------------------------------------------------
  // base: the co-op target with no history (else 0.6 of your two bests added up, if that's more)
  var GAMES = {
    asteroids:         { title: 'Asteroids', kind: 'cabinet', url: '/asteroids', modes: ['duel', 'team'], base: 12000 },
    breakout:          { title: 'Breakout', kind: 'cabinet', url: '/breakout', modes: ['duel', 'team'], base: 3000 },
    helicopter:        { title: 'Helicopter', kind: 'cabinet', url: '/helicopter', modes: ['duel', 'tandem'], base: 1400 },
    'space-invaders':  { title: 'Spore Invaders', kind: 'cabinet', url: '/space-invaders', modes: ['duel', 'team'], base: 6000 },
    'missile-command': { title: 'Missile Command', kind: 'cabinet', url: '/missile-command', modes: ['duel', 'team'], base: 12000 },
    chess:             { title: 'Chess', kind: 'cabinet', url: '/chess?theme=ship', modes: ['match'] },
    'cipher-room':     { title: 'Cipher', kind: 'cabinet', url: '/cipher-room/play.html?type=flash', modes: ['race', 'decode'] },
    typist:            { title: 'Signal Relay', kind: 'cabinet', url: '/typist', modes: ['duel', 'team'], base: 60 },
    splice:            { title: 'Splice', kind: 'splice', modes: ['race', 'hands'] },
    pachinko:          { title: 'Pachinko', kind: 'pachinko', modes: ['duel', 'team'], base: 100 },
    dance:             { title: 'The dance floor', kind: 'dance', modes: ['duel', 'team'] },
    dice:              { title: 'Liar\'s dice', kind: 'dice', modes: ['table'] }
  };
  // how you play it: against each other (vs: the pot to the winner) or together (coop: against the house)
  var MODES = {
    duel:   { name: 'Score duel', sub: 'the same game at the same time · the best score takes the pot', vs: true },
    team:   { name: 'Co-op', sub: 'your scores added up against a target · make it and the house doubles your stakes', coop: true },
    tandem: { name: 'Tandem', sub: 'two copters in one cave · crash and you relaunch beside your partner · fly far together', coop: true },
    match:  { name: 'A game of chess', sub: 'whoever asks plays Ivory · checkmate takes the pot, a draw gives the stakes back', vs: true, result: true },
    race:   { name: 'Race', sub: 'the same board for both · first to finish takes the pot', vs: true },
    hands:  { name: 'Four hands', sub: 'one board, both of you turning junctions · splice it before the trace finds you', coop: true },
    decode: { name: 'Decode together', sub: 'one grid, both of you typing · decode it and the house doubles your stakes', coop: true },
    table:  { name: 'At the table', sub: 'liar\'s dice, real cups · the last with dice takes the pot', vs: true, result: true }
  };
  var NAMES = {                                       // a game's own words for its modes
    dance:    { duel: ['Dance-off', 'the same steps, each on your own panel · the higher score takes the floor and the pot'],
                team: ['In step', 'your two scores added up · beat the target and the house doubles your stakes'] },
    pachinko: { duel: ['Race the tray', '50 match balls each on the same machine · the most balls won takes the pot'],
                team: ['Beat the house', '50 match balls each · win back more than you fired, between you'] },
    typist:   { duel: ['Signal duel', 'the same messages, the same clock · the higher WPM takes the pot'],
                team: ['Two operators', 'your WPM added up against a target'] }
  };
  function modeName(g, m) { var o = NAMES[g] && NAMES[g][m]; return o ? o[0] : MODES[m].name; }
  // what a game's called for a session: the table's own name at the dice, the dance by how it's danced
  function titleOf(s) { return s.g === 'dice' ? TABLES[s.opts && s.opts.table] || TABLES.fell : s.g === 'dance' ? modeName('dance', s.mode) : GAMES[s.g].title; }
  function modeSub(g, m) { var o = NAMES[g] && NAMES[g][m]; return o ? o[1] : MODES[m].sub; }

  // ---- small things ------------------------------------------------------------------------------------------------
  function N() { return typeof BridgeNet !== 'undefined' ? BridgeNet : null; }
  function M() { return typeof BridgeMulti !== 'undefined' ? BridgeMulti : null; }
  function cap(t) { return M() ? M().cap(t) : String(t || ''); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }
  function choose(spec) { if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.choose) BridgeInteractions.choose(spec); }
  function toast(a, b, c) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(a, b, c, false); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function rid() { return Math.random().toString(36).slice(2, 10); }
  function inWorld() { return typeof BridgeState !== 'undefined' && BridgeState.getState() === 'world' && typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorld(); }
  function myName() { var m = N() && N().me(); return cap(m ? m.name : 'You'); }
  function nameOf(id) { var p = N() && N().peer(id); return cap(p ? p.name : (S && S.peer === id ? S.peerName : 'them')); }
  function num(n) { return typeof n === 'number' ? Math.round(n).toLocaleString('en-US') : String(n == null ? '' : n); }
  function nice(n) { if (n < 100) return Math.round(n); var p = Math.pow(10, Math.floor(Math.log10(n)) - 1); return Math.round(n / p) * p; }

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* private mode */ } }

  // coins: your stake in, a pot or a refund out
  function stake(n, why) {
    if (!(n > 0)) return Promise.resolve(true);
    if (typeof BridgeProgression === 'undefined' || !BridgeProgression.wagerCoins) return Promise.resolve(false);
    return Promise.resolve(BridgeProgression.wagerCoins(n, why)).then(function (r) { return !!(r && r.ok); }, function () { return false; });
  }
  function pay(n, why) {
    if (!(n > 0) || typeof BridgeProgression === 'undefined' || !BridgeProgression.awardCoins) return;
    try { BridgeProgression.awardCoins(n, why); } catch (e) { /* offline */ }
    if (typeof BridgeCoinHUD !== 'undefined' && BridgeCoinHUD.refresh) setTimeout(BridgeCoinHUD.refresh, 400);
  }
  // a stake on the table is remembered until the game's settled, so a closed page gives it back next time
  function holdStake() { if (!S || !(S.wager > 0)) return; var d = load(); d.stake = { sid: S.sid, n: S.wager, g: S.g, at: Date.now() }; save(d); }
  function dropStake() { var d = load(); if (d.stake && (!S || d.stake.sid === S.sid)) { delete d.stake; save(d); } }
  function refund(why) {
    if (!S || !S.staked || S.refunded) return 0;
    S.refunded = true;
    pay(S.wager, 'together:refund');
    dropStake();
    return S.wager;
  }

  // ---- your record against each other (kept in bridge_together.rec) ---------------------------------------------------
  function record(id) { var r = (load().rec || {})[id]; return r || { w: 0, l: 0, d: 0, made: 0, tries: 0 }; }
  function tally(field) {
    if (!S) return;
    var d = load(); d.rec = d.rec || {};
    var r = d.rec[S.peer] = d.rec[S.peer] || { name: S.peerName, w: 0, l: 0, d: 0, made: 0, tries: 0 };
    r.name = S.peerName;
    if (field === 'made') { r.made++; r.tries++; } else if (field === 'missed') r.tries++; else r[field]++;
    save(d);
  }
  function recordLine(id) {
    var r = record(id), who = nameOf(id), parts = [];
    if (r.w + r.l + r.d) parts.push('YOU ' + r.w + ' – ' + r.l + ' ' + who.toUpperCase() + (r.d ? ' (' + r.d + ' DRAWN)' : ''));
    if (r.tries) parts.push('TOGETHER ' + r.made + ' OF ' + r.tries);
    return parts.join(' · ');
  }

  // ---- what's here to play -------------------------------------------------------------------------------------------
  function keyOf(it) {
    if (!it) return null;
    if (it.type === 'dice') return 'dice';
    if (it.type === 'dance') return 'dance';
    if (it.type === 'pachinko') return 'pachinko';
    if (it.type === 'splice') return 'splice';
    if (it.type === 'game_slot') return GAMES[it.game] && GAMES[it.game].kind !== 'dice' && foundHere(it.game) ? it.game : null;
    if ((it.type === 'cabinet' || it.type === 'app') && it.target) {
      var k = String(it.target).split('?')[0].replace(/^\/+|\/+$/g, '');
      return GAMES[k] ? k : null;
    }
    return null;
  }
  function foundHere(k) { return typeof BridgeGames === 'undefined' || !BridgeGames.has || BridgeGames.has(k); }
  var TABLES = { fell: 'Fell Dice', anchor: 'Bones' };
  function stationTitle(k, it) {
    if (k === 'dice') return TABLES[it.table] || TABLES.fell;
    if (k === 'pachinko') { var m = typeof BridgePachinko !== 'undefined' && BridgePachinko.machines()[it.machine]; return 'Pachinko' + (m ? ' · ' + m.title : ''); }
    return GAMES[k].title;
  }
  // the games in this place, nearest first (one row a game: the nearest station of it)
  function gamesHere() {
    var w = inWorld();
    if (!w || !w.interactions) return [];
    var rp = BridgeCharacter.getRenderPos(), seen = {}, out = [];
    w.interactions.forEach(function (it) {
      var k = keyOf(it);
      if (!k) return;
      var d = Math.hypot((it.x || 0) - rp.x, (it.y || 0) - rp.y), id = k === 'dice' ? 'dice:' + (it.table || 'fell') : k;
      if (seen[id] && seen[id].d <= d) return;
      var row = { g: k, title: stationTitle(k, it), d: d, opts: {} };
      if (k === 'dice') row.opts.table = it.table || 'fell';
      if (k === 'pachinko') row.opts.machine = it.machine || 'lucky-cat';
      if (it.type === 'cabinet' || it.type === 'app') row.opts.url = it.target;
      if (seen[id]) out.splice(out.indexOf(seen[id]), 1);
      seen[id] = row; out.push(row);
    });
    return out.sort(function (a, b) { return a.d - b.d; });
  }
  // the games you've both found (the game room's): anywhere you're together
  function myFound() {
    if (typeof BridgeGames === 'undefined' || !BridgeGames.has) return [];
    return Object.keys(GAMES).filter(function (k) { return GAMES[k].kind !== 'dice' && GAMES[k].kind !== 'dance' && BridgeGames.has(k); });
  }
  function bothFound(p) {
    var theirs = (p && p.found) || [];
    return myFound().filter(function (k) { return theirs.indexOf(k) >= 0; });
  }
  function together(id) { var o = M() && M().others(); return !!(o && o[id]); }

  // ---- asking --------------------------------------------------------------------------------------------------------
  var S = null;                                       // the game you're in (or asking about)

  function pick(id) {
    var n = N(), p = n && n.peer(id);
    if (!p) { toast('Play together', nameOf(id) + ' isn\'t on', ''); return; }
    if (S && S.state !== 'settled') { toast('Play together', 'You\'re in a game already', ''); return; }
    var who = nameOf(id), near = together(id), here = gamesHere(), rows = [];
    here.forEach(function (r) {
      rows.push({ label: r.title, sub: r.d < 2.6 ? 'right here' : 'in this room', note: '', pick: function () { modes(id, r); return false; } });
    });
    var have = here.map(function (r) { return r.g; });
    bothFound(p).filter(function (k) { return have.indexOf(k) < 0; }).forEach(function (k) {
      rows.push({ label: GAMES[k].title, sub: 'from the game room · you\'ve both found it', note: '', pick: function () { modes(id, { g: k, title: GAMES[k].title, opts: {} }); return false; } });
    });
    var line = recordLine(id);
    choose({ title: 'Play with ' + who,
      text: rows.length ? (near ? 'PICK A GAME — THE ONES HERE FIRST.' : who.toUpperCase() + ' WILL COME OVER TO PLAY.') + (line ? '\n\n' + line : '')
                        : 'NOTHING TO PLAY TOGETHER HERE. TRY THE ARCADE, LUCKY 7, THE LODGE\'S DICE TABLE OR CLUB VOID — OR A GAME YOU\'VE BOTH FOUND.',
      rows: rows, buttons: [{ label: 'Back', act: function () { if (near && M()) M().menu(id); else if (M()) M().panel(); return false; } }], closeLabel: 'Never mind' });
  }
  function modes(id, r) {
    var G = GAMES[r.g], rows = G.modes.map(function (m) {
      return { label: modeName(r.g, m), sub: modeSub(r.g, m), note: MODES[m].coop ? 'co-op' : 'vs', pick: function () { extras(id, r, m); return false; } };
    });
    if (rows.length === 1 && r.g !== 'dice') { extras(id, r, G.modes[0]); return; }
    if (r.g === 'dice') { stakes(id, r, 'table'); return; }
    choose({ title: r.title + ' with ' + nameOf(id), text: 'HOW DO YOU WANT TO PLAY?', rows: rows,
             buttons: [{ label: 'Back', act: function () { pick(id); return false; } }], closeLabel: 'Never mind' });
  }
  // a game's own choice before the stake (the dance's level)
  function extras(id, r, m) {
    if (r.g === 'dance') {
      var L = typeof BridgeDance !== 'undefined' ? BridgeDance.LEVELS : { club: { name: 'CLUB', sub: '' } };
      choose({ title: modeName('dance', m), text: 'WHICH STEPS?', rows: Object.keys(L).map(function (lv) {
        return { label: cap(L[lv].name), sub: L[lv].sub, pick: function () { stakes(id, Object.assign({}, r, { opts: Object.assign({}, r.opts, { level: lv }) }), m); return false; } };
      }), buttons: [{ label: 'Back', act: function () { modes(id, r); return false; } }], closeLabel: 'Never mind' });
      return;
    }
    stakes(id, r, m);
  }
  function stakes(id, r, m) {
    var who = nameOf(id), rows;
    if (r.g === 'dice') {
      var rival = (typeof BridgeLodge !== 'undefined' && BridgeLodge.rivalFor && BridgeLodge.rivalFor(r.opts.table)) || 'a regular';
      rows = [];
      [10, 25, 50].forEach(function (s) { rows.push({ label: 'Heads up · ' + s + ' each', sub: 'just the two of you · the pot ' + s * 2, pick: function () { ask(id, { g: 'dice', mode: 'table', wager: s, opts: Object.assign({}, r.opts, { seats: 2 }) }); } }); });
      [10, 25, 50].forEach(function (s) { rows.push({ label: 'With ' + rival + ' · ' + s + ' each', sub: 'three cups · the pot ' + s * 3, pick: function () { ask(id, { g: 'dice', mode: 'table', wager: s, opts: Object.assign({}, r.opts, { seats: 3 }) }); } }); });
      choose({ title: r.title + ' with ' + who, text: 'FIVE DICE A CUP, ONES WILD. WHO SITS DOWN, AND FOR HOW MUCH?', rows: rows,
               buttons: [{ label: 'Back', act: function () { pick(id); return false; } }], closeLabel: 'Never mind' });
      return;
    }
    var coop = MODES[m].coop;
    rows = STAKES.map(function (s) {
      return { label: s ? s + ' coins each' : 'Just for fun', sub: !s ? 'no coins on it' : coop ? 'make it and the house pays you each ' + s * 2 : 'the pot: ' + s * 2,
               pick: function () { ask(id, { g: r.g, mode: m, wager: s, opts: r.opts }); } };
    });
    choose({ title: modeName(r.g, m) + ' · ' + r.title, text: coop ? 'BACK YOURSELVES? YOU BOTH PUT IN THE SAME.' : 'WHAT\'S ON IT? YOU BOTH PUT IN THE SAME.', rows: rows,
             buttons: [{ label: 'Back', act: function () { modes(id, r); return false; } }], closeLabel: 'Never mind' });
  }
  function describe(c) {
    var G = GAMES[c.g], t = (c.g === 'dice' ? TABLES[c.opts && c.opts.table] || 'Liar\'s dice' : G.title) + ' · ' + (c.g === 'dice' ? (c.opts.seats === 3 ? 'three cups' : 'heads up') : modeName(c.g, c.mode));
    if (c.opts && c.opts.level && typeof BridgeDance !== 'undefined' && BridgeDance.LEVELS[c.opts.level]) t += ' (' + cap(BridgeDance.LEVELS[c.opts.level].name) + ')';
    return t + ' · ' + (c.wager ? c.wager + ' coins each' : 'just for fun');
  }

  function ask(id, c) {
    var n = N(), p = n && n.peer(id);
    if (!p || (S && S.state !== 'settled')) return;
    var rp = inWorld() ? BridgeCharacter.getRenderPos() : { x: null, y: null };
    S = { sid: rid(), g: c.g, mode: c.mode, wager: c.wager || 0, opts: c.opts || {}, host: true, peer: id, peerName: cap(p.name), state: 'asking',
          mine: { s: 0, done: false, label: '' }, theirs: { s: 0, done: false, label: '' }, heard: Date.now(), ready: {} };
    var sid = S.sid;
    n.send('g-ask', { sid: sid, g: c.g, mode: c.mode, wager: S.wager, opts: S.opts, name: myName(), best: best(c.g),
                      at: { world: inWorld() ? BridgeWorld.getWorldId() : null, inst: M() ? M().myInst() : null, x: rp.x, y: rp.y } }, id);
    toast('Play together', 'Asked ' + S.peerName, describe(c));
    sfx('click');
    S.askTimer = setTimeout(function () {
      if (!S || S.sid !== sid || S.state !== 'asking') return;
      n.send('g-off', { sid: sid, why: 'too late' }, id);
      toast('Play together', S.peerName + ' didn\'t answer', '');
      S = null; presence();
    }, 45000);
    presence();
  }

  // someone asks you
  function onAsk(d, from) {
    var n = N();
    if (!d || !d.sid || !GAMES[d.g] || !MODES[d.mode]) return;
    if (S && S.state !== 'settled') { n.send('g-no', { sid: d.sid, why: 'is in a game already' }, from); return; }
    var who = cap(d.name || nameOf(from));
    whenFree(function () {
      if (S && S.state !== 'settled') { n.send('g-no', { sid: d.sid, why: 'is in a game already' }, from); return; }
      var here = d.at && d.at.inst && M() && M().myInst() === d.at.inst;
      var m = MODES[d.mode], c = { g: d.g, mode: d.mode, wager: d.wager, opts: d.opts || {} };
      var text = describe(c).toUpperCase() + '.\n\n' + (d.g === 'dice' ? 'LIAR\'S DICE, REAL CUPS: THE LAST WITH DICE TAKES THE POT.' : modeSub(d.g, d.mode).toUpperCase() + '.') +
        (d.wager ? (m.coop ? '\n\nYOU EACH PUT IN ' + d.wager + '.' : '\n\nYOU EACH PUT IN ' + d.wager + ' · THE POT ' + d.wager * (d.opts && d.opts.seats === 3 ? 3 : 2) + '.') : '') +
        (here ? '' : '\n\nYOU\'LL GO TO ' + who.toUpperCase() + (d.at && d.at.world ? '' : '') + ' FIRST.');
      var line = recordLine(from);
      choose({ title: who + ' wants to play', text: text + (line ? '\n\n' + line : ''),
        buttons: [{ label: here ? 'Play' : 'Go and play', act: function () { accept(d, from); } },
                  { label: 'Not now', act: function () { n.send('g-no', { sid: d.sid, why: 'said not now' }, from); } }],
        closeLabel: 'Later' });
      sfx('open');
    });
  }
  // don't take the screen from a conversation, a trade or a game
  function busy() {
    if (!inWorld()) return true;
    if (document.querySelector('.world-dialog') || document.getElementById('trade-panel')) return true;
    if (typeof BridgeCabinetModal !== 'undefined' && BridgeCabinetModal.isOpen()) return true;
    if (typeof BridgeLodge !== 'undefined' && BridgeLodge.isOpen()) return true;
    if (typeof BridgeDance !== 'undefined' && BridgeDance.isOpen()) return true;
    if (document.querySelector('#pachinko.visible, #splice.visible')) return true;
    return false;
  }
  function whenFree(f, since) {
    since = since || Date.now();
    if (!busy()) { f(); return; }
    if (Date.now() - since > 60000) return;          // they'll have given up by now
    setTimeout(function () { whenFree(f, since); }, 600);
  }

  function accept(d, from) {
    var n = N();
    if ((S && S.state !== 'settled') || !n.peer(from)) return;
    S = { sid: d.sid, g: d.g, mode: d.mode, wager: d.wager || 0, opts: d.opts || {}, host: false, peer: from, peerName: cap(d.name || nameOf(from)), state: 'joining',
          mine: { s: 0, done: false, label: '' }, theirs: { s: 0, done: false, label: '' }, heard: Date.now(), ready: {}, theirBest: d.best };
    var sid = S.sid;
    var go = function () {
      if (!S || S.sid !== sid) return;
      stake(S.wager, 'together:' + S.g).then(function (ok) {
        if (!S || S.sid !== sid) { if (ok) pay(d.wager, 'together:refund'); return; }
        if (!ok) { n.send('g-no', { sid: sid, why: 'hasn\'t the coins' }, from); toast('Play together', 'Not enough coins', 'You need ' + S.wager + ' to sit in'); S = null; return; }
        S.staked = S.wager > 0; holdStake();
        S.state = 'waiting';
        n.send('g-yes', { sid: sid, best: best(S.g) }, from);
        setTimeout(function () { if (S && S.sid === sid && S.state === 'waiting') { refund(); toast('Play together', 'Called off', S.peerName + ' went quiet'); S = null; presence(); } }, 20000);
      });
    };
    var here = d.at && d.at.inst && M() && M().myInst() === d.at.inst;
    if (here || !d.at || !d.at.world) go();
    else goTo(d.at, go, function (why) { n.send('g-no', { sid: sid, why: why }, from); S = null; });
  }
  // over to them (their world and a free tile beside them), then on
  function goTo(at, then, fail) {
    if (typeof BridgeSloop !== 'undefined' && BridgeSloop.isRunning && BridgeSloop.isRunning()) { fail('is at sea'); return; }
    if (!M() || !M().travel) { fail('couldn\'t get there'); return; }
    M().travel({ world: at.world, inst: at.inst, x: at.x, y: at.y });
    var t0 = Date.now();
    (function wait() {
      if (M().myInst() === at.inst && inWorld()) { setTimeout(then, 700); return; }
      if (Date.now() - t0 > 20000) { fail('couldn\'t get there'); return; }
      setTimeout(wait, 300);
    })();
  }

  function onYes(d, from) {
    var n = N();
    if (!S || S.sid !== d.sid || !S.host || S.state !== 'asking') { n.send('g-off', { sid: d.sid, why: 'too late' }, from); return; }
    clearTimeout(S.askTimer);
    S.theirBest = d.best || 0;
    S.state = 'staking';
    var sid = S.sid;
    stake(S.wager, 'together:' + S.g).then(function (ok) {
      if (!S || S.sid !== sid) { if (ok) pay(S ? S.wager : 0, 'together:refund'); return; }
      if (!ok) { n.send('g-off', { sid: sid, why: myName() + ' hasn\'t the coins' }, from); toast('Play together', 'Not enough coins', 'You need ' + S.wager); S = null; presence(); return; }
      S.staked = S.wager > 0; holdStake();
      S.seed = Math.floor(Math.random() * 2147483646) + 1;
      S.target = target(S);
      S.pot = pot(S);
      n.send('g-go', { sid: sid, seed: S.seed, target: S.target, pot: S.pot }, from);
      begin();
    });
  }
  function onGo(d, from) {
    if (!S || S.sid !== d.sid || S.host || S.state !== 'waiting') { N().send('g-off', { sid: d.sid, why: 'too late' }, from); return; }
    S.seed = d.seed; S.target = d.target; S.pot = d.pot;
    begin();
  }
  function onNo(d, from) {
    if (!S || S.sid !== d.sid || S.state !== 'asking') return;
    clearTimeout(S.askTimer);
    toast('Play together', S.peerName + ' ' + (d.why || 'said no'), '');
    S = null; presence();
  }
  function onOff(d, from) {
    if (!S || S.sid !== d.sid || S.state === 'settled') return;
    var back = refund();
    toast('Play together', 'Called off', (d.why || '') + (back ? ' · your ' + back + ' coins are back' : ''));
    end(true);
  }

  // co-op targets: the base, or 0.6 of your two bests together if that's more; the dance works its own out
  function best(g) {
    try {
      if (g === 'typist') { var t = JSON.parse(localStorage.getItem('bridge_scores') || '{}').typist || {}; return t.best || 0; }
      var s = JSON.parse(localStorage.getItem('bridge_scores') || '{}')[g] || {};
      return s.best || 0;
    } catch (e) { return 0; }
  }
  function target(s) {
    var G = GAMES[s.g];
    if (s.g === 'dance') return typeof BridgeDance !== 'undefined' && BridgeDance.target ? BridgeDance.target(s.opts.level || 'club') : 50000;
    if (s.mode === 'hands' || s.mode === 'decode') return 1;
    if (!G.base) return 0;
    var mine = best(s.g), theirs = s.theirBest || 0;
    return Math.max(G.base, nice(0.6 * (mine + theirs)));
  }
  function pot(s) { return MODES[s.mode].coop ? s.wager * 2 : s.wager * (s.g === 'dice' && s.opts.seats === 3 ? 3 : 2); }

  // ---- playing ------------------------------------------------------------------------------------------------------
  var beat = 0;
  function begin() {
    S.state = 'playing'; S.heard = Date.now(); S.startedAt = Date.now();
    clearInterval(beat);
    beat = setInterval(heartbeat, 4000);
    sfx('success');
    var A = ADAPTERS[GAMES[S.g].kind];
    try { A.start(S); } catch (e) { console.warn('[together] start', e); }
    presence();
  }
  function heartbeat() {
    if (!S || S.state !== 'playing') { clearInterval(beat); return; }
    var n = N();
    n.send('g-beat', { sid: S.sid }, S.peer);
    var gone = !n.peer(S.peer);
    if (gone) S.missing = S.missing || Date.now(); else S.missing = 0;
    if ((S.missing && Date.now() - S.missing > 6000) || Date.now() - S.heard > 45000) vanished();
  }
  function heard(d) { if (S && d && d.sid === S.sid) { S.heard = Date.now(); return true; } return false; }

  // they're gone: if they'd finished, settle when you do; otherwise it's off and your stake comes back
  function vanished() {
    if (!S || S.state !== 'playing') return;
    var m = MODES[S.mode];
    if (S.theirs.done && !m.result) { S.alone = true; return; }
    var back = refund(), who = S.peerName;
    adapter('gone');
    toast('Play together', who + ' left', back ? 'Your ' + back + ' coins are back' : 'The game\'s off');
    end(true);
  }

  // your score as it goes (adapters and cabinet games), and at the end
  function score(n, label) { report(n, false, label); }
  function done(n, label) { report(n, true, label); }
  function report(n, fin, label) {
    if (!S || S.state !== 'playing' || S.mine.done) return;
    S.mine = { s: n, done: !!fin, label: label || '' };
    N().send('g-score', { sid: S.sid, s: n, done: !!fin, label: label || '' }, S.peer);
    if (fin) dropStake();                              // from here they settle with your final score even if you go
    paintBar(); presence();
    if (fin) maybeSettle();
  }
  function onScore(d, from) {
    if (!heard(d) || S.peer !== from) return;
    if (S.theirs.done) return;
    S.theirs = { s: d.s, done: !!d.done, label: d.label || '' };
    adapter('peer', S.theirs);
    paintBar(); presence();
    if (d.done) maybeSettle();
  }
  function maybeSettle() {
    if (!S || S.state !== 'playing' || !S.mine.done || !S.theirs.done) return;
    var m = MODES[S.mode], a = S.mine.s, b = S.theirs.s;
    if (m.coop) settle(a + b >= S.target ? 'made' : 'missed');
    else settle(a > b ? 'win' : a < b ? 'lose' : 'draw');
  }
  // a game that decides for itself (chess, the dice table)
  function result(outcome, why) { if (S && S.state === 'playing') settle(outcome, false, why); }
  // walking away from a game decided by a result: it goes to them
  function forfeit() {
    if (!S || S.state !== 'playing') return;
    N().send('g-quit', { sid: S.sid }, S.peer);
    if (MODES[S.mode].result) settle('lose', true);
    else done(S.mine.s, S.mine.label);
  }
  function onQuit(d, from) {
    if (!heard(d) || S.peer !== from || S.state !== 'playing') return;
    if (MODES[S.mode].result) { adapter('quit'); settle('win', false, S.peerName + ' gave it up'); }
  }

  function settle(outcome, quiet, why) {
    if (!S || S.state === 'settled') return;
    S.state = 'settled';
    clearInterval(beat);
    var m = MODES[S.mode], paid = 0;
    if (outcome === 'win') paid = S.pot;
    else if (outcome === 'draw') paid = S.wager;
    else if (outcome === 'made') paid = S.wager * 2;
    if (paid) pay(paid, 'together:' + S.g + ':' + outcome);
    S.refunded = true; dropStake();
    if (outcome !== 'house') tally(outcome === 'win' ? 'w' : outcome === 'lose' ? 'l' : outcome === 'draw' ? 'd' : outcome === 'made' ? 'made' : 'missed');
    S.outcome = outcome; S.paid = paid;
    var v = verdict(outcome, paid, why);
    S.verdict = v;
    sfx(outcome === 'win' || outcome === 'made' ? 'quest' : outcome === 'draw' ? 'coin' : 'fail');
    adapter('verdict', v);
    paintBar(); presence();
    if (!quiet) noteIt(v);
    var sid = S.sid;
    setTimeout(function () { if (S && S.sid === sid && S.state === 'settled') { S = null; presence(); } }, 1500);
  }
  function verdict(outcome, paid, why) {
    var who = S.peerName, m = MODES[S.mode], a = S.mine, b = S.theirs, head, line = '', money = '';
    var lab = function (x) { return x.label || num(x.s); };
    if (m.coop) {
      head = outcome === 'made' ? 'You made it together' : 'Not this time';
      if (S.mode === 'hands' || S.mode === 'decode') line = outcome === 'made' ? (S.mode === 'hands' ? 'THE FEED\'S THROUGH.' : 'INTERCEPT DECODED.') : 'THE CLOCK BEAT YOU BOTH.';
      else line = 'TOGETHER ' + num(a.s + b.s) + ' OF ' + num(S.target) + ' - YOU ' + lab(a) + ', ' + who.toUpperCase() + ' ' + lab(b) + '.';
      if (S.wager) money = outcome === 'made' ? 'THE HOUSE PAYS YOU EACH ' + paid + '.' : 'THE HOUSE KEEPS YOUR STAKES.';
    } else {
      head = outcome === 'win' ? 'You win' : outcome === 'lose' ? who + ' wins' : outcome === 'house' ? 'The house wins' : 'A dead heat';
      if (!m.result) line = 'YOU ' + lab(a) + ' - ' + who.toUpperCase() + ' ' + lab(b) + '.';
      else if (why) line = why.toUpperCase() + (/[.!?"']$/.test(why) ? '' : '.');
      if (S.wager) money = outcome === 'win' ? 'THE POT IS YOURS: ' + paid + ' COINS.' : outcome === 'draw' ? 'YOUR STAKE COMES BACK.' : outcome === 'house' ? 'THE POT STAYS ON THE TABLE.' : who.toUpperCase() + ' TAKES THE POT.';
    }
    return { head: head, line: [line, money].filter(Boolean).join('\n'), score: line, money: money, outcome: outcome, paid: paid,
             title: S.g === 'dance' ? 'Club Void' : titleOf(S),
             mode: S.g === 'dice' ? (S.opts.seats === 3 ? 'Three cups' : 'Heads up') : modeName(S.g, S.mode), rec: recordLine(S.peer) };
  }
  function noteIt(v) {
    if (typeof BridgeQuests !== 'undefined' && BridgeQuests.note) BridgeQuests.note(v.title + ' with ' + (S ? S.peerName : ''), v.head, v.paid ? '+' + v.paid + ' coins' : '');
  }
  // the end of a session (settled, called off or abandoned)
  function end(now) {
    clearInterval(beat);
    if (S) { S.state = 'settled'; dropStake(); }
    var sid = S && S.sid;
    if (now) { S = null; presence(); return; }
    setTimeout(function () { if (S && S.sid === sid) { S = null; presence(); } }, 1500);
  }

  // the verdict, shown in a dialog for the games out in the world (a cabinet shows its own)
  function showVerdict(v, again) {
    var s = S, c = s ? { g: s.g, mode: s.mode, wager: s.wager, opts: s.opts } : null, peer = s && s.peer;
    whenFree(function () {
      var bs = [];
      if (c && peer && N() && N().peer(peer)) bs.push({ label: 'Again', act: function () { ask(peer, c); } });
      choose({ title: v.title + ' · ' + v.mode, text: v.head.toUpperCase() + '.\n\n' + v.line + (v.rec ? '\n\n' + v.rec : ''), buttons: bs, closeLabel: 'Done' });
    });
  }

  // ---- talking to the other copy of the game ---------------------------------------------------------------------------
  var dataFns = {};
  function send(k, d) { if (S && (S.state === 'playing' || S.state === 'settled')) N().send('g-data', { sid: S.sid, k: k, d: d }, S.peer); }
  function on(k, f) { (dataFns[k] = dataFns[k] || []).push(f); }
  function onData(d, from) {
    if (!heard(d) || S.peer !== from) return;
    (dataFns[d.k] || []).forEach(function (f) { try { f(d.d, S); } catch (e) { console.warn('[together] data ' + d.k, e); } });
    if (GAMES[S.g].kind === 'cabinet') post({ type: 'bridge-together-data', k: d.k, d: d.d });
  }
  function adapter(what, arg) {
    var A = S && ADAPTERS[GAMES[S.g].kind];
    if (A && A[what]) { try { A[what](arg, S); } catch (e) { console.warn('[together] ' + what, e); } }
  }

  // ---- the cabinet: a game in the iframe (js/shared/together-frame.js on the other side) -----------------------------
  function post(msg) { if (typeof BridgeCabinetModal !== 'undefined' && BridgeCabinetModal.post) BridgeCabinetModal.post(Object.assign({ sid: S && S.sid }, msg)); }
  function fromFrame(d) {
    if (!S || (d.sid && d.sid !== S.sid)) return;
    var k = d.type.slice('bridge-together-'.length);
    if (k === 'ready') { S.ready.me = true; N().send('g-ready', { sid: S.sid }, S.peer); maybeStart(); }
    else if (k === 'score') report(d.s, !!d.done, d.label);
    else if (k === 'result') result(d.outcome);
    else if (k === 'data') send(d.k, d.d);
  }
  function onReady(d, from) { if (!heard(d) || S.peer !== from) return; S.ready.them = true; maybeStart(); }
  function maybeStart() {
    if (!S || S.started || !S.ready.me || !S.ready.them) return;
    S.started = true;
    post({ type: 'bridge-together-start' });
    paintBar();
  }
  // the cabinet closed under a game: what you'd scored is your score; a game of chess is given up
  function frameClosed() {
    if (!S || S.state !== 'playing' || S.opening || GAMES[S.g].kind !== 'cabinet') return;
    if (MODES[S.mode].result) forfeit();
    else done(S.mine.s, S.mine.label);
    if (S && S.state === 'playing') toast('Play together', 'Waiting for ' + S.peerName, 'You\'ll hear how it went');
  }
  // the bar over the cabinet: the two of you, live
  function paintBar() {
    if (!S || GAMES[S.g].kind !== 'cabinet' || typeof BridgeCabinetModal === 'undefined' || !BridgeCabinetModal.setVersus) return;
    var m = MODES[S.mode], a = S.mine, b = S.theirs, who = esc(S.peerName), html;
    var lab = function (x) { return esc(x.label || num(x.s)); };
    if (S.verdict) html = '<span class="cm-vs-head ' + esc(S.verdict.outcome) + '">' + esc(S.verdict.head) + '</span>' + (S.verdict.paid ? '<span class="cm-vs-pot">+' + S.verdict.paid + '</span>' : '');
    else if (!S.started) html = '<span class="cm-vs-wait">Waiting for ' + who + '…</span>';
    else if (m.coop && S.target > 1) html = '<span class="cm-vs-lab">Together</span><b>' + num(a.s + b.s) + '</b><span class="cm-vs-of">/ ' + num(S.target) + '</span>' +
      '<span class="cm-vs-sub">you ' + lab(a) + ' · ' + who + ' ' + lab(b) + (b.done ? ' ✓' : '') + '</span>';
    else if (m.coop) html = '<span class="cm-vs-lab">With ' + who + '</span>' + (b.label ? '<span class="cm-vs-sub">' + esc(b.label) + '</span>' : '');
    else if (m.result) html = '<span class="cm-vs-lab">vs ' + who + '</span>' + (a.label ? '<span class="cm-vs-sub">' + esc(a.label) + '</span>' : '');
    else html = '<span class="cm-vs-lab">You</span><b class="' + (a.s >= b.s ? 'lead' : '') + '">' + lab(a) + '</b><span class="cm-vs-sep">·</span>' +
      '<span class="cm-vs-lab">' + who + '</span><b class="' + (b.s > a.s ? 'lead' : '') + '">' + lab(b) + '</b>' + (b.done ? '<span class="cm-vs-sub">done</span>' : '');
    if (S.wager && !S.verdict) html += '<span class="cm-vs-pot">' + (m.coop ? S.wager + ' each' : 'pot ' + S.pot) + '</span>';
    BridgeCabinetModal.setVersus(html);
  }

  // ---- the kinds of game ---------------------------------------------------------------------------------------------
  var ADAPTERS = {
    cabinet: {
      start: function (s) {
        var G = GAMES[s.g], url = (s.opts && s.opts.url && s.g !== 'chess' ? s.opts.url : G.url);
        var cfg = { sid: s.sid, g: s.g, mode: s.mode, seed: s.seed, me: myName(), vs: s.peerName, host: s.host, side: s.host ? 'w' : 'b',
                    wager: s.wager, pot: s.pot, target: s.target };
        url += (url.indexOf('?') < 0 ? '?' : '&') + 'together=' + encodeURIComponent(JSON.stringify(cfg));
        if (typeof BridgeCabinetModal !== 'undefined') {
          s.opening = true;
          if (BridgeCabinetModal.isOpen()) BridgeCabinetModal.hide();
          s.opening = false;
          BridgeCabinetModal.show({ url: url, title: G.title.toUpperCase(), gameKey: s.g, together: true });
        }
        paintBar();
        // never started (a game that didn't load): call it off
        var sid = s.sid;
        setTimeout(function () {
          if (S && S.sid === sid && S.state === 'playing' && !S.started) { N().send('g-off', { sid: sid, why: 'the game didn\'t start' }, S.peer); onOff({ sid: sid, why: 'the game didn\'t start' }); }
        }, 90000);
      },
      peer: function (t) { post({ type: 'bridge-together-peer', s: t.s, done: t.done, label: t.label }); },
      verdict: function (v) {
        // the score's already on the game-over panel against each other; co-op, the total is the news
        post({ type: 'bridge-together-verdict', head: v.head, text: MODES[S.mode].coop || MODES[S.mode].result ? v.line : v.money, outcome: v.outcome, paid: v.paid });
        if (typeof BridgeCabinetModal === 'undefined' || !BridgeCabinetModal.isOpen()) showVerdict(v);
      },
      gone: function () { post({ type: 'bridge-together-gone' }); }
    },
    dice: {
      start: function (s) { if (typeof BridgeLodge !== 'undefined') BridgeLodge.together(s); },
      verdict: function (v) { if (typeof BridgeLodge !== 'undefined' && BridgeLodge.verdict) BridgeLodge.verdict(v); else showVerdict(v); },
      gone: function () { if (typeof BridgeLodge !== 'undefined' && BridgeLodge.gone) BridgeLodge.gone(); }
    },
    dance: {
      start: function (s) { if (typeof BridgeDance !== 'undefined') BridgeDance.together(s); },
      peer: function (t) { if (typeof BridgeDance !== 'undefined' && BridgeDance.peer) BridgeDance.peer(t); },
      verdict: function (v) { showVerdict(v); },
      gone: function () { if (typeof BridgeDance !== 'undefined' && BridgeDance.gone) BridgeDance.gone(); }
    },
    pachinko: {
      start: function (s) { if (typeof BridgePachinko !== 'undefined') BridgePachinko.together(s); },
      peer: function (t) { if (typeof BridgePachinko !== 'undefined' && BridgePachinko.peer) BridgePachinko.peer(t); },
      verdict: function (v) { if (typeof BridgePachinko !== 'undefined' && BridgePachinko.verdict && BridgePachinko.verdict(v)) return; showVerdict(v); },
      gone: function () { if (typeof BridgePachinko !== 'undefined' && BridgePachinko.gone) BridgePachinko.gone(); }
    },
    splice: {
      start: function (s) { if (typeof BridgeSplice !== 'undefined') BridgeSplice.together(s); },
      peer: function (t) { if (typeof BridgeSplice !== 'undefined' && BridgeSplice.peer) BridgeSplice.peer(t); },
      verdict: function (v) { if (typeof BridgeSplice !== 'undefined' && BridgeSplice.verdict && BridgeSplice.verdict(v)) return; showVerdict(v); },
      gone: function () { if (typeof BridgeSplice !== 'undefined' && BridgeSplice.gone) BridgeSplice.gone(); }
    }
  };

  // ---- who's playing what (presence), shown over their heads ------------------------------------------------------------
  var lastPlay = '';
  function presence() {
    var n = N();
    if (!n || !n.set) return;
    var play = S && (S.state === 'playing' || S.state === 'settled') ? { g: S.g, t: titleOf(S), m: modeName(S.g, S.mode), vs: S.peerName, coop: !!MODES[S.mode].coop,
      s: S.mine.label || num(S.mine.s), o: S.theirs.label || num(S.theirs.s), v: S.verdict ? S.verdict.head : '' } : null;
    var found = myFound(), json = JSON.stringify(play) + '|' + found.join(',');
    if (json === lastPlay) return;
    lastPlay = json;
    n.set({ play: play, found: found });
  }
  var layer = null, badges = {}, watching = null;
  function badgeLoop() {
    requestAnimationFrame(badgeLoop);
    var n = N(), others = M() && M().others(), sv = inWorld() && BridgeWorld.getScreenView ? BridgeWorld.getScreenView() : null;
    if (!n || !others || !sv || !sv.ts) { if (layer) layer.style.display = 'none'; return; }
    if (!layer) { layer = document.createElement('div'); layer.id = 'tg-layer'; document.body.appendChild(layer); }
    layer.style.display = '';
    var k = sv.ts / 32, live = {};
    Object.keys(others).forEach(function (id) {
      var p = n.peer(id), a = others[id];
      if (!p || !p.play) return;
      live[id] = true;
      var b = badges[id];
      if (!b) { b = badges[id] = document.createElement('div'); b.className = 'tg-badge'; layer.appendChild(b); }
      var pl = p.play, html = '<span class="tg-ico">' + (pl.coop ? '♥' : '▶') + '</span>' + esc(pl.t) + ' <i>' + (pl.v ? esc(pl.v) : (pl.coop ? 'with ' : 'vs ') + esc(pl.vs) + ' · ' + esc(pl.s) + (pl.coop ? '' : '–' + esc(pl.o))) + '</i>';
      if (b.getAttribute('data-h') !== html) { b.innerHTML = html; b.setAttribute('data-h', html); }
      var cx = sv.offX + (a.x + 0.5) * sv.ts, top = sv.offY + (a.y + 1 - 3 / 32) * sv.ts - 46 * k - 22;
      b.style.transform = 'translate3d(' + Math.round(cx) + 'px,' + Math.round(top) + 'px,0) translate(-50%,-100%)';
    });
    Object.keys(badges).forEach(function (id) { if (!live[id]) { badges[id].remove(); delete badges[id]; } });
    if (watching) paintWatch();
  }
  // watching someone play: a small card with the live score, until they stop or you close it
  function watch(id) {
    watching = id;
    var el = document.getElementById('tg-watch');
    if (!el) {
      el = document.createElement('div'); el.id = 'tg-watch';
      el.innerHTML = '<button class="tg-wx" aria-label="Stop watching">×</button><div class="tg-wk"></div><div class="tg-wt"></div><div class="tg-ws"></div>';
      document.body.appendChild(el);
      el.querySelector('.tg-wx').addEventListener('click', function () { watching = null; el.classList.remove('on'); });
    }
    el.classList.add('on');
    paintWatch();
  }
  function paintWatch() {
    var el = document.getElementById('tg-watch'), p = N() && N().peer(watching);
    if (!el) return;
    if (!p || !p.play) { if (el.classList.contains('on')) { el.classList.remove('on'); watching = null; } return; }
    var pl = p.play, h = esc(cap(p.name)) + (pl.coop ? ' & ' : ' vs ') + esc(pl.vs) + '|' + esc(pl.t) + ' · ' + esc(pl.m) + '|' +
      (pl.v ? esc(pl.v) : pl.coop ? esc(cap(p.name)) + ' ' + esc(pl.s) + ' · ' + esc(pl.vs) + ' ' + esc(pl.o) : '<b>' + esc(pl.s) + '</b> – <b>' + esc(pl.o) + '</b>');
    if (el.getAttribute('data-h') === h) return;
    el.setAttribute('data-h', h);
    var parts = h.split('|');
    el.querySelector('.tg-wk').innerHTML = parts[1];
    el.querySelector('.tg-wt').innerHTML = parts[0];
    el.querySelector('.tg-ws').innerHTML = parts[2];
  }

  // ---- wiring ---------------------------------------------------------------------------------------------------------
  function wire() {
    var n = N();
    if (!n) return;
    n.on('g-ask', onAsk);
    n.on('g-yes', onYes);
    n.on('g-no', onNo);
    n.on('g-go', onGo);
    n.on('g-off', onOff);
    n.on('g-ready', onReady);
    n.on('g-score', onScore);
    n.on('g-data', onData);
    n.on('g-quit', onQuit);
    n.on('g-beat', function (d) { heard(d); });
    n.on('leave', function (p, id) { if (S && S.peer === id && S.state === 'asking') { clearTimeout(S.askTimer); S = null; presence(); } });
    n.on('up', function () { lastPlay = ''; setTimeout(presence, 1500); });
  }
  if (typeof BridgeMulti !== 'undefined') {
    BridgeMulti.addMenu(function (id, p, remote) {
      if (!p) return [];
      var who = cap(p.name);
      if (S && S.peer === id && S.state === 'playing') return [{ label: 'Stop playing', act: function () { forfeit(); } }];
      var out = [];
      if (p.play) out.push({ label: 'Watch ' + who + ' play ' + p.play.t, act: function () { watch(id); } });
      out.push({ label: p.play ? 'Play a game… (' + who + '\'s busy)' : 'Play a game…', disabled: !!p.play || !!S, act: function () { pick(id); return false; } });
      return out;
    });
  }
  // a stake still on the table when the page last closed comes back
  (function () {
    var d = load();
    if (d.stake && d.stake.n > 0) {
      var st = d.stake;
      setTimeout(function () {
        var now = load();
        if (!now.stake || now.stake.sid !== st.sid || (S && S.sid === st.sid)) return;
        delete now.stake; save(now);
        pay(st.n, 'together:refund');
        toast('Play together', 'Your stake came back', st.n + ' coins from a game that never finished');
      }, 4000);
    }
  })();
  wire();
  setInterval(presence, 3000);
  requestAnimationFrame(badgeLoop);

  return { pick: pick, ask: ask, session: function () { return S; }, score: score, done: done, result: result, forfeit: forfeit,
           send: send, on: on, fromFrame: fromFrame, frameClosed: frameClosed, showVerdict: showVerdict, myName: myName,
           GAMES: GAMES, MODES: MODES, modeName: modeName, gamesHere: gamesHere, watch: watch, _record: record };
})();
