/**
 * BridgeDance — Club Void, behind the velvet rope on the District street.
 *
 * The door (CLUB VOID, set up as the street loads): members only, or sixty
 * coins for the stamp (free in the Neon Runner suit). Inside (`arcadia-club`,
 * scenes/arcadia_club.py) the music is the `club` theme (js/audio.js), and
 * everything keeps its time: `beat()` reads the song's own step clock
 * (`BridgeAudio.clock()`, less the output latency) so the LED floor, the
 * dancers (scene actors with `dance`, js/scene.js) and the arrows all land on
 * the kick drum. Without sound it keeps time by itself at the same tempo.
 *
 * The dance (interaction type `dance`, the floor): pick Easy, Club or Void;
 * arrows rise in four lanes to the receptors at the top in time with the
 * music — press ←↓↑→ (or WASD, or tap the lanes) as they arrive. Perfect /
 * great / good by how close; a miss breaks the combo, and the combo lifts the
 * score (up to double). The charts are written fresh each day from the date.
 * A dance-off (on a keyboard): two panels, the same steps, WASD against the
 * arrows, and the floor goes to whoever scores more.
 * A grade at the end (S-D), your best per level, coins for a first clear and
 * once a day after. Saved in localStorage bridge_dance.
 *
 *   BridgeDance.decorate(worldId, data) / .use(inter) / .beat()
 */
var BridgeDance = (function () {
  var KEY = 'bridge_dance', CLUB = 'arcadia-club', COVER = 60, BPM = 124;
  var LEVELS = {
    easy: { name: 'EASY', bars: 16, first: 40, again: 10, sub: 'on the beat' },
    club: { name: 'CLUB', bars: 20, first: 80, again: 20, sub: 'eighths, a few doubles' },
    void: { name: 'VOID', bars: 24, first: 150, again: 35, sub: 'sixteenths and jumps' }
  };
  var LANES = ['left', 'down', 'up', 'right'];
  var LANE_COL = ['#ff5ab0', '#40c8d8', '#7ae070', '#a080ff'];
  var WIN = { perfect: 0.055, great: 0.105, good: 0.16 };
  var PTS = { perfect: 300, great: 200, good: 100 };

  var st = load();
  var run = null;               // the dance in progress
  var hud = null;

  function load() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    d = d || {};
    return { member: !!d.member, best: d.best || {}, paid: d.paid || {}, cleared: d.cleared || {} };
  }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode */ } }
  function say(t, x) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(t, x); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }
  function toast(k, t, sub) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(k, t, sub); }
  function day() { return Math.floor(Date.now() / 86400000); }

  // ---- the beat: the club track's own clock (beats, fractional), or ours at the same tempo -------------------------
  function beat() {
    var c = typeof BridgeAudio !== 'undefined' && BridgeAudio.clock ? BridgeAudio.clock() : null;
    if (c && c.name === 'club') return (c.step - c.lat / c.spb) / 4;
    return performance.now() / (60000 / BPM);
  }
  function spbeat() { return 60 / BPM; }

  // ---- the door ---------------------------------------------------------------------------------------------------------
  function decorate(worldId, data) {
    if (worldId !== 'arcadia-street') return;
    (data.interactions || []).forEach(function (it) {
      if (it.label === 'CLUB VOID') { it.type = 'club_door'; it.prompt = st.member ? 'PRESS E TO GO IN' : 'PRESS E TO KNOCK'; }
    });
  }
  function use(inter) {
    if (inter.type === 'club_door') return door();
    if (inter.type === 'dance') return menu();
  }
  function door() {
    if (st.member) { sfx('door'); return BridgeWorld.enterWorld(CLUB, [8, 9]); }
    var runner = typeof BridgeGear !== 'undefined' && BridgeGear.style && BridgeGear.style() === 'runner';
    if (runner) {
      st.member = true; store();
      sfx('door');
      say('CLUB VOID', 'THE SLOT OPENS. TWO EYES LOOK YOU UP AND DOWN, STOP ON THE JACKET.\n\n"...NICE. GO ON IN." A STAMP ON YOUR WRIST, A VOID-BLACK CIRCLE THAT GLOWS UNDER THE LIGHTS.');
      return setTimeout(function () { BridgeWorld.enterWorld(CLUB, [8, 9]); }, 1400);
    }
    BridgeInteractions.choose({
      title: 'Club Void',
      text: 'BASS THROUGH THE DOOR. A SLOT OPENS. TWO EYES.\n\n"MEMBERS ONLY." A PAUSE. "OR ' + COVER + ' AND A STAMP, AND THEN YOU\'RE A MEMBER. YOUR CHOICE."',
      rows: [{ label: 'Pay the cover', sub: 'a stamp on your wrist, for good', note: COVER + ' coins', pick: pay }],
      closeLabel: 'Walk on'
    });
  }
  function pay() {
    BridgeProgression.wagerCoins(COVER, 'club:cover').then(function (r) {
      if (!r || !r.ok) return say('CLUB VOID', '"' + COVER + '. NOT FIFTY-NINE." THE SLOT CLOSES.');
      st.member = true; store();
      sfx('door');
      toast('Club Void', 'Member', 'The stamp glows under the lights');
      var w = BridgeWorld.getWorld();
      if (w) (w.interactions || []).forEach(function (i) { if (i.type === 'club_door') i.prompt = 'PRESS E TO GO IN'; });
      BridgeWorld.enterWorld(CLUB, [8, 9]);
    });
  }

  // ---- the dance ----------------------------------------------------------------------------------------------------------
  function menu() {
    var touch = document.documentElement.classList.contains('touch');
    var rows = Object.keys(LEVELS).map(function (id) {
      var L = LEVELS[id], b = st.best[id];
      return { label: L.name, sub: L.sub, note: b ? 'best ' + b.score + ' (' + b.grade + ')' : st.cleared[id] ? '' : L.first + ' coins', pick: function () { play(id); } };
    });
    if (!touch) rows.push({ label: 'Dance-off', sub: 'two of you, one keyboard: WASD against the arrows', note: 'club', pick: function () { play('club', true); } });
    BridgeInteractions.choose({
      title: 'The Dance Floor',
      text: 'THE TILES LIGHT UNDER YOUR FEET IN TIME WITH THE KICK. KIRI CATCHES YOUR EYE FROM THE DECKS AND TURNS SOMETHING UP.\n\n' +
            'ARROWS RISE TO THE TOP IN TIME WITH THE MUSIC - HIT ←↓↑→ (OR WASD) AS THEY ARRIVE.',
      rows: rows,
      closeLabel: 'Not yet'
    });
  }

  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function chart(id, startBeat) {
    var L = LEVELS[id], r = rng(day() * 31 + id.length * 977 + 7), notes = [], last = -1, run2 = 0;
    function lane() {
      var l = Math.floor(r() * 4);
      if (l === last && ++run2 > 1) l = (l + 1 + Math.floor(r() * 3)) % 4;
      if (l !== last) run2 = 0;
      last = l;
      return l;
    }
    for (var bar = 0; bar < L.bars; bar++) {
      var calm = bar % 8 === 7;                                   // the last bar of each eight breathes
      for (var s = 0; s < 16; s++) {
        var b = startBeat + bar * 4 + s / 4, p = 0;
        if (s % 4 === 0) p = id === 'easy' ? 0.62 : id === 'club' ? 0.78 : 0.85;
        else if (s % 2 === 0) p = id === 'easy' ? 0 : id === 'club' ? 0.36 : 0.55;
        else p = id === 'void' && bar >= 4 ? 0.14 : 0;
        if (calm) p *= 0.4;
        if (bar === 0 && s === 0) p = 1;
        if (r() >= p) continue;
        var l = lane();
        notes.push({ beat: b, lane: l, hit: null });
        if (s === 0 && id !== 'easy' && r() < (id === 'void' ? 0.28 : 0.12)) notes.push({ beat: b, lane: (l + 2) % 4, hit: null });   // a jump
      }
    }
    return notes;
  }

  var ARROWS = { ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3 }, WASD = { a: 0, A: 0, s: 1, S: 1, w: 2, W: 2, d: 3, D: 3 };
  function player(name, keys, notes) {
    return { name: name, keys: keys, notes: notes, score: 0, combo: 0, maxCombo: 0, counts: { perfect: 0, great: 0, good: 0, miss: 0 },
             judge: null, judgeT: 0, flash: [0, 0, 0, 0] };
  }
  // play a level; duo: a dance-off, two panels, the same steps, WASD on the left against the arrows on the right
  function play(id, duo) {
    var w = BridgeWorld.getWorld();
    if (!w || !w.club) return;
    var now = beat(), start = Math.floor(now / 4) * 4 + 8;       // two bars to get ready
    var F = w.club.floor, px = Math.floor((F[0] + F[2]) / 2), py = Math.floor((F[1] + F[3]) / 2);
    BridgeCharacter.init(px, py);
    BridgeCharacter.setFacing('down');
    var notes = chart(id, start), copy = function () { return notes.map(function (n) { return { beat: n.beat, lane: n.lane, hit: null }; }); };
    var both = {}; Object.keys(ARROWS).forEach(function (k) { both[k] = ARROWS[k]; }); Object.keys(WASD).forEach(function (k) { both[k] = WASD[k]; });
    run = { id: id, duo: !!duo, start: start, end: notes[notes.length - 1].beat + 2, hitT: 0, x: px, y: py,
            players: duo ? [player('PLAYER ONE · WASD', WASD, copy()), player('PLAYER TWO · ARROWS', ARROWS, copy())] : [player('', both, copy())] };
    if (duo) {                                                     // player two dances beside you, in a runner suit of another colour
      var mine = (typeof BridgeGear !== 'undefined' && BridgeGear.colour && BridgeGear.colour()) || 'purple';
      run.partner = { sheet: 'pilot-runner-' + (mine === 'cyan' ? 'red' : 'cyan'), x: px + 1, y: py, facing: 'down', hitT: 0 };
      (run.acts = w.scene.actors).push(run.partner);
    }
    BridgeWorld.setMode({ update: update, focus: function () { return { x: px - 0.5 + (duo ? 2.5 : 0), y: py - 1.6 }; }, solo: true, end: function () { quit(true); } });
    ensureHud(run.players.length);
    hud.classList.add('on');
    hud.classList.toggle('duo', !!duo);
    document.documentElement.classList.add('dancing');            // the hotbar and the stick step aside (touch)
    hud.querySelector('.dn-name').textContent = 'CLUB VOID · ' + (duo ? 'DANCE-OFF' : LEVELS[id].name);
    hud.querySelector('.dn-help').textContent = duo ? 'Left: W A S D  ·  Right: ← ↓ ↑ →  ·  the same steps  ·  Esc stop' : '← ↓ ↑ → (or WASD) as the arrows reach the top · Esc stop';
    run.players.forEach(function (pl, i) { pl.col = cols[i]; pl.col.querySelector('.dn-who').textContent = pl.name; });
    document.addEventListener('keydown', onKey, true);
    sfx('open');
  }

  function onKey(e) {
    if (!run) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); return quit(false); }
    var done = false;
    run.players.forEach(function (pl) {
      var lane = pl.keys[e.key];
      if (lane == null) return;
      done = true;
      if (!e.repeat) hit(pl, lane);
    });
    if (done) { e.preventDefault(); e.stopPropagation(); }
  }
  function hit(pl, lane) {
    var b = beat(), best = null, bd = 1e9;
    pl.flash[lane] = performance.now();
    pl.notes.forEach(function (n) {
      if (n.lane !== lane || n.hit) return;
      var d = Math.abs(b - n.beat) * spbeat();
      if (d < bd) { bd = d; best = n; }
    });
    if (!best || bd > WIN.good) return;
    var j = bd <= WIN.perfect ? 'perfect' : bd <= WIN.great ? 'great' : 'good';
    best.hit = j;
    pl.counts[j]++;
    pl.combo++;
    pl.maxCombo = Math.max(pl.maxCombo, pl.combo);
    pl.score += Math.round(PTS[j] * (1 + Math.min(1, pl.combo / 50)));
    pl.judge = j; pl.judgeT = performance.now(); run.hitT = performance.now();
    if (run.partner && pl === run.players[1]) { run.partner.facing = LANES[lane]; run.partner.hitT = performance.now(); }
    else BridgeCharacter.setFacing(LANES[lane]);
  }

  function update() {
    if (!run) return;
    var b = beat();
    run.players.forEach(function (pl) {
      pl.notes.forEach(function (n) {
        if (!n.hit && (b - n.beat) * spbeat() > WIN.good) { n.hit = 'miss'; pl.counts.miss++; pl.combo = 0; pl.judge = 'miss'; pl.judgeT = performance.now(); }
      });
    });
    if (b > run.end) return finish();
    run.players.forEach(function (pl) { paint(pl, b); });
  }

  // ---- the arrows (a screen-space panel per dancer: a small native canvas, scaled up crisp) -------------------------------
  var PXB = 44, TOP = 22, W = 120, H = 210, cols = [];
  function ensureHud(n) {
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'dance-hud';
      hud.innerHTML = '<div class="dn-top"><b class="dn-name"></b></div><div class="dn-cols"></div>' +
        '<div class="dn-pads">' + LANES.map(function (l, i) { return '<button data-lane="' + i + '">' + ['←', '↓', '↑', '→'][i] + '</button>'; }).join('') + '</div>' +
        '<div class="dn-help">← ↓ ↑ → (or WASD) as the arrows reach the top · Esc stop</div>';
      document.body.appendChild(hud);
      hud.querySelectorAll('.dn-pads button').forEach(function (bt) {
        bt.addEventListener('pointerdown', function (e) { e.preventDefault(); if (run) hit(run.players[0], +bt.dataset.lane); });
      });
    }
    var box = hud.querySelector('.dn-cols');
    while (cols.length < n) {
      var col = document.createElement('div');
      col.className = 'dn-col';
      col.innerHTML = '<div class="dn-head"><span class="dn-who"></span><span class="dn-score">0</span></div>' +
        '<canvas width="' + W + '" height="' + H + '"></canvas><div class="dn-judge"></div><div class="dn-combo"></div>';
      box.appendChild(col);
      cols.push(col);
    }
    cols.forEach(function (c, i) { c.style.display = i < n ? '' : 'none'; });
  }
  function arrow(c, x, y, lane, col, outline) {
    // a 14 x 14 pixel arrow pointing the lane's way, drawn on a 16-grid (rotated by lane)
    var px = [[6, 1, 2, 12], [4, 3, 2, 2], [8, 3, 2, 2], [2, 5, 2, 2], [10, 5, 2, 2], [0, 7, 2, 2], [12, 7, 2, 2]];    // pointing up
    var rot = { up: 0, right: 1, down: 2, left: 3 }[LANES[lane]];
    px.forEach(function (p) {
      var rx = p[0], ry = p[1], rw = p[2], rh = p[3], q;
      for (var i = 0; i < rot; i++) { q = [13 - (ry + rh - 1), rx, rh, rw]; rx = q[0]; ry = q[1]; rw = q[2]; rh = q[3]; }
      if (outline) { c.fillStyle = outline; c.fillRect(x + rx - 1, y + ry - 1, rw + 2, rh + 2); }
    });
    px.forEach(function (p) {
      var rx = p[0], ry = p[1], rw = p[2], rh = p[3], q;
      for (var i = 0; i < rot; i++) { q = [13 - (ry + rh - 1), rx, rh, rw]; rx = q[0]; ry = q[1]; rw = q[2]; rh = q[3]; }
      c.fillStyle = col; c.fillRect(x + rx, y + ry, rw, rh);
    });
  }
  function paint(pl, b) {
    var c = pl.col.querySelector('canvas').getContext('2d'), now = performance.now();
    c.clearRect(0, 0, W, H);
    c.fillStyle = 'rgba(10,6,20,0.82)'; c.fillRect(0, 0, W, H);
    for (var l = 0; l < 4; l++) {
      var lx = 8 + l * 27;
      c.fillStyle = 'rgba(255,255,255,0.04)'; c.fillRect(lx - 2, 0, 18, H);
      var fl = Math.max(0, 1 - (now - pl.flash[l]) / 160);
      if (fl > 0) { c.fillStyle = 'rgba(255,255,255,' + (0.25 * fl).toFixed(2) + ')'; c.fillRect(lx - 2, TOP - 4, 18, 22); }
      var pulse = (b % 1) < 0.15;
      arrow(c, lx, TOP, l, pulse ? '#3a3050' : '#241c34', fl > 0 ? LANE_COL[l] : '#8a80a8');
    }
    pl.notes.forEach(function (n) {
      if (n.hit && n.hit !== 'miss') return;
      var y = TOP + (n.beat - b) * PXB;
      if (y > H || y < -16) return;
      var lx = 8 + n.lane * 27;
      arrow(c, lx, Math.round(y), n.lane, n.hit === 'miss' ? '#4a4258' : LANE_COL[n.lane], '#0a0610');
    });
    pl.col.querySelector('.dn-score').textContent = pl.score;
    var j = pl.col.querySelector('.dn-judge'), age = now - pl.judgeT;
    j.textContent = pl.judge && age < 600 ? pl.judge.toUpperCase() : '';
    j.className = 'dn-judge ' + (pl.judge || '');
    pl.col.querySelector('.dn-combo').textContent = pl.combo > 3 ? pl.combo + ' COMBO' : b < run.start ? 'GET READY · ' + Math.ceil(run.start - b) : '';
  }

  function grade(pl) {
    var total = pl.notes.length, acc = total ? (pl.counts.perfect * 300 + pl.counts.great * 200 + pl.counts.good * 100) / (total * 300) : 0;
    return acc >= 0.95 ? 'S' : acc >= 0.85 ? 'A' : acc >= 0.7 ? 'B' : acc >= 0.5 ? 'C' : 'D';
  }
  function finish() {
    var r = run, L = LEVELS[r.id], id = r.id;
    if (r.duo) return finishDuo(r);
    var pl = r.players[0], g = grade(pl), best = st.best[id], nb = !best || pl.score > best.score;
    if (nb) st.best[id] = { score: pl.score, grade: g };
    var pass = g !== 'D', pay = 0;
    if (pass && !st.cleared[id]) { st.cleared[id] = Date.now(); pay = L.first; }
    else if (pass && st.paid[id] !== day()) pay = L.again;
    if (pay) st.paid[id] = day();
    store();
    if (typeof BridgeProgression !== 'undefined') {
      if (pay) BridgeProgression.awardCoins(pay, 'dance:' + id);
      if (g === 'S' && id === 'void') BridgeProgression.recordAchievement('danced_void_s', 0, { source: 'dance' });
      if (pass) BridgeProgression.recordAchievement('danced_' + id, 0, { source: 'dance' });
    }
    quit(true);
    sfx(pass ? 'quest' : 'fail');
    BridgeInteractions.choose({
      title: 'Club Void · ' + L.name,
      text: 'GRADE ' + g + '   ·   ' + pl.score + (nb && best ? '  -  A NEW BEST!' : '') + '\n\n' +
            'PERFECT ' + pl.counts.perfect + '  ·  GREAT ' + pl.counts.great + '  ·  GOOD ' + pl.counts.good + '  ·  MISS ' + pl.counts.miss + '\nLONGEST COMBO ' + pl.maxCombo +
            (g === 'S' ? '\n\nKIRI LIFTS ONE HAND OFF THE DECKS AND POINTS AT YOU. THE FLOOR CHEERS.' : g === 'D' ? '\n\nDEZ SLIDES YOU A GLASS OF WATER. "IT HAPPENS."' : '') +
            (pay ? '\n\n' + pay + ' COINS.' : ''),
      rows: [{ label: 'Dance again', sub: L.name.toLowerCase(), pick: function () { play(id); } }],
      closeLabel: 'Done'
    });
  }
  function finishDuo(r) {
    var a = r.players[0], b = r.players[1], d = a.score - b.score;
    quit(true);
    sfx('quest');
    var line = function (pl) { return pl.name.split(' · ')[0] + ': ' + pl.score + ' (' + grade(pl) + ') · ' + pl.counts.perfect + ' PERFECT · LONGEST COMBO ' + pl.maxCombo; };
    BridgeInteractions.choose({
      title: 'Club Void · Dance-off',
      text: (d === 0 ? 'A DEAD HEAT. KIRI CAN\'T BELIEVE IT EITHER.' : (d > 0 ? 'PLAYER ONE' : 'PLAYER TWO') + ' TAKES THE FLOOR BY ' + Math.abs(d) + '. THE CROWD GOES THEIR WAY.') +
            '\n\n' + line(a) + '\n' + line(b),
      rows: [{ label: 'Rematch', sub: 'same steps, again', pick: function () { play(r.id, true); } }],
      closeLabel: 'Done'
    });
  }

  function quit(quiet) {
    if (!run) return;
    if (run.acts && run.acts.indexOf(run.partner) >= 0) run.acts.splice(run.acts.indexOf(run.partner), 1);
    run = null;
    document.removeEventListener('keydown', onKey, true);
    if (hud) { hud.classList.remove('on'); hud.classList.remove('duo'); }
    document.documentElement.classList.remove('dancing');
    if (BridgeWorld.getMode()) BridgeWorld.setMode(null);
    if (!quiet) say('DANCE FLOOR', 'YOU STEP OFF THE FLOOR, BREATHING HARD.');
  }

  // ---- the room: the LED floor and the mirror ball's light, both on the beat ----------------------------------------------
  function ground(ctx, world, offX, offY, ts, now) {
    var C = world.club;
    if (!C) return;
    var F = C.floor, b = beat(), bar = Math.floor(b / 4), ph = b % 1, kick = Math.pow(1 - ph, 2.2);
    var pat = bar % 4, cxm = (F[0] + F[2]) / 2 - 0.5, cym = (F[1] + F[3]) / 2 - 0.5;
    var cols = ['255,90,176', '64,200,216', '160,128,255', '255,208,80'];
    var px = BridgeCharacter.getX(), py = BridgeCharacter.getY(), hitAge = run ? (performance.now() - run.hitT) / 260 : 9;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var x = F[0]; x < F[2]; x++) for (var y = F[1]; y < F[3]; y++) {
      var i = x - F[0], j = y - F[1], on, ci;
      if (pat === 0) { on = (i + j + Math.floor(b)) % 2 === 0; ci = Math.floor(b) % 4; }
      else if (pat === 1) { on = Math.floor(Math.hypot(x - cxm, y - cym) * 1.2) === Math.floor(b * 2) % 4; ci = (i + Math.floor(b)) % 4; }
      else if (pat === 2) { on = (i === Math.floor(b * 2) % (F[2] - F[0])) || (j === Math.floor(b) % (F[3] - F[1])); ci = (j + 1) % 4; }
      else { on = ((i * 7 + j * 13 + Math.floor(b * 2) * 5) % 5) < 2; ci = (i * 3 + j + Math.floor(b)) % 4; }
      var a = on ? 0.18 + 0.4 * kick : 0.05;
      if (run && x === px && y === py && hitAge < 1) a = Math.max(a, 0.75 * (1 - hitAge));
      ctx.fillStyle = 'rgba(' + cols[ci] + ',' + a.toFixed(3) + ')';
      ctx.fillRect(Math.round(offX + x * ts) + 2, Math.round(offY + y * ts) + 2, ts - 4, ts - 4);
    }
    ctx.restore();
  }
  function over(ctx, world, offX, offY, ts, now) {
    var C = world.club;
    if (!C || !C.ball) return;
    var b = beat(), W2 = ctx.canvas.width, H2 = ctx.canvas.height, bx = offX + C.ball[0] * ts, by = offY + C.ball[1] * ts;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 28; i++) {                                  // spots thrown round the room, turning slowly
      var a = i * 2.39996 + now / 2600, d = 40 + (i * 53) % 220, x = bx + Math.cos(a) * d * 1.3, y = by + Math.sin(a) * d * 0.55 + 40;
      if (x < 0 || y < 0 || x > W2 || y > H2) continue;
      var tw = 0.35 + 0.35 * Math.sin(now / 300 + i);
      ctx.fillStyle = 'rgba(' + (i % 3 ? '220,230,255' : '255,180,230') + ',' + (tw * 0.6).toFixed(2) + ')';
      ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
    var gl = 0.25 + 0.35 * Math.pow(1 - (b % 1), 3);                // the ball itself catching the light on the kick
    ctx.fillStyle = 'rgba(255,255,255,' + gl.toFixed(2) + ')';
    ctx.fillRect(Math.round(bx) - 1, Math.round(by) - 6, 2, 2);
    ctx.fillRect(Math.round(bx) + 3, Math.round(by) - 2, 1, 1);
    ctx.restore();
  }
  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('arcadia', { ground: ground, over: over });

  return { decorate: decorate, use: use, beat: beat, isOpen: function () { return !!run; }, LEVELS: LEVELS,
           _st: function () { return st; }, _run: function () { return run; }, _hit: function (l, i) { if (run) hit(run.players[i || 0], l); } };
})();
