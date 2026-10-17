/**
 * BridgeEights — cards in the Wayfarer's mess after supper: a hand of Eights with whoever's sat at the card table.
 *
 * Beck: "cards in the mess at night (a game you can sit in on)". From 19:00 ship's time (BridgeWayfarer.clock) three of
 * the crew are round the card table (js/aboard.js: by turns; Dorrie sits in when there are fewer), and the near chair is
 * pushed back for you. Sit in (the card table, js/galley.js) and you're dealt in with whoever's there now.
 *
 * Eights, as sailors play it: five cards each (seven with two at the table), the rest the stock, one turned up to start
 * the pile. On your turn lay a card that matches the top of the pile in suit or rank, or any eight — an eight lets you
 * call the suit. Can't go? Draw one, and lay it if it'll go; else the turn passes. First to lay down their last card
 * takes the hand. The stake's a matchstick's worth: five coins in each (the house puts in the crew's), the winner takes
 * the pot — or play for matches. The crew play to their own habits (`STYLE`: Bram hoards his eights, Pip throws the
 * high cards first, Corra watches what you can't follow) and say so as they go.
 *
 * Seeded by the hand's number and the ship's day, so a hand's cards are the same if you replay it. The table panel is
 * drawn in code (cards a few pixels at a time, `card`), keys: ←/→ choose, Enter lay, D draw, Esc leave.
 *
 *   BridgeEights.sitIn(inter)   from the card table
 *   BridgeEights._g()           the hand in play (tests); ._deal(players, seed), ._play(i), ._draw(), ._ai()
 */
var BridgeEights = (function () {
  var SUITS = ['s', 'h', 'd', 'c'], RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var STAKE = 5;
  var NAMES = { regular: 'Bram', traveller: 'Ansel', corra: 'Corra', okafor: 'Okafor', pip: 'Pip', dorrie: 'Dorrie' };
  // how each plays: hold eights to the last (hoard), lay the high ones first (high), go for the suit you're short of (spite)
  var STYLE = { regular: { hoard: 1 }, pip: { high: 1 }, corra: { spite: 1 }, okafor: { hoard: 0.5, high: 0.5 }, traveller: {}, dorrie: { hoard: 0.5 } };
  var SAY = {
    eight: { regular: 'AN EIGHT, AND HEARTS IT IS.', pip: 'EIGHT! I PICK...', corra: 'EIGHT. TRY FOLLOWING THAT.', okafor: 'EIGHT. CHANGE OF HEADING.', traveller: 'AN EIGHT, AND THE SUIT SHALL BE', dorrie: 'EIGHT, LOVE.' },
    draw: { regular: 'NOTHING FOR IT.', pip: 'AW, COME ON.', corra: 'HM.', okafor: 'DRAWING.', traveller: 'THE SEA PROVIDES. EVENTUALLY.', dorrie: 'ONE FROM THE PILE THEN.' },
    last: { regular: 'LAST CARD, MIND.', pip: 'LAST CARD! LAST CARD!', corra: 'ONE LEFT.', okafor: 'ONE TO GO.', traveller: 'AND ONE.', dorrie: 'LAST ONE, DEARS.' },
    win: { regular: 'THIRTY YEARS AND I STILL HAVE IT.', pip: 'I WON! DID EVERYONE SEE?', corra: 'MINE.', okafor: 'CLEAN RUN.', traveller: 'A FAIR TRADE.', dorrie: 'THAT\'S THE WASHING-UP SORTED, THEN.' },
    lose: { regular: 'WELL PLAYED, CAPTAIN.', pip: 'NEXT ONE\'S MINE.', corra: 'LUCKY.', okafor: 'NICELY DONE.', traveller: 'YOU\'LL BUY THE NEXT ROUND?', dorrie: 'GO ON THEN, CLEVER CLOGS.' }
  };
  function has(n) { return typeof window[n] !== 'undefined'; }
  function sfx(n) { if (has('BridgeAudio') && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }
  function suitOf(c) { return c.slice(-1); }
  function rankOf(c) { return c.slice(0, -1); }
  function mod8(c) { return rankOf(c) === '8'; }

  var g = null, el = null, sel = 0, seq = 0;

  // ---- the hand ---------------------------------------------------------------------------------------------------
  /** Deal a hand: players [{ id, name, ai }], you first. */
  function deal(players, seed) {
    var r = rng(seed), deck = [];
    SUITS.forEach(function (s) { RANKS.forEach(function (k) { deck.push(k + s); }); });
    for (var i = deck.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
    var n = players.length <= 2 ? 7 : 5;
    players.forEach(function (p) { p.hand = deck.splice(0, n); });
    var up = deck.findIndex(function (c) { return !mod8(c); });
    var pile = deck.splice(up, 1);
    g = { players: players, stock: deck, pile: pile, suit: suitOf(pile[0]), turn: 0, drew: false, over: null, log: [], r: r, seed: seed,
          stake: g ? g.stake : STAKE, pot: 0, paid: false };
    say(null, players.length > 2 ? 'FIVE CARDS EACH. ' + cardName(pile[0]).toUpperCase() + ' TURNED UP.' : 'SEVEN EACH, HEADS UP. ' + cardName(pile[0]).toUpperCase() + ' TURNED UP.');
    return g;
  }
  function cardName(c) {
    var R = { A: 'ace', J: 'jack', Q: 'queen', K: 'king' }, S = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' };
    return (R[rankOf(c)] || rankOf(c)) + ' of ' + S[suitOf(c)];
  }
  function top() { return g.pile[g.pile.length - 1]; }
  function fits(c) { return mod8(c) || suitOf(c) === g.suit || rankOf(c) === rankOf(top()); }
  function say(who, text) { g.log.push({ who: who, text: text }); if (g.log.length > 5) g.log.shift(); }
  function draw1() {
    if (!g.stock.length) {                          // shuffle the pile back under, but for its top card
      var keep = g.pile.pop();
      g.stock = g.pile; g.pile = [keep];
      for (var i = g.stock.length - 1; i > 0; i--) { var j = Math.floor(g.r() * (i + 1)); var t = g.stock[i]; g.stock[i] = g.stock[j]; g.stock[j] = t; }
    }
    return g.stock.pop() || null;
  }
  function lay(pi, card, suit) {
    var P = g.players[pi];
    P.hand.splice(P.hand.indexOf(card), 1);
    g.pile.push(card);
    g.suit = mod8(card) ? (suit || suitOf(card)) : suitOf(card);
    sfx('card');
    if (mod8(card)) say(P, (P.ai ? (SAY.eight[P.id] || 'EIGHT.') : 'AN EIGHT.') + ' ' + { s: 'SPADES', h: 'HEARTS', d: 'DIAMONDS', c: 'CLUBS' }[g.suit] + '.');
    else if (P.hand.length === 1 && P.ai) say(P, SAY.last[P.id] || 'LAST CARD.');
    if (!P.hand.length) return finish(pi);
    next();
  }
  function next() { g.turn = (g.turn + 1) % g.players.length; g.drew = false; }
  function finish(pi) {
    var P = g.players[pi];
    g.over = { winner: pi };
    if (P.ai) say(P, SAY.win[P.id] || 'MINE.');
    else g.players.forEach(function (q) { if (q.ai) { say(q, SAY.lose[q.id] || 'WELL PLAYED.'); } });
    settle();
  }

  // ---- the crew's play --------------------------------------------------------------------------------------------
  function aiTurn() {
    var P = g.players[g.turn], st = STYLE[P.id] || {};
    var can = P.hand.filter(fits);
    if (!can.length && !g.drew) {
      var c = draw1();
      if (c) { P.hand.push(c); say(P, SAY.draw[P.id] || 'DRAWS.'); }
      g.drew = true;
      if (c && fits(c)) { lay(g.turn, c, bestSuit(P)); return; }
      next(); return;
    }
    if (!can.length) { next(); return; }
    var nextHand = g.players[(g.turn + 1) % g.players.length].hand.length;
    var score = function (c) {
      var s = 0, v = RANKS.indexOf(rankOf(c));
      if (mod8(c)) s -= (st.hoard || 0) * 10 + 3;                      // keep the eights for last
      if (st.high) s += v * 0.6;
      if (st.spite && nextHand <= 2 && suitOf(c) !== g.suit) s += 4;   // change the suit on someone close to out
      s += P.hand.filter(function (x) { return suitOf(x) === suitOf(c); }).length * 0.5;   // stay in a long suit
      return s + g.r() * 0.3;
    };
    can.sort(function (a, b) { return score(b) - score(a); });
    lay(g.turn, can[0], bestSuit(P, can[0]));
  }
  function bestSuit(P, playing) {
    var n = { s: 0, h: 0, d: 0, c: 0 };
    P.hand.forEach(function (c) { if (c !== playing && !mod8(c)) n[suitOf(c)]++; });
    return SUITS.slice().sort(function (a, b) { return n[b] - n[a]; })[0];
  }

  // ---- the coins --------------------------------------------------------------------------------------------------
  function settle() {
    if (g.paid || !g.stake) return;
    g.paid = true;
    var you = g.over && g.over.winner === 0;
    if (you && has('BridgeProgression') && BridgeProgression.awardCoins) BridgeProgression.awardCoins(g.pot, 'cards:eights');
  }
  function ante() {
    g.pot = 0;
    if (!g.stake) return Promise.resolve(true);
    if (!has('BridgeProgression') || !BridgeProgression.wagerCoins) return Promise.resolve(false);
    return BridgeProgression.wagerCoins(g.stake, 'cards:eights').then(function (res) {
      if (!res || !res.ok) return false;
      g.pot = g.stake * g.players.length;
      return true;
    });
  }

  // ---- the table --------------------------------------------------------------------------------------------------
  function sitIn(inter) {
    var c = has('BridgeWayfarer') ? BridgeWayfarer.clock() : { h: 20 };
    var round = has('BridgeAboard') && BridgeAboard.atCards ? BridgeAboard.atCards() : [];
    if (!round.length) {
      var when = c.h >= 19 && c.h < 23 ? 'NOBODY\'S SAT DOWN YET; THEY\'RE STILL CLEARING SUPPER.' : 'THE CARDS COME OUT AFTER SUPPER, ABOUT 19:00 SHIP\'S TIME' +
        (has('BridgeWayfarer') ? ' - IN ' + BridgeWayfarer.hm(BridgeWayfarer.until(19)).toUpperCase() : '') + '.';
      BridgeInteractions.say('CARD TABLE', 'GREEN BAIZE, WORN PALE WHERE THE ELBOWS GO. A TIN OF MATCHES, A PACK WITH A RED BACK.\n\n' + when +
        (has('BridgeCrew') && !BridgeCrew.list().length ? '\n\n(IT TAKES A CREW TO MAKE A TABLE.)' : ''));
      return;
    }
    var names = round.map(function (id) { return NAMES[id] || (has('BridgeAboard') ? BridgeAboard.label(id) : id); });
    BridgeInteractions.choose({ title: 'Eights in the mess', text: names.join(', ').toUpperCase() + (names.length === 1 ? ' IS' : ' ARE') +
        ' AT THE CARD TABLE. "PULL UP A CHAIR. EIGHTS: MATCH THE SUIT OR THE NUMBER, EIGHTS ARE WILD, FIRST OUT TAKES THE POT."',
      rows: [{ label: 'Sit in for coins', sub: STAKE + ' coins in each, the winner takes the pot', note: STAKE + ' coins', pick: function () { start(round, STAKE); } },
             { label: 'Play for matches', sub: 'just the game', pick: function () { start(round, 0); } }],
      closeLabel: 'Not tonight' });
  }
  function start(round, stake) {
    var players = [{ id: 'you', name: 'You', ai: false }].concat(round.map(function (id) { return { id: id, name: NAMES[id] || id, ai: true }; }));
    var day = has('BridgeWayfarer') ? BridgeWayfarer.clock().day : 0;
    seq++;
    g = null;
    deal(players, (day * 131 + seq * 977 + Date.now() % 1000) >>> 0);
    g.stake = stake;
    ante().then(function (ok) {
      if (!ok) { g = null; BridgeInteractions.say('CARD TABLE', 'YOU HAVEN\'T THE ' + stake + ' COINS FOR THE POT. PLAY FOR MATCHES?'); return; }
      seat();
      open();
    });
  }
  // you sit in the chair pushed back for you, facing the table (the world JSON's card table: tiles 17,8 and the chair at 17,9)
  function seat() {
    if (has('BridgeCharacter') && BridgeCharacter.sit && has('BridgeWorld') && BridgeWorld.getWorldId() === 'ship-galley') {
      BridgeCharacter.sit({ x: 17.5, y: 9.75, facing: 'up' });
      if (has('BridgeAudio')) BridgeAudio.sfx('sit');
    }
  }

  // ---- drawing the cards: pixel art a few pixels at a time ---------------------------------------------------------
  var GLYPH = {
    s: ['..#..', '.###.', '#####', '#####', '..#..'], h: ['.#.#.', '#####', '#####', '.###.', '..#..'],
    d: ['..#..', '.###.', '#####', '.###.', '..#..'], c: ['.###.', '.###.', '#####', '#####', '..#..']
  };
  var FONT = {
    A: ['.#.', '#.#', '###', '#.#', '#.#'], J: ['..#', '..#', '..#', '#.#', '.#.'], Q: ['###', '#.#', '#.#', '##.', '.##'], K: ['#.#', '##.', '#..', '##.', '#.#'],
    '1': ['.#', '##', '.#', '.#', '.#'], '0': ['###', '#.#', '#.#', '#.#', '###'], '2': ['##.', '..#', '.#.', '#..', '###'], '3': ['##.', '..#', '.#.', '..#', '##.'],
    '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '##.', '..#', '##.'], '6': ['.##', '#..', '###', '#.#', '###'], '7': ['###', '..#', '.#.', '.#.', '.#.'],
    '8': ['###', '#.#', '###', '#.#', '###'], '9': ['###', '#.#', '###', '..#', '##.']
  };
  function blit(x, rows, ox, oy, col) {
    x.fillStyle = col;
    rows.forEach(function (row, j) { for (var i = 0; i < row.length; i++) if (row[i] === '#') x.fillRect(ox + i, oy + j, 1, 1); });
  }
  var CW = 20, CH = 28;
  /** A card face (or its back) on a canvas CW × CH native px. */
  function card(c, opts) {
    opts = opts || {};
    var cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
    var x = cv.getContext('2d');
    x.fillStyle = '#1a1210'; x.fillRect(1, 0, CW - 2, CH); x.fillRect(0, 1, CW, CH - 2);
    if (!c) {                                        // the back: red with a gold anchor-ish lozenge
      x.fillStyle = '#9a2222'; x.fillRect(1, 1, CW - 2, CH - 2);
      x.fillStyle = '#b83a2a';
      for (var yy = 2; yy < CH - 2; yy += 2) for (var xx = 2 + (yy / 2) % 2; xx < CW - 2; xx += 2) x.fillRect(xx, yy, 1, 1);
      blit(x, ['..#..', '.###.', '#####', '.###.', '..#..'], 8, 12, '#e0b040');
      return cv;
    }
    x.fillStyle = opts.dim ? '#bcb3a0' : '#f2ecdc'; x.fillRect(1, 1, CW - 2, CH - 2);
    x.fillStyle = opts.dim ? '#a8a08c' : '#ddd4bc'; x.fillRect(1, CH - 2, CW - 2, 1);
    var red = suitOf(c) === 'h' || suitOf(c) === 'd', col = red ? '#c02a2a' : '#1e1e2a';
    var rk = rankOf(c), ox = 2;
    rk.split('').forEach(function (ch) { blit(x, FONT[ch], ox, 2, col); ox += FONT[ch][0].length + 1; });
    blit(x, GLYPH[suitOf(c)], 2, 8, col);
    blit(x, GLYPH[suitOf(c)], CW - 7, CH - 8, col);
    if (mod8(c)) { x.fillStyle = '#e0b040'; x.fillRect(CW - 5, 2, 3, 3); x.fillStyle = '#fff6c8'; x.fillRect(CW - 4, 3, 1, 1); }   // a gold pip: wild
    else { x.globalAlpha = 0.25; blit(x, GLYPH[suitOf(c)], 8, 12, col); x.globalAlpha = 1; }
    return cv;
  }

  // ---- the panel --------------------------------------------------------------------------------------------------
  function open() {
    if (!el) {
      el = document.createElement('div');
      el.id = 'eights';
      el.innerHTML = '<div class="e8-panel">' +
        '<div class="e8-head"><span class="e8-title">Eights</span><span class="e8-pot"></span>' +
        '<button class="qj-close e8-close" aria-label="Leave the table"><span class="ip-key">Esc</span></button></div>' +
        '<div class="e8-rivals"></div><div class="e8-table"><div class="e8-stock"></div><div class="e8-pile"></div><div class="e8-suit"></div></div>' +
        '<div class="e8-log"></div><div class="e8-you"><span class="e8-who">Your hand</span><div class="e8-hand"></div></div>' +
        '<div class="e8-controls"><button data-a="draw">Draw</button><button data-a="pass">Pass</button>' +
        '<span class="e8-suits">' + SUITS.map(function (s) { return '<button data-s="' + s + '"></button>'; }).join('') + '</span>' +
        '<button data-a="again">Another hand</button><button data-a="leave">Leave the table</button></div>' +
        '<div class="e8-help">Match the suit or the number; eights are wild. <span class="e8-keys">←/→ choose · Enter lay · D draw · Esc leave</span></div></div>';
      document.body.appendChild(el);
      el.querySelectorAll('.e8-suits button').forEach(function (b) { var cv = document.createElement('canvas'); cv.width = 7; cv.height = 7; blit(cv.getContext('2d'), GLYPH[b.dataset.s], 1, 1, /[hd]/.test(b.dataset.s) ? '#c02a2a' : '#1e1e2a'); b.appendChild(cv); });
      el.addEventListener('click', function (e) {
        var b = e.target.closest('button,canvas.e8-card');
        if (!b || !g) return;
        if (b.classList.contains('e8-close')) return close();
        if (b.dataset.i != null) { sel = +b.dataset.i; return tryLay(); }
        if (b.dataset.s) return pickSuit(b.dataset.s);
        act(b.dataset.a);
      });
    }
    el.classList.add('visible');
    sel = 0;
    if (has('BridgeControls')) BridgeControls.disable();
    document.addEventListener('keydown', onKey, true);
    paint();
    loop();
  }
  function close() {
    if (el) el.classList.remove('visible');
    document.removeEventListener('keydown', onKey, true);
    if (has('BridgeControls')) BridgeControls.enable();
    if (has('BridgeCharacter') && BridgeCharacter.stand) BridgeCharacter.stand();
    clearTimeout(aiT);
    if (g && !g.over && g.stake) say(null, 'YOU LEAVE YOUR CARDS FACE DOWN. THE POT STAYS ON THE TABLE.');
    g = null;
  }
  var aiT = null, choosing = null;
  function loop() {
    clearTimeout(aiT);
    if (!g || g.over) return;
    if (g.players[g.turn].ai) aiT = setTimeout(function () { if (g && !g.over && g.players[g.turn].ai) { aiTurn(); paint(); loop(); } }, 900);
  }
  function act(a) {
    if (a === 'leave') return close();
    if (a === 'again') { if (!g || !g.over) return; var round = g.players.filter(function (p) { return p.ai; }).map(function (p) { return p.id; }); var st = g.stake; return startAgain(round, st); }
    if (!g || g.over || g.turn !== 0 || choosing) return;
    if (a === 'draw' && !g.drew) {
      var c = draw1();
      if (c) { g.players[0].hand.push(c); say(g.players[0], 'YOU DRAW.'); sel = g.players[0].hand.length - 1; }
      g.drew = true;
      if (!g.players[0].hand.some(fits)) { say(g.players[0], 'NOTHING GOES. YOU PASS.'); next(); }
    } else if (a === 'pass' && g.drew) { next(); }
    paint(); loop();
  }
  function startAgain(round, stake) {
    var still = has('BridgeAboard') && BridgeAboard.atCards ? BridgeAboard.atCards() : round;
    if (!still.length) { close(); BridgeInteractions.say('CARD TABLE', 'THE OTHERS HAVE TURNED IN. THE CARDS GO BACK IN THEIR TIN.'); return; }
    start(still, stake);
  }
  function tryLay() {
    if (!g || g.over || g.turn !== 0 || choosing) return;
    var c = g.players[0].hand[sel];
    if (!c || !fits(c)) { el.querySelector('.e8-hand').classList.add('nope'); setTimeout(function () { if (el) el.querySelector('.e8-hand').classList.remove('nope'); }, 300); return; }
    if (mod8(c)) { choosing = c; paint(); return; }
    lay(0, c); paint(); loop();
  }
  function pickSuit(s) {
    if (!choosing) return;
    var c = choosing; choosing = null;
    lay(0, c, s); paint(); loop();
  }
  function onKey(e) {
    if (!g) return;
    var k = e.key;
    e.stopPropagation();
    if (k === 'Escape') { e.preventDefault(); if (choosing) { choosing = null; paint(); } else close(); return; }
    if (choosing) { var m = { '1': 's', '2': 'h', '3': 'd', '4': 'c', s: 's', h: 'h', c: 'c' }; if (m[k]) { e.preventDefault(); pickSuit(m[k]); } return; }
    if (k === 'ArrowLeft') { e.preventDefault(); sel = Math.max(0, sel - 1); paint(); }
    else if (k === 'ArrowRight') { e.preventDefault(); sel = Math.min(g.players[0].hand.length - 1, sel + 1); paint(); }
    else if (k === 'Enter' || k === ' ' || k === 'e' || k === 'E') { e.preventDefault(); if (g.over) act('again'); else tryLay(); }
    else if (k === 'd' || k === 'D') { e.preventDefault(); act(g.drew ? 'pass' : 'draw'); }
  }
  function paint() {
    if (!el || !g) return;
    var you = g.players[0], yourTurn = g.turn === 0 && !g.over;
    el.querySelector('.e8-pot').textContent = g.stake ? 'POT ' + g.pot + ' COINS' : 'FOR MATCHES';
    var R = el.querySelector('.e8-rivals'); R.innerHTML = '';
    g.players.forEach(function (p, i) {
      if (!p.ai) return;
      var box = document.createElement('div');
      box.className = 'e8-rival' + (g.turn === i && !g.over ? ' turn' : '') + (g.over && g.over.winner === i ? ' won' : '');
      var face = document.createElement('canvas'); face.className = 'e8-face'; face.width = face.height = 32;
      if (has('BridgeLook') && BridgeLook.npcFace) BridgeLook.npcFace(face, (has('BridgeAboard') ? BridgeAboard.sheets(p.id)[0] : null) || 'npc-dorrie', {});
      box.appendChild(face);
      var w = document.createElement('div'); w.className = 'e8-who'; w.textContent = p.name + ' · ' + p.hand.length; box.appendChild(w);
      var fan = document.createElement('div'); fan.className = 'e8-fan';
      for (var j = 0; j < Math.min(p.hand.length, 9); j++) { var cb = card(null); cb.className = 'e8-back'; fan.appendChild(cb); }
      box.appendChild(fan);
      R.appendChild(box);
    });
    var stock = el.querySelector('.e8-stock'); stock.innerHTML = '';
    var sc = card(null); sc.className = 'e8-card'; stock.appendChild(sc);
    var sn = document.createElement('span'); sn.textContent = g.stock.length; stock.appendChild(sn);
    var pile = el.querySelector('.e8-pile'); pile.innerHTML = '';
    var pc = card(top()); pc.className = 'e8-card big'; pile.appendChild(pc);
    var suitBox = el.querySelector('.e8-suit'); suitBox.innerHTML = '';
    if (mod8(top())) { var sv = document.createElement('canvas'); sv.width = 7; sv.height = 7; blit(sv.getContext('2d'), GLYPH[g.suit], 1, 1, /[hd]/.test(g.suit) ? '#ff6a5a' : '#e8e8f0'); suitBox.appendChild(document.createTextNode('called ')); suitBox.appendChild(sv); }
    var H = el.querySelector('.e8-hand'); H.innerHTML = '';
    sel = Math.max(0, Math.min(sel, you.hand.length - 1));
    you.hand.forEach(function (c, i) {
      var cv = card(c, { dim: yourTurn && !fits(c) });
      cv.className = 'e8-card' + (i === sel && yourTurn ? ' sel' : '') + (yourTurn && fits(c) ? ' fits' : '');
      cv.dataset.i = i; cv.title = cardName(c);
      H.appendChild(cv);
    });
    el.querySelector('.e8-you').classList.toggle('turn', yourTurn);
    var L = el.querySelector('.e8-log');
    L.innerHTML = g.log.map(function (l, i) { return '<div' + (i === g.log.length - 1 ? ' class="last"' : '') + '>' + (l.who ? '<b>' + (l.who.ai ? l.who.name : 'You') + ':</b> ' : '') + l.text + '</div>'; }).join('') +
      (g.over ? '<div class="last e8-verdict">' + (g.over.winner === 0 ? 'YOU\'RE OUT FIRST.' + (g.stake ? ' THE POT\'S YOURS: +' + g.pot + ' COINS.' : '') : g.players[g.over.winner].name.toUpperCase() + ' TAKES THE HAND.') + '</div>'
              : yourTurn ? '<div class="last">' + (choosing ? 'CALL A SUIT FOR YOUR EIGHT.' : g.drew ? 'LAY WHAT YOU DREW, OR PASS.' : you.hand.some(fits) ? 'YOUR TURN.' : 'NOTHING GOES: DRAW ONE.') + '</div>' : '');
    var C = el.querySelector('.e8-controls');
    C.querySelector('[data-a="draw"]').disabled = !yourTurn || g.drew || !!choosing;
    C.querySelector('[data-a="pass"]').disabled = !yourTurn || !g.drew || !!choosing;
    C.querySelector('.e8-suits').style.display = choosing ? '' : 'none';
    C.querySelector('[data-a="again"]').style.display = g.over ? '' : 'none';
  }

  return { sitIn: sitIn, card: card, _g: function () { return g; }, _deal: deal, _start: start, _fits: function (c) { return fits(c); },
           _lay: function (c, s) { if (g && g.turn === 0) { lay(0, c, s); paint(); loop(); } }, _act: act, _ai: aiTurn, _close: close };
})();
