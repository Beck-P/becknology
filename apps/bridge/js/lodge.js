/**
 * BridgeLodge — the Snowcap Lodge in Fellhaven (hoarfell-lodge).
 *
 * The fire (`lodge_fire`): stand with your back to it — warm for a quarter of
 * an hour, a little energy back. The record board (`lodge_board`): your best
 * times on the pistes and the face, the park's score against Juno's, who
 * you've beaten, the dice. And the round table (`dice`): **Fell Dice** with
 * Old Bryn and Sigrun, for coins.
 *
 * Fell Dice is liar's dice. Everyone puts in the stake (10, 25 or 50) and
 * shakes five dice under a cup; you see only your own. In turn you bid how
 * many of one face (2-6) are under all the cups together — flakes (the 1s)
 * count as anything — each bid higher than the last (more dice, or as many
 * of a higher face), or call the last bid a lie. The cups come up: if the
 * bid was short, the bidder loses a die, else the caller does; the loser
 * starts the next round. The last with dice takes the pot. Bryn is careful
 * and Sigrun bluffs (`RIVALS`: when they call, how often they lie). Playing
 * warms them to you, once a day (BridgeTalk.nudge).
 *
 * localStorage bridge_lodge: {played, won, best, nudged}.
 *   BridgeLodge.use(inter) / .isOpen()
 */
var BridgeLodge = (function () {
  var KEY = 'bridge_lodge', STAKES = [10, 25, 50], DICE = 5;
  var RIVALS = [
    { id: 'bryn', name: 'Old Bryn', call: 0.42, bluff: 0.08,
      win: '"HAH! THE OLD MAN\'S STILL GOT IT." BRYN SWEEPS THE POT INTO HIS HAT.',
      lose: 'BRYN LAUGHS UNTIL HE COUGHS. "WELL PLAYED. WELL PLAYED. NOW BUY ME A CIDER."' },
    { id: 'sigrun', name: 'Sigrun', call: 0.3, bluff: 0.3,
      win: 'SIGRUN STACKS THE COINS IN TOWERS OF TEN. "I TOLD YOU. I CHEAT BETTER."',
      lose: 'SIGRUN STARES AT THE DICE AS IF THEY\'D LIED TO HER PERSONALLY. "AGAIN. TOMORROW."' }
  ];
  var WORDS = ['NO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN'];
  var st = load(), g = null, el = null, timer = 0;

  function load() {
    var d;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    return d || { played: 0, won: 0, best: 0, nudged: 0 };
  }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode */ } }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }
  function say(t, x) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(t, x); }
  function day() { return Math.floor(Date.now() / 86400000); }
  function saved(k) { try { return JSON.parse(localStorage.getItem(k) || 'null') || {}; } catch (e) { return {}; } }
  function fmt(t) { var m = Math.floor(t / 60), x = t - m * 60; return m + ':' + (x < 10 ? '0' : '') + x.toFixed(1); }

  function use(inter) {
    if (inter.type === 'lodge_fire') return fire();
    if (inter.type === 'lodge_board') return board();
    if (inter.type === 'dice') return table();
  }

  // ---- the fire and the board ----------------------------------------------------------------------------------------
  function fire() {
    if (typeof BridgeHoarfell !== 'undefined') BridgeHoarfell.warm(15);
    if (typeof BridgeInventory !== 'undefined') BridgeInventory.restoreEnergy(10);
    sfx('sit');
    say('THE FIRE', 'YOU STAND WITH YOUR BACK TO IT UNTIL YOUR COAT STEAMS AND YOUR FINGERS COME BACK. WARM THROUGH FOR A QUARTER OF AN HOUR.');
  }

  function board() {
    var ski = saved('bridge_ski'), climb = saved('bridge_climb'), lines = [];
    var RUNS = typeof BridgeSki !== 'undefined' && BridgeSki.RUNS ? BridgeSki.RUNS : {};
    lines.push('THE PISTES');
    Object.keys(RUNS).forEach(function (id) {
      var r = (ski.runs || {})[id] || {};
      lines.push('  ' + RUNS[id].name + ' · ' + (r.best ? fmt(r.best) : '—') + ((ski.rival || {})[id] ? ' · BEAT LIV' : ''));
    });
    var P = ski.park || {};
    lines.push('THE PARK · ' + (P.best ? P.best : '—') + ' · JUNO\'S ' + (typeof BridgeSki !== 'undefined' && BridgeSki.JUNO || 7500) + (P.juno ? ' · BEATEN' : ''));
    lines.push('THE FACE');
    [['staircase', 'THE STAIRCASE'], ['icefall', 'THE ICEFALL'], ['hoarspire', 'THE HOARSPIRE'], ['icestep', 'THE ICE STEP']].forEach(function (r) {
      var c = (climb.routes || {})[r[0]] || {};
      if (r[0] === 'icestep' && !c.best && !c.ascents) return;
      lines.push('  ' + r[1] + ' · ' + (c.best ? fmt(c.best) : '—') + ((climb.rival || {})[r[0]] ? ' · BEAT YSOLDE' : ''));
    });
    lines.push('FELL DICE · ' + st.won + ' WON OF ' + st.played + (st.best ? ' · BIGGEST POT ' + st.best : ''));
    var ex = saved('bridge_expedition');
    if (ex.lantern) lines.push('\nPINNED IN THE CORNER, IN METTE\'S HAND: "SOMEONE CAME BACK FROM PAST THE HOARSPIRE WITH A LIGHT."');
    BridgeInteractions.choose({ title: 'The board', text: 'CARDS PINNED IN ROWS, TIMES IN CHALK, NAMES SCRATCHED OUT AND WRITTEN OVER.\n\n' + lines.join('\n'), rows: [], closeLabel: 'Done' });
  }

  // ---- Fell Dice --------------------------------------------------------------------------------------------------------
  function table() {
    BridgeInteractions.choose({
      title: 'Fell Dice',
      text: 'BRYN RATTLES A LEATHER CUP. "FIVE DICE EACH, FLAKES ARE WILD, BID HOW MANY OF A FACE ARE UNDER ALL THE CUPS. CALL A LIAR, LOSE A DIE IF YOU\'RE WRONG. LAST ONE WITH DICE TAKES THE POT."\n\nSIGRUN PUSHES THE STOOL OUT WITH HER BOOT. "WHAT\'S YOUR STAKE?"',
      rows: STAKES.map(function (s) {
        return { label: s + ' coins', sub: 'the pot: ' + s * 3, note: s === 50 ? 'high table' : '', pick: function () { stake(s); } };
      }),
      closeLabel: 'Just watching'
    });
  }
  function stake(s) {
    BridgeProgression.wagerCoins(s, 'fell_dice').then(function (r) {
      if (!r || !r.ok) return say('FELL DICE', 'SIGRUN LOOKS AT YOUR EMPTY HAND, THEN AT YOU. "COINS ON THE TABLE FIRST."');
      start(s);
    });
  }
  function roll(n) { var d = []; for (var i = 0; i < n; i++) d.push(1 + Math.floor(Math.random() * 6)); return d.sort(); }
  function start(s) {
    g = { stake: s, pot: s * 3, players: [{ id: 'you', name: 'You', n: DICE }].concat(RIVALS.map(function (r) { return { id: r.id, name: r.name, n: DICE, ai: r }; })),
          bid: null, turn: Math.floor(Math.random() * 3), log: [], phase: 'bid', sel: { q: 1, f: 2 }, shown: false };
    st.played++; store();
    if (st.nudged !== day() && typeof BridgeTalk !== 'undefined' && BridgeTalk.nudge) {
      st.nudged = day(); store();
      RIVALS.forEach(function (r) { BridgeTalk.nudge(r.id, 0.5, 'sat down to Fell Dice with them at the lodge'); });
    }
    open();
    round(g.turn);
  }
  function alive() { return g.players.filter(function (p) { return p.n > 0; }); }
  function nextFrom(i) { for (var k = 1; k <= 3; k++) { var j = (i + k) % 3; if (g.players[j].n > 0) return j; } return i; }
  function total() { return g.players.reduce(function (a, p) { return a + p.n; }, 0); }
  function higher(a, b) { return !b || a.q > b.q || (a.q === b.q && a.f > b.f); }
  function bidText(b) { return WORDS[b.q] + ' ' + b.f + (b.q === 1 ? '' : 's'); }
  function note(t) { g.log.push(t); if (g.log.length > 4) g.log.shift(); }

  function round(starter) {
    g.players.forEach(function (p) { p.dice = roll(p.n); });
    g.bid = null; g.phase = 'bid'; g.shown = false; g.turn = g.players[starter].n > 0 ? starter : nextFrom(starter);
    g.sel = { q: Math.max(1, Math.round(total() / 3) - 1), f: 2 };
    sfx('dice');
    paint();
    think();
  }
  function think() {
    clearTimeout(timer);
    if (!g || g.phase !== 'bid') return;
    var p = g.players[g.turn];
    if (p.ai) timer = setTimeout(function () { aiMove(p); }, 900 + Math.random() * 700);
  }

  // the odds a bid holds, for someone who knows their own dice: the rest each show the face or a flake one time in three
  function chance(p, b) {
    var known = p.dice.filter(function (d) { return d === b.f || d === 1; }).length, unknown = total() - p.n, need = b.q - known;
    if (need <= 0) return 1;
    if (need > unknown) return 0;
    var pr = 0, c = 1;
    for (var k = 0; k <= unknown; k++) {
      if (k > 0) c = c * (unknown - k + 1) / k;
      if (k >= need) pr += c * Math.pow(1 / 3, k) * Math.pow(2 / 3, unknown - k);
    }
    return pr;
  }
  function aiMove(p) {
    if (!g || g.phase !== 'bid') return;
    var ai = p.ai, cur = g.bid;
    if (cur && cur.by !== g.turn && chance(p, cur) < ai.call) return call(g.turn);
    var opts = [];
    for (var f = 2; f <= 6; f++) {
      var q = !cur ? Math.max(1, Math.floor(p.dice.filter(function (d) { return d === f || d === 1; }).length + (total() - p.n) / 3 - 0.5)) : f > cur.f ? cur.q : cur.q + 1;
      if (q <= total()) opts.push({ q: q, f: f, p: chance(p, { q: q, f: f }) });
    }
    if (!opts.length) return call(g.turn);
    opts.sort(function (a, b) { return b.p - a.p || b.f - a.f; });
    var pick = opts[0];
    if (Math.random() < ai.bluff) {                                  // a bluff: something plausible, not the best
      var ok = opts.filter(function (o) { return o.p > 0.15; });
      if (ok.length) pick = ok[Math.floor(Math.random() * ok.length)];
    }
    if (cur && pick.p < ai.call * 0.8) return call(g.turn);
    if (!bid(g.turn, { q: pick.q, f: pick.f }) && cur) call(g.turn);
  }
  function bid(i, b) {
    if (!g || g.phase !== 'bid' || i !== g.turn || !higher(b, g.bid) || b.q > total() || b.f < 2 || b.f > 6) return false;
    g.bid = { q: b.q, f: b.f, by: i };
    note((i === 0 ? 'You bid ' : g.players[i].name + ' bids ') + bidText(b) + '.');
    g.turn = nextFrom(i);
    if (g.turn === 0) g.sel = { q: b.f < 6 ? b.q : b.q + 1, f: b.f < 6 ? b.f + 1 : 2 };
    sfx('click');
    paint();
    think();
    return true;
  }
  function call(i) {
    if (!g || g.phase !== 'bid' || i !== g.turn || !g.bid || g.bid.by === i) return false;
    clearTimeout(timer);
    var b = g.bid, count = 0;
    g.players.forEach(function (p) { p.dice.forEach(function (d) { if (d === b.f || d === 1) count++; }); });
    var loser = count >= b.q ? i : b.by;
    g.players[loser].n--;
    note((i === 0 ? 'You call' : g.players[i].name + ' calls') + ' it a lie. ' + WORDS[count].charAt(0) + WORDS[count].slice(1).toLowerCase() + ' ' + b.f + (count === 1 ? '' : 's') + ' under the cups — ' +
         (loser === 0 ? 'you lose a die.' : g.players[loser].name + ' loses a die.'));
    g.phase = 'reveal'; g.shown = true; g.loser = loser; g.count = count;
    sfx(loser === 0 ? 'error' : 'coin');
    paint();
    var left = alive();
    if (g.players[0].n === 0 || left.length === 1) timer = setTimeout(end, 2600);
    return true;
  }
  function nextRound() {
    if (!g || g.phase !== 'reveal') return;
    if (g.players[0].n === 0 || alive().length === 1) return end();
    round(g.loser);
  }
  function end() {
    clearTimeout(timer);
    if (!g) return;
    var r = g, won = r.players[0].n > 0, other;
    if (!won) {                                                      // you're out: the two of them play it out
      var a = r.players[1], b = r.players[2];
      other = a.n === b.n ? (Math.random() < 0.5 ? a : b) : a.n > b.n ? a : b;
    }
    close(true);
    if (won) {
      st.won++; st.best = Math.max(st.best, r.pot); store();
      if (typeof BridgeProgression !== 'undefined') {
        BridgeProgression.awardCoins(r.pot, 'fell_dice');
        if (r.stake >= 50) BridgeProgression.recordAchievement('fell_dice_high_table', 0, { source: 'lodge' });
      }
      sfx('quest');
      var loser = RIVALS[Math.random() < 0.5 ? 0 : 1];
      BridgeInteractions.choose({ title: 'Fell Dice', text: 'THE LAST CUP COMES UP AND THE POT IS YOURS: ' + r.pot + ' COINS.\n\n' + loser.lose,
        rows: [{ label: 'Another game', sub: 'same stake, ' + r.stake + ' coins', pick: function () { stake(r.stake); } }], closeLabel: 'Done' });
    } else {
      sfx('fail');
      var rv = RIVALS.filter(function (x) { return x.id === other.id; })[0];
      BridgeInteractions.choose({ title: 'Fell Dice', text: 'YOUR LAST DIE GOES. YOU WATCH THE OTHER TWO PLAY IT OUT.\n\n' + rv.win,
        rows: [{ label: 'Another game', sub: 'win it back · ' + r.stake + ' coins', pick: function () { stake(r.stake); } }], closeLabel: 'Done' });
    }
  }

  // ---- the panel -----------------------------------------------------------------------------------------------------------
  var PIPS = { 2: [[3, 3], [9, 9]], 3: [[3, 3], [6, 6], [9, 9]], 4: [[3, 3], [9, 3], [3, 9], [9, 9]], 5: [[3, 3], [9, 3], [6, 6], [3, 9], [9, 9]],
               6: [[3, 3], [9, 3], [3, 6], [9, 6], [3, 9], [9, 9]] };
  function die(v, hot, hidden) {
    var c = document.createElement('canvas');
    c.width = 14; c.height = 14; c.className = 'fd-die' + (hot ? ' hot' : '');
    var x = c.getContext('2d');
    x.fillStyle = hidden ? '#2a1610' : '#3a2a1a'; x.fillRect(1, 0, 12, 14); x.fillRect(0, 1, 14, 12);
    x.fillStyle = hidden ? '#6a3a24' : hot ? '#ffe0b8' : '#f4eee0'; x.fillRect(1, 1, 12, 12);
    if (hidden) { x.fillStyle = '#8a4a2e'; x.fillRect(2, 2, 10, 2); return c; }
    x.fillStyle = hidden ? '#000' : '#d8ccb4'; x.fillRect(1, 11, 12, 2);
    if (v === 1) {                                                   // a flake
      x.fillStyle = '#2a6ac0';
      x.fillRect(6, 2, 2, 9); x.fillRect(2, 6, 10, 2); x.fillRect(3, 3, 2, 2); x.fillRect(9, 3, 2, 2); x.fillRect(3, 9, 2, 2); x.fillRect(9, 9, 2, 2);
      x.fillStyle = '#9ad0ff'; x.fillRect(6, 6, 2, 2);
    } else {
      x.fillStyle = '#2a1a10';
      PIPS[v].forEach(function (p) { x.fillRect(p[0], p[1] - 1, 2, 2); });
    }
    return c;
  }
  function open() {
    if (!el) {
      el = document.createElement('div');
      el.id = 'fell-dice';
      el.innerHTML = '<div class="fd-panel wd-frost">' +
        '<div class="fd-head"><span class="fd-title">Fell Dice</span><span class="fd-pot"></span>' +
        '<button class="qj-close fd-close" aria-label="Leave the table"><span class="ip-key">Esc</span></button></div>' +
        '<div class="fd-rivals"></div><div class="fd-bid"></div><div class="fd-log"></div>' +
        '<div class="fd-you"><span class="fd-who">Your cup</span><div class="fd-dice"></div></div>' +
        '<div class="fd-controls"><div class="fd-q"><button data-a="q-">−</button><b class="fd-qv"></b><button data-a="q+">+</button></div>' +
        '<div class="fd-faces">' + [2, 3, 4, 5, 6].map(function (f) { return '<button data-f="' + f + '"></button>'; }).join('') + '</div>' +
        '<button class="fd-go" data-a="bid">Bid</button><button class="fd-liar" data-a="liar">Liar!</button><button class="fd-next" data-a="next">Next round</button></div>' +
        '<div class="fd-help">Flakes (the 1s) count as any face. <span class="fd-keys">↑/↓ how many · ←/→ which face · Enter bid · L call a lie · Esc leave (the stake stays)</span></div></div>';
      document.body.appendChild(el);
      el.querySelectorAll('.fd-faces button').forEach(function (b) { b.appendChild(die(+b.dataset.f)); });
      el.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (!b || !g) return;
        if (b.classList.contains('fd-close')) return close(false);
        if (b.dataset.f) { g.sel.f = +b.dataset.f; return paint(); }
        act(b.dataset.a);
      });
    }
    el.classList.add('visible');
    if (typeof BridgeControls !== 'undefined') BridgeControls.disable();
    document.addEventListener('keydown', onKey, true);
  }
  function act(a) {
    if (!g) return;
    if (a === 'q-') { g.sel.q = Math.max(1, g.sel.q - 1); paint(); }
    else if (a === 'q+') { g.sel.q = Math.min(total(), g.sel.q + 1); paint(); }
    else if (a === 'bid') { if (!bid(0, g.sel)) sfx('error'); }
    else if (a === 'liar') { if (!call(0)) sfx('error'); }
    else if (a === 'next') nextRound();
  }
  function onKey(e) {
    if (!g) return;
    var k = e.key, used = true;
    if (k === 'Escape') close(false);
    else if (g.phase === 'reveal' && (k === 'Enter' || k === ' ' || k === 'e' || k === 'E')) nextRound();
    else if (k === 'ArrowUp' || k === 'w' || k === 'W') act('q+');
    else if (k === 'ArrowDown' || k === 's' || k === 'S') act('q-');
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') { g.sel.f = g.sel.f <= 2 ? 6 : g.sel.f - 1; paint(); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { g.sel.f = g.sel.f >= 6 ? 2 : g.sel.f + 1; paint(); }
    else if (k === 'Enter' || k === 'e' || k === 'E') act('bid');
    else if (k === 'l' || k === 'L') act('liar');
    else used = false;
    if (used) { e.preventDefault(); e.stopPropagation(); }
  }
  function close(quiet) {
    clearTimeout(timer);
    var was = g;
    g = null;
    if (!el || !el.classList.contains('visible')) return;
    el.classList.remove('visible');
    document.removeEventListener('keydown', onKey, true);
    if (typeof BridgeControls !== 'undefined') BridgeControls.enable();
    if (!quiet && was) say('FELL DICE', 'YOU PUSH YOUR STOOL BACK. "THE STAKE STAYS ON THE TABLE," SAYS SIGRUN, NOT UNKINDLY. BRYN IS ALREADY POURING IT INTO HIS HAT.');
  }
  function paint() {
    if (!g || !el) return;
    var reveal = g.shown, b = g.bid;
    el.querySelector('.fd-pot').textContent = 'Pot ' + g.pot + ' · ' + total() + ' dice on the table';
    var rv = el.querySelector('.fd-rivals');
    rv.innerHTML = '';
    g.players.slice(1).forEach(function (p, k) {
      var box = document.createElement('div');
      box.className = 'fd-rival' + (g.turn === k + 1 && g.phase === 'bid' ? ' turn' : '') + (p.n === 0 ? ' out' : '');
      box.innerHTML = '<span class="fd-who">' + p.name + (p.n === 0 ? ' · out' : g.turn === k + 1 && g.phase === 'bid' ? ' · thinking…' : '') + '</span><div class="fd-dice"></div>';
      var row = box.querySelector('.fd-dice');
      (p.dice || []).forEach(function (d) { row.appendChild(die(d, reveal && b && (d === b.f || d === 1), !reveal)); });
      rv.appendChild(box);
    });
    el.querySelector('.fd-bid').innerHTML = b ? 'Bid: <b>' + bidText(b) + '</b> · ' + (b.by === 0 ? 'yours' : g.players[b.by].name + '\'s') : 'No bid yet' + (g.turn === 0 ? ' — you open.' : '.');
    el.querySelector('.fd-log').innerHTML = g.log.map(function (t, i) { return '<div' + (i === g.log.length - 1 ? ' class="last"' : '') + '>' + t + '</div>'; }).join('');
    var mine = el.querySelector('.fd-you .fd-dice');
    mine.innerHTML = '';
    g.players[0].dice.forEach(function (d) { mine.appendChild(die(d, reveal ? b && (d === b.f || d === 1) : d === g.sel.f || d === 1)); });
    el.querySelector('.fd-you').classList.toggle('turn', g.turn === 0 && g.phase === 'bid');
    el.querySelector('.fd-you .fd-who').textContent = g.players[0].n === 0 ? 'Your cup · out' : g.turn === 0 && g.phase === 'bid' ? 'Your cup · your turn' : 'Your cup';
    var mineTurn = g.turn === 0 && g.phase === 'bid' && g.players[0].n > 0;
    el.querySelector('.fd-qv').textContent = WORDS[g.sel.q] || g.sel.q;
    el.querySelectorAll('.fd-faces button').forEach(function (bt) { bt.classList.toggle('on', +bt.dataset.f === g.sel.f); });
    var go = el.querySelector('.fd-go');
    go.textContent = 'Bid ' + (WORDS[g.sel.q] || g.sel.q).toLowerCase() + ' ' + g.sel.f + (g.sel.q === 1 ? '' : 's');
    go.disabled = !mineTurn || !higher(g.sel, b) || g.sel.q > total();
    el.querySelector('.fd-liar').disabled = !mineTurn || !b || b.by === 0;
    el.querySelector('.fd-next').style.display = g.phase === 'reveal' && g.players[0].n > 0 && alive().length > 1 ? '' : 'none';
    el.querySelector('.fd-controls').classList.toggle('off', !mineTurn);
  }

  return { use: use, isOpen: function () { return !!g; }, _g: function () { return g; }, _chance: chance, _act: act };
})();
