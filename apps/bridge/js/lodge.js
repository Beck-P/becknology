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
 * Played together (js/together.js, *Play a game…* with someone at the table):
 * real pilots take the seats, a regular fills the third if you want three cups
 * (or it's heads up), and whoever asked runs the table for both — see `together`.
 *
 * localStorage bridge_lodge: {played, won, best, nudged}.
 *   BridgeLodge.use(inter) / .isOpen() / .together(session)
 */
var BridgeLodge = (function () {
  var KEY = 'bridge_lodge', STAKES = [10, 25, 50], DICE = 5;
  // the tables (an interaction's `table`): the lodge's Fell Dice with Bryn and Sigrun; Bones at the Crown & Anchor in
  // Crownhaven with Salt Annie (reads the table, calls late) and Cutter Joss (bids big and means it half the time)
  var TABLES = {
    fell: { title: 'Fell Dice', where: 'at the lodge', theme: 'wd-frost',
      intro: 'BRYN RATTLES A LEATHER CUP. "FIVE DICE EACH, FLAKES ARE WILD, BID HOW MANY OF A FACE ARE UNDER ALL THE CUPS. CALL A LIAR, LOSE A DIE IF YOU\'RE WRONG. LAST ONE WITH DICE TAKES THE POT."\n\nSIGRUN PUSHES THE STOOL OUT WITH HER BOOT. "WHAT\'S YOUR STAKE?"',
      broke: 'SIGRUN LOOKS AT YOUR EMPTY HAND, THEN AT YOU. "COINS ON THE TABLE FIRST."',
      leave: 'YOU PUSH YOUR STOOL BACK. "THE STAKE STAYS ON THE TABLE," SAYS SIGRUN, NOT UNKINDLY. BRYN IS ALREADY POURING IT INTO HIS HAT.',
      rivals: [
        { id: 'bryn', name: 'Old Bryn', call: 0.42, bluff: 0.08,
          win: '"HAH! THE OLD MAN\'S STILL GOT IT." BRYN SWEEPS THE POT INTO HIS HAT.',
          lose: 'BRYN LAUGHS UNTIL HE COUGHS. "WELL PLAYED. WELL PLAYED. NOW BUY ME A CIDER."' },
        { id: 'sigrun', name: 'Sigrun', call: 0.3, bluff: 0.3,
          win: 'SIGRUN STACKS THE COINS IN TOWERS OF TEN. "I TOLD YOU. I CHEAT BETTER."',
          lose: 'SIGRUN STARES AT THE DICE AS IF THEY\'D LIED TO HER PERSONALLY. "AGAIN. TOMORROW."' }
      ] },
    anchor: { title: 'Bones', where: 'at the Crown & Anchor', theme: 'fd-anchor',
      intro: 'SALT ANNIE TIPS FIVE BONE DICE INTO A CUP. "SAME AS EVERY PORT: BID HOW MANY OF A FACE ARE UNDER ALL THREE CUPS, ONES ARE WILD, CALL A LIAR AND SOMEBODY LOSES A DIE. LAST CUP STANDING TAKES THE POT."\n\nJOSS GRINS GOLD. "AND NO PEEKING. I\'LL KNOW."',
      broke: 'JOSS TAPS THE TABLE. "COIN FIRST, CAPTAIN. THE BONES DON\'T ROLL ON CREDIT."',
      leave: 'YOU STAND. "STAKE STAYS," SAYS ANNIE, ALREADY COUNTING IT. JOSS RAISES HIS MUG TO YOUR BACK.',
      rivals: [
        { id: 'annie', name: 'Salt Annie', call: 0.48, bluff: 0.12,
          win: 'ANNIE SCOOPS THE POT INTO HER CAP. "FORTY YEARS AT SEA, LOVE. I CAN HEAR A LIE THROUGH A CUP."',
          lose: 'ANNIE CLAPS YOU ON THE SHOULDER HARD ENOUGH TO HURT. "WELL BLOWN! YOU\'LL STAND THE NEXT ROUND, MIND."' },
        { id: 'joss', name: 'Cutter Joss', call: 0.26, bluff: 0.36,
          win: 'JOSS BITES A COIN WITH HIS GOLD TOOTH. "TOLD YOU. IT\'S THE PLAYERS YOU WATCH."',
          lose: 'JOSS GLARES AT HIS DICE, THEN AT ANNIE, THEN AT YOU. "THAT\'S TWICE. NOBODY TAKES JOSS THREE TIMES."' }
      ] }
  };
  var T = TABLES.fell, RIVALS = T.rivals;
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
    if (inter.type === 'dice') {
      if (g && g.headless) return say(T.title.toUpperCase(), 'THE GAME YOU LEFT IS STILL GOING. YOUR STOOL\'S BEEN PUSHED IN.');
      T = TABLES[inter.table] || TABLES.fell; RIVALS = T.rivals; return table();
    }
    if (inter.type === 'lodge_room') return room(inter);
  }

  // ---- a room for the night: up the stair, through the lamplit door, and down again in the morning --------------------------
  // The stair's treads (scenes/hoarfell_lodge.py, assets_lumar.stairs_up): five of them from row 3.95 back to the wall at
  // 2.15, 0.3 high each. Climbing, the pilot is posed on the tread under them and lifted by its height (a height z shows
  // z·cos 45° rows up the screen), so the stair in front still hides their boots.
  var STAIR = { x: 15.8, front: 3.95, run: 0.36, rise: 0.3, n: 5 }, Z = Math.cos(Math.PI / 4) * 32, DIR = { down: 0, right: 1, up: 2, left: 3 };
  var climbing = false;
  function room(inter) {
    var cost = inter.cost || 15;
    BridgeInteractions.choose({
      title: 'A room for the night',
      text: 'METTE TAKES A KEY OFF THE BOARD. "UNDER THE EAVES, FEATHER BED, A JUG OF HOT WATER. ' + cost + ' COINS AND I WAKE YOU WITH COFFEE."',
      rows: [{ label: 'Take the room', sub: 'sleep till morning: health and energy full', note: cost + ' coins', pick: function () {
        BridgeProgression.wagerCoins(cost, 'rest:lodge').then(function (r) {
          if (!r || !r.ok) return say('METTE', '"' + cost + ' COINS, LOVE. THE FEATHERS DON\'T PLUCK THEMSELVES."');
          climb();
        });
      } }],
      closeLabel: 'Not tonight'
    });
  }
  // the way across the floor to the stair's foot: a search over the room's open tiles
  function route(world, sx, sy, tx, ty) {
    var W = world.width, H = world.height, prev = {}, q = [[sx, sy]], k0 = sx + ',' + sy;
    prev[k0] = null;
    while (q.length) {
      var c = q.shift();
      if (c[0] === tx && c[1] === ty) break;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var nx = c[0] + d[0], ny = c[1] + d[1], kk = nx + ',' + ny;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || kk in prev || world.collisions[ny][nx]) return;
        prev[kk] = c; q.push([nx, ny]);
      });
    }
    var out = [], at = tx + ',' + ty;
    if (!(at in prev)) return [[sx, sy], [tx, ty]];
    for (var p = [tx, ty]; p; p = prev[p[0] + ',' + p[1]]) out.unshift(p);
    return out;
  }
  function climb() {
    var world = BridgeWorld.getWorld();
    if (!world || climbing) return;
    climbing = true;
    var foot = [15, 4], tiles = route(world, BridgeCharacter.getX(), BridgeCharacter.getY(), foot[0], foot[1]);
    // waypoints as floor points (tile centre, feet at the tile's foot row), then up the treads
    var pts = tiles.map(function (t) { return { x: t[0] + 0.5, y: t[1] + 1 - 3 / 32, z: 0 }; });
    pts.push({ x: STAIR.x, y: STAIR.front + 0.25, z: 0 });
    for (var i = 0; i < STAIR.n; i++) pts.push({ x: STAIR.x, y: STAIR.front - (i + 0.5) * STAIR.run, z: (i + 1) * STAIR.rise });
    pts.push({ x: STAIR.x, y: STAIR.front - STAIR.n * STAIR.run + 0.05, z: STAIR.n * STAIR.rise });
    walk(pts, 'up', function () {
      BridgeCharacter.setHidden(true);
      sleepThrough(function () {
        // morning: down the stair and onto the floor at its foot
        var down = pts.slice(-STAIR.n - 2).reverse();
        BridgeCharacter.setHidden(false);
        walk(down, 'down', function () {
          BridgeCharacter.setPose(null);
          BridgeCharacter.init(foot[0], foot[1]);
          BridgeCharacter.setFacing('down');
          climbing = false;
        });
      });
    });
  }
  // walk the pilot along a polyline of floor points (with heights), posed, the camera following
  function walk(pts, end, done) {
    var seg = 0, t = 0, dist = 0, cur = { x: pts[0].x, y: pts[0].y, z: pts[0].z }, facing = end;
    function pose() {
      BridgeCharacter.setPose({ kind: 'walk', x: cur.x, y: cur.y, row: DIR[facing], col: 4 + Math.floor(dist / 0.3) % 8, flip: false, lift: cur.z * Z,
                                light: cur.z ? [15, 4] : null });     // on the stair, the light at its foot
    }
    pose();
    BridgeWorld.setMode({
      solo: true,
      focus: function () { return { x: cur.x - 0.5, y: cur.y - 1.2 - cur.z * 0.7 }; },
      end: function () { BridgeCharacter.setPose(null); BridgeCharacter.setHidden(false); climbing = false; },
      update: function (dt) {
        var a = pts[seg], b = pts[seg + 1];
        if (!b) { BridgeWorld.setMode(null); return done(); }
        var L = Math.hypot(b.x - a.x, b.y - a.y) || 0.001, speed = a.z || b.z ? 1.7 : 2.6;
        t = Math.min(1, t + dt * speed / L);
        cur.x = a.x + (b.x - a.x) * t; cur.y = a.y + (b.y - a.y) * t; cur.z = a.z + (b.z - a.z) * t;
        dist += dt * speed;
        var dx = b.x - a.x, dy = b.y - a.y;
        facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        pose();
        if (t >= 1) { seg++; t = 0; if (b.z !== a.z || b.z) sfx('step'); }
      }
    });
  }
  // the night: dark, the lodge going quiet, a cup of coffee in the morning
  function sleepThrough(next) {
    var fade = document.createElement('div');
    fade.id = 'sleep-fade';
    fade.innerHTML = '<div class="sf-z">z<span>z</span><span>z</span></div><div class="sf-text"></div>';
    fade.querySelector('.sf-text').textContent = 'A feather bed under the eaves. Snow on the skylight. Somewhere below, Barley snores.';
    document.body.appendChild(fade);
    sfx('sleep');
    if (typeof BridgeControls !== 'undefined') BridgeControls.disable();
    requestAnimationFrame(function () { fade.classList.add('dark'); });
    setTimeout(function () {
      if (typeof BridgeInventory !== 'undefined' && BridgeInventory.restoreAll) BridgeInventory.restoreAll();
      if (typeof BridgeHoarfell !== 'undefined') BridgeHoarfell.warm(20);
      fade.querySelector('.sf-text').textContent = 'Mette knocks with coffee. You wake rested: health and energy full, and warm through.';
      fade.classList.add('woke');
    }, 2800);
    setTimeout(function () {
      fade.classList.remove('dark');
      if (typeof BridgeControls !== 'undefined') BridgeControls.enable();
      next();
    }, 4600);
    setTimeout(function () { fade.remove(); }, 5600);
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
  // `g` is the table: seats ({ id, name, n dice, dice, ai (a regular, with their nerve), pid (a real pilot) }), the bid,
  // whose turn, the log, and `me`, your seat. Alone you're seat 0 against the two regulars. Played together
  // (js/together.js) whoever asked runs the table (`net.host`): seat 0 is theirs, 1 the other pilot's and 2, with three
  // cups, one of the regulars. The host rolls, plays the regular and judges every call, and sends the table to the
  // other pilot after every change (`dice`: their own cup only, every cup once they come up); the other sends bids and
  // calls back (`dact`). The last with dice takes the pot (js/together.js pays it); a regular taking it, the house does.
  function table() {
    BridgeInteractions.choose({
      title: T.title,
      text: T.intro,
      rows: STAKES.map(function (s) {
        return { label: s + ' coins', sub: 'the pot: ' + s * 3, note: s === 50 ? 'high table' : '', pick: function () { stake(s); } };
      }),
      closeLabel: 'Just watching'
    });
  }
  function stake(s) {
    BridgeProgression.wagerCoins(s, 'fell_dice').then(function (r) {
      if (!r || !r.ok) return say(T.title.toUpperCase(), T.broke);
      start(s);
    });
  }
  function roll(n) { var d = []; for (var i = 0; i < n; i++) d.push(1 + Math.floor(Math.random() * 6)); return d.sort(); }
  function start(s) {
    g = { stake: s, pot: s * 3, players: [{ id: 'you', name: 'You', n: DICE }].concat(RIVALS.map(function (r) { return { id: r.id, name: r.name, n: DICE, ai: r }; })),
          bid: null, turn: Math.floor(Math.random() * 3), log: [], phase: 'bid', sel: { q: 1, f: 2 }, shown: false, me: 0, net: null };
    st.played++; store();
    if (st.nudged !== day() && typeof BridgeTalk !== 'undefined' && BridgeTalk.nudge) {
      st.nudged = day(); store();
      RIVALS.forEach(function (r) { BridgeTalk.nudge(r.id, 0.5, 'sat down to ' + T.title + ' with them ' + T.where); });
    }
    open();
    round(g.turn);
  }
  function alive() { return g.players.filter(function (p) { return p.n > 0; }); }
  function nextFrom(i) { var L = g.players.length; for (var k = 1; k <= L; k++) { var j = (i + k) % L; if (g.players[j].n > 0) return j; } return i; }
  function total() { return g.players.reduce(function (a, p) { return a + p.n; }, 0); }
  function higher(a, b) { return !b || a.q > b.q || (a.q === b.q && a.f > b.f); }
  function bidText(b) { return WORDS[b.q] + ' ' + b.f + (b.q === 1 ? '' : 's'); }
  function suggest(b) { return b ? { q: b.f < 6 ? b.q : b.q + 1, f: b.f < 6 ? b.f + 1 : 2 } : { q: Math.max(1, Math.round(total() / 3) - 1), f: 2 }; }
  // the log keeps what happened; each side words it for whoever's reading (you, or them by name)
  function note(e) { g.log.push(e); if (g.log.length > 4) g.log.shift(); }
  function who(i, verb, verbs) { return i === g.me ? 'You ' + verb : g.players[i].name + ' ' + verbs; }
  function line(e) {
    if (typeof e === 'string') return e;
    if (e.k === 'bid') return who(e.a, 'bid', 'bids') + ' ' + bidText(e.b) + '.';
    if (e.k === 'call') return who(e.a, 'call', 'calls') + ' it a lie. ' + WORDS[e.c].charAt(0) + WORDS[e.c].slice(1).toLowerCase() + ' ' + e.f + (e.c === 1 ? '' : 's') +
      ' under the cups — ' + (e.l === g.me ? 'you lose a die.' : g.players[e.l].name + ' loses a die.');
    if (e.k === 'out') return e.a === g.me ? 'Your last die goes.' : g.players[e.a].name + '\'s last die goes.';
    if (e.k === 'left') return e.a === g.me ? 'You leave the table.' : g.players[e.a].name + ' leaves the table.';
    return '';
  }

  function round(starter) {
    g.players.forEach(function (p) { p.dice = roll(p.n); });
    g.bid = null; g.phase = 'bid'; g.shown = false; g.turn = g.players[starter].n > 0 ? starter : nextFrom(starter);
    g.sel = suggest(null);
    sfx('dice');
    sync();
    paint();
    think();
  }
  function think() {
    clearTimeout(timer);
    if (!g || g.phase !== 'bid' || g.guest) return;
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
    note({ k: 'bid', a: i, b: { q: b.q, f: b.f } });
    g.turn = nextFrom(i);
    if (g.turn === g.me) g.sel = suggest(g.bid);
    sfx('click');
    sync();
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
    note({ k: 'call', a: i, c: count, f: b.f, l: loser });
    if (g.players[loser].n === 0 && g.net) note({ k: 'out', a: loser });
    g.phase = 'reveal'; g.shown = true; g.loser = loser; g.count = count;
    sfx(loser === g.me ? 'error' : 'coin');
    sync();
    paint();
    var left = alive();
    if (g.net) {                                                     // together: the host carries the table on by itself
      if (left.length === 1) timer = setTimeout(function () { over(g.players.indexOf(left[0])); }, 2600);
      else timer = setTimeout(nextRound, 5200);
    } else if (g.players[g.me].n === 0 || left.length === 1) timer = setTimeout(end, 2600);
    return true;
  }
  function nextRound() {
    if (!g || g.phase !== 'reveal') return;
    if (g.guest) { tsend('dact', { a: 'next' }); return; }
    clearTimeout(timer);
    var left = alive();
    if (g.net) { if (left.length === 1) return over(g.players.indexOf(left[0])); }
    else if (g.players[g.me].n === 0 || left.length === 1) return end();
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
      BridgeInteractions.choose({ title: T.title, text: 'THE LAST CUP COMES UP AND THE POT IS YOURS: ' + r.pot + ' COINS.\n\n' + loser.lose,
        rows: [{ label: 'Another game', sub: 'same stake, ' + r.stake + ' coins', pick: function () { stake(r.stake); } }], closeLabel: 'Done' });
    } else {
      sfx('fail');
      var rv = RIVALS.filter(function (x) { return x.id === other.id; })[0];
      BridgeInteractions.choose({ title: T.title, text: 'YOUR LAST DIE GOES. YOU WATCH THE OTHER TWO PLAY IT OUT.\n\n' + rv.win,
        rows: [{ label: 'Another game', sub: 'win it back · ' + r.stake + ' coins', pick: function () { stake(r.stake); } }], closeLabel: 'Done' });
    }
  }

  // ---- the table, together (js/together.js) --------------------------------------------------------------------------------
  var wired = false;
  function tsend(k, d) { if (typeof BridgeTogether !== 'undefined') BridgeTogether.send(k, d); }
  function rivalFor(table) { return ((TABLES[table] || TABLES.fell).rivals[1] || {}).name; }
  function together(s) {
    if (!wired && typeof BridgeTogether !== 'undefined') { BridgeTogether.on('dice', onTable); BridgeTogether.on('dact', onAct); wired = true; }
    clearTimeout(timer);
    T = TABLES[s.opts && s.opts.table] || TABLES.fell; RIVALS = T.rivals;
    var seats = s.opts && s.opts.seats === 3 ? 3 : 2, rival = RIVALS[1], mine = BridgeTogether.myName();
    var host = s.host ? mine : s.peerName, guest = s.host ? s.peerName : mine;
    var players = [{ id: 'host', name: host, n: DICE }, { id: 'guest', name: guest, n: DICE, pid: s.host ? s.peer : 'me' }];
    if (seats === 3) players.push({ id: rival.id, name: rival.name, n: DICE, ai: s.host ? rival : true });
    g = { stake: s.wager, pot: s.pot || s.wager * seats, players: players, bid: null, turn: -1, log: [], phase: s.host ? 'bid' : 'wait', sel: { q: 1, f: 2 },
          shown: false, me: s.host ? 0 : 1, guest: !s.host, net: { host: s.host, peerSeat: 1, sid: s.sid } };
    st.played++; store();
    open();
    if (s.host) round(Math.floor(Math.random() * seats));
    else { players.forEach(function (p) { p.dice = []; }); paint(); }
  }
  // the host's table, as the other pilot may see it: their own cup, everyone's once the cups come up
  function view() {
    var peer = g.net.peerSeat;
    return { stake: g.stake, pot: g.pot, bid: g.bid, turn: g.turn, log: g.log, phase: g.phase, shown: g.shown, loser: g.loser, count: g.count, winner: g.winner,
             players: g.players.map(function (p, i) {
               return { id: p.id, name: p.name, n: p.n, ai: !!p.ai, human: !p.ai, dice: g.shown || i === peer ? (p.dice || []).slice() : (p.dice || []).map(function () { return 0; }) };
             }) };
  }
  function sync() { if (g && g.net && g.net.host) tsend('dice', view()); }
  // the other pilot: the table as the host sends it
  function onTable(d) {
    if (!g || !g.guest || !d || !d.players) return;
    var was = g.phase, wasBid = JSON.stringify(g.bid), wasTurn = g.turn;
    ['stake', 'pot', 'bid', 'turn', 'log', 'phase', 'shown', 'loser', 'count', 'winner'].forEach(function (k) { g[k] = d[k]; });
    g.players = d.players;
    if (g.phase === 'bid' && g.turn === g.me && (wasTurn !== g.me || JSON.stringify(g.bid) !== wasBid)) g.sel = suggest(g.bid);
    if (g.phase === 'reveal' && was !== 'reveal') sfx(g.loser === g.me ? 'error' : 'coin');
    else if (g.phase === 'bid' && was !== 'bid') sfx('dice');
    else if (g.phase === 'bid' && JSON.stringify(g.bid) !== wasBid) sfx('click');
    paint();
    if (g.phase === 'over' && was !== 'over') finish();
  }
  // the host: what the other pilot does at the table
  function onAct(d) {
    if (!g || !g.net || !g.net.host || !d) return;
    var seat = g.net.peerSeat;
    if (d.a === 'bid') bid(seat, { q: +d.q, f: +d.f });
    else if (d.a === 'call') call(seat);
    else if (d.a === 'next') nextRound();
    else if (d.a === 'leave') leaveSeat(seat);
  }
  function leaveSeat(seat) {
    if (!g || g.phase === 'over') return;
    if (g.players[seat].n > 0) { g.players[seat].n = 0; g.players[seat].dice = []; note({ k: 'left', a: seat }); }
    var left = alive();
    if (left.length === 1) { clearTimeout(timer); return over(g.players.indexOf(left[0])); }
    if (g.phase === 'bid' && g.turn === seat) g.turn = nextFrom(seat);
    sync(); paint(); think();
  }
  function over(seat) {
    clearTimeout(timer);
    if (!g || g.phase === 'over') return;
    g.phase = 'over'; g.winner = seat;
    sync();
    paint();
    finish();
  }
  // the last cup standing: each side reports how it went for them (js/together.js pays and says)
  function finish() {
    var w = g.players[g.winner], mine = g.winner === g.me, rv = RIVALS[1];
    if (mine) { st.won++; st.best = Math.max(st.best, g.pot); store(); }
    var why = w.ai ? (rv && rv.win) || w.name + ' takes it' : mine ? 'Your cup\'s the last standing' + (g.players.length > 2 && rv ? '. ' + rv.lose : '')
            : w.name + '\'s cup is the last standing';
    if (typeof BridgeTogether !== 'undefined') BridgeTogether.result(mine ? 'win' : w.ai ? 'house' : 'lose', why);
  }
  // the verdict (from js/together.js): the table clears and the result's read out
  function verdict(v) {
    var keep = g && g.headless;
    if (!keep) close(true);
    g = null;
    if (typeof BridgeTogether !== 'undefined') BridgeTogether.showVerdict(v);
  }
  // they've gone (their stake and yours are back: js/together.js): the table breaks up
  function gone() { clearTimeout(timer); close(true); g = null; }

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
    } else if (PIPS[v]) {
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
    el.querySelector('.fd-panel').className = 'fd-panel ' + T.theme + (g && g.net ? ' fd-together' : '');   // the lodge's frost, the pub's dark oak
    el.querySelector('.fd-title').textContent = T.title;
    el.classList.add('visible');
    if (typeof BridgeControls !== 'undefined') BridgeControls.disable();
    document.addEventListener('keydown', onKey, true);
  }
  function act(a) {
    if (!g || g.headless) return;
    var mineTurn = g.phase === 'bid' && g.turn === g.me && g.players[g.me].n > 0;
    if (a === 'q-') { g.sel.q = Math.max(1, g.sel.q - 1); paint(); }
    else if (a === 'q+') { g.sel.q = Math.min(total(), g.sel.q + 1); paint(); }
    else if (g.guest) {                                              // the other pilot: say it to the host, who runs the table
      if (a === 'bid') { if (mineTurn && higher(g.sel, g.bid) && g.sel.q <= total()) { tsend('dact', { a: 'bid', q: g.sel.q, f: g.sel.f }); sfx('click'); } else sfx('error'); }
      else if (a === 'liar') { if (mineTurn && g.bid && g.bid.by !== g.me) tsend('dact', { a: 'call' }); else sfx('error'); }
      else if (a === 'next') nextRound();
    }
    else if (a === 'bid') { if (!bid(g.me, g.sel)) sfx('error'); }
    else if (a === 'liar') { if (!call(g.me)) sfx('error'); }
    else if (a === 'next') nextRound();
  }
  function onKey(e) {
    if (!g || g.headless) return;
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
  function hidePanel() {
    if (!el || !el.classList.contains('visible')) return false;
    el.classList.remove('visible');
    document.removeEventListener('keydown', onKey, true);
    if (typeof BridgeControls !== 'undefined') BridgeControls.enable();
    return true;
  }
  function close(quiet) {
    var was = g;
    // walking away from a table played together: your cup's out and the game goes on without you
    if (!quiet && was && was.net && was.phase !== 'over') {
      if (was.guest) { tsend('dact', { a: 'leave' }); g = null; hidePanel(); if (typeof BridgeTogether !== 'undefined') BridgeTogether.result('lose', 'You left the table'); return; }
      was.headless = true;                                           // the host's table runs on (the regular, the other pilot) till it's done
      hidePanel();
      leaveSeat(was.me);
      return;
    }
    clearTimeout(timer);
    g = null;
    if (!hidePanel()) return;
    if (!quiet && was) say(T.title.toUpperCase(), T.leave);
  }
  function paint() {
    if (!g || !el) return;
    var reveal = g.shown, b = g.bid, me = g.me, bidding = g.phase === 'bid';
    el.querySelector('.fd-pot').textContent = 'Pot ' + g.pot + ' · ' + total() + ' dice on the table';
    var rv = el.querySelector('.fd-rivals');
    rv.innerHTML = '';
    g.players.forEach(function (p, i) {
      if (i === me) return;
      var box = document.createElement('div'), turn = g.turn === i && bidding;
      box.className = 'fd-rival' + (turn ? ' turn' : '') + (p.n === 0 ? ' out' : '') + (p.ai ? '' : g.net ? ' human' : '');
      box.innerHTML = '<span class="fd-who"></span><div class="fd-dice"></div>';
      box.querySelector('.fd-who').textContent = p.name + (p.n === 0 ? ' · out' : turn ? (p.ai ? ' · thinking…' : ' · deciding…') : g.phase === 'over' && g.winner === i ? ' · takes it' : '');
      var row = box.querySelector('.fd-dice');
      (p.dice || []).forEach(function (d) { row.appendChild(die(d, reveal && b && (d === b.f || d === 1), !reveal)); });
      rv.appendChild(box);
    });
    var bidEl = el.querySelector('.fd-bid');
    if (g.phase === 'wait') bidEl.innerHTML = 'Shaking the cups…';
    else if (g.phase === 'over') bidEl.innerHTML = '<b>' + (g.winner === me ? 'Your cup\'s the last standing' : esc(g.players[g.winner].name) + ' takes the pot') + '</b>';
    else bidEl.innerHTML = b ? 'Bid: <b>' + bidText(b) + '</b> · ' + (b.by === me ? 'yours' : esc(g.players[b.by].name) + '\'s') : 'No bid yet' + (g.turn === me ? ' — you open.' : '.');
    el.querySelector('.fd-log').innerHTML = g.log.map(function (t, i) { return '<div' + (i === g.log.length - 1 ? ' class="last"' : '') + '>' + esc(line(t)) + '</div>'; }).join('');
    var mine = el.querySelector('.fd-you .fd-dice'), you = g.players[me];
    mine.innerHTML = '';
    (you.dice || []).forEach(function (d) { mine.appendChild(die(d, reveal ? b && (d === b.f || d === 1) : d === g.sel.f || d === 1)); });
    el.querySelector('.fd-you').classList.toggle('turn', g.turn === me && bidding);
    el.querySelector('.fd-you .fd-who').textContent = you.n === 0 ? 'Your cup · out' : g.turn === me && bidding ? 'Your cup · your turn' : 'Your cup';
    var mineTurn = g.turn === me && bidding && you.n > 0;
    el.querySelector('.fd-qv').textContent = WORDS[g.sel.q] || g.sel.q;
    el.querySelectorAll('.fd-faces button').forEach(function (bt) { bt.classList.toggle('on', +bt.dataset.f === g.sel.f); });
    var go = el.querySelector('.fd-go');
    go.textContent = 'Bid ' + (WORDS[g.sel.q] || g.sel.q).toLowerCase() + ' ' + g.sel.f + (g.sel.q === 1 ? '' : 's');
    go.disabled = !mineTurn || !higher(g.sel, b) || g.sel.q > total();
    el.querySelector('.fd-liar').disabled = !mineTurn || !b || b.by === me;
    el.querySelector('.fd-next').style.display = g.phase === 'reveal' && you.n > 0 && alive().length > 1 ? '' : 'none';
    el.querySelector('.fd-controls').classList.toggle('off', !mineTurn);
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }

  return { use: use, isOpen: function () { return (!!g && !g.headless) || climbing; }, together: together, verdict: verdict, gone: gone, rivalFor: rivalFor,
           _g: function () { return g; }, _chance: chance, _act: act };
})();
