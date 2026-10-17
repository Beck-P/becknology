/**
 * BridgeInteractions — Proximity detection, prompts, and actions.
 *
 * Checks if the player is adjacent to an interactive tile and facing it.
 * Shows a prompt. On action key, executes the interaction (navigate to app, show dialog).
 */
var BridgeInteractions = (function () {
  var currentInteraction = null;
  var dialogVisible = false;

  // ---- Targeting ------------------------------------------------------------
  // Anything within REACH tiles (so the 8 tiles round you and the one you
  // stand on) can be used; the one you face wins, then the nearest. An
  // object two tiles ahead counts when a solid tile (a counter, a table)
  // stands between you — shopkeepers behind their counters.
  var REACH = 1.5;

  function facingVec(f) {
    return f === 'right' ? [1, 0] : f === 'left' ? [-1, 0] : f === 'down' ? [0, 1] : [0, -1];
  }

  function solidAt(world, x, y) {
    return !world.collisions[y] || world.collisions[y][x] !== 0;
  }

  function findTarget(world, character) {
    if (!world || !world.interactions) return null;
    if (character.isHidden && character.isHidden()) return null;      // aboard the shuttle
    var px = character.getX(), py = character.getY();
    var fv = facingVec(character.getFacing());
    var best = null, bestScore = Infinity;
    for (var i = 0; i < world.interactions.length; i++) {
      var inter = world.interactions[i];
      if (inter.type === 'hostile' || inter.hidden) continue;
      var dx = inter.x - px, dy = inter.y - py;
      var d = Math.sqrt(dx * dx + dy * dy);
      var dot = d > 0 ? (dx * fv[0] + dy * fv[1]) / d : 0;
      var ok = d <= REACH;
      if (ok && Math.abs(dx) === 1 && Math.abs(dy) === 1) {
        // diagonal: not through a wall corner
        ok = !solidAt(world, px + dx, py) || !solidAt(world, px, py + dy) || !solidAt(world, inter.x, inter.y);
      }
      if (!ok && d <= 2.01 && dot > 0.99) ok = solidAt(world, px + fv[0], py + fv[1]);
      if (!ok) continue;
      // standing on it counts, but something you face right next to you wins
      var score = (d === 0 ? 0.55 : d) - 0.75 * dot;
      if (score < bestScore) { bestScore = score; best = inter; }
    }
    return best;
  }

  // ---- The prompt pill --------------------------------------------------------
  var promptState = { target: null, shown: null, html: '', x: -1, y: -1 };
  var TOUCH = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  var VERBS = {
    enter_world: 'Enter', leave_world: 'Leave', shuttle: 'Board', player: 'Meet', bay_view: 'Look', app: 'Play', cabinet: 'Play', vendor: 'Shop', shop: 'Browse',
    catalog: 'Browse', rest: 'Rest', locker: 'Open', stats_panel: 'View', warp_map: 'Open', sail_to: 'Set sail',
    menu: 'Open', password_gate: 'Enter', dialog: 'Look', random_dialog: 'Look', forage: 'Gather', sell: 'Sell', splice: 'Jack in', game_slot: 'Play', game_scores: 'Read', fish: 'Fish',
    pachinko: 'Play', pachinko_prizes: 'Cash in', outfitter: 'Browse',
    dig: 'Dig', rock: 'Mine', mine_down: 'Climb down', mine_up: 'Climb up', mine_lift: 'Ride', mine_rack: 'Look', mine_slate: 'Read',
    home_door: 'Enter', home_piece: 'Look', farm_plot: 'Tend', farm_tools: 'Open', farm_well: 'Fill',
    farm_house: 'Go in', farm_ledger: 'Read', farm_animal: 'Pet', companion: 'Pet', clinic: 'Sit', rummage: 'Rummage', farm_bin: 'Ship', farm_barn: 'Open', farm_board: 'Read', curio: 'Pick up',
    climb: 'Climb', climb_board: 'Read', climb_register: 'Sign', lift: 'Ride', ski_start: 'Ski', ski_here: 'Ski', expedition: 'Look', park_start: 'Drop in', park_tow: 'Ride', park_board: 'Read', club_door: 'Knock', dance: 'Dance', lodge_fire: 'Warm up', lodge_board: 'Read', dice: 'Play', lodge_room: 'Take a room', fortune: 'Ask', busker: 'Listen', go_sailing: 'Go sailing', midnight_tomb: 'Look', holm: 'Look', exchange: 'Read'
  };

  var PLACE_NAMES = { 'lumar-square': 'Market Square', 'lumar': 'the Harbor', 'arcadia-street': 'the Street',
                      'arcadia-skypad': 'Skyport 7', 'enigma-dock': 'Docking Bay 3', 'enigma': 'the Relay Deck', 'enigma-hydro': 'Hydroponics',
                      'arcadia': 'the Arcade', 'bridge': 'the Bridge', 'quarters': 'Quarters', 'office': 'the Office',
                      'lumar-home': 'your house', 'arcadia-home': 'your apartment', 'arcadia-penthouse': 'the Penthouse', 'lumar-manor': 'Ashcombe House', 'lumar-sapphire': 'Sapphire Port',
                      'lumar-manor-drawing': 'the drawing room', 'lumar-manor-library': 'the library', 'lumar-manor-dining': 'the dining room',
                      'lumar-manor-bedroom': 'the master bedroom', 'lumar-holm-resort': 'the Starling',
                      'verdance': 'the farm', 'verdance-home': 'the farmhouse', 'hoarfell': 'Fellhaven', 'hoarfell-summit': 'the summit', 'hoarfell-ridge': 'the Last Ridge', 'hoarfell-hollow': 'the Hollow', 'hoarfell-park': 'the Park', 'arcadia-club': 'Club Void',
                      'sylvara': 'Elderglade', 'sylvara-hall': 'the Heartwood Hall',
                      'arcadia-casino': 'the casino floor', 'arcadia-casino-cards': 'the Card Room', 'arcadia-casino-vip': 'the Crown Room',
                      'arcadia-casino-dining': 'Aurum' };

  function titleCase(t) {
    return String(t || '').toLowerCase().replace(/(^|[\s\-\/(])([a-z\u00e0-\u00ff])/g, function (m, a, b) {
      return a + b.toUpperCase();
    });
  }

  function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Verb + name from the interaction's data ("PRESS E TO TALK" → Talk).
  function promptParts(inter) {
    var p = String(inter.prompt || '').toUpperCase().trim();
    var label = titleCase(inter.label || '');
    var verb = VERBS[inter.type] || 'Use';
    var m = p.match(/^PRESS E TO (.+)$/);
    if (m) verb = titleCase(m[1]);
    else if (/^RETURN TO /.test(p)) { verb = 'Back to'; label = titleCase(p.slice(10)); }
    else if (/^SAIL /.test(p)) { verb = 'Set sail'; label = titleCase(inter.destinationName || p.replace(/^SAIL (TO |BACK)?/, '') || label); }
    else if (p === 'ACCESS WARP MAP') { verb = 'Open'; label = 'Star map'; }
    else if (p && p.length < 12 && !/PRESS/.test(p)) verb = titleCase(p);
    if (inter.type === 'leave_world' && !/^RETURN/.test(p)) {
      if (inter.leaveTo) {
        verb = 'Out to';
        label = PLACE_NAMES[inter.leaveTo] || titleCase(inter.leaveTo.replace(/^(lumar|arcadia)-/, '').replace(/-/g, ' '));
      } else { verb = 'Return to'; label = 'ship'; }
    }
    if (inter.type === 'app' || inter.type === 'cabinet') verb = 'Play';
    // "Open Locker" + "Storage Locker" → "Open" + "Storage Locker"
    var vw = verb.split(' ');
    if (vw.length > 2 || (vw.length > 1 && label.toLowerCase().indexOf(vw.slice(1).join(' ').toLowerCase()) >= 0)) verb = vw[0];
    label = label.replace(/^Board /, '');
    return { verb: verb, label: label };
  }

  // Talking heads sit higher than counters and doors.
  function promptLift(inter) {
    var p = String(inter.prompt || '').toUpperCase();
    return /TALK/.test(p) ? 1.35 : 0.55;
  }

  function promptEl() {
    var el = document.getElementById('interact-prompt');
    if (el && !el.__bound) {
      el.__bound = true;
      el.addEventListener('mousedown', function (e) { e.stopPropagation(); });
      el.addEventListener('click', function (e) {
        e.preventDefault();
        if (currentInteraction && !dialogVisible) executeInteraction(currentInteraction);
      });
    }
    return el;
  }

  // Called by the world renderer each frame with the on-screen view
  // (CSS px): moves the pill over the current target and fades it.
  function placePrompt(view) {
    var el = promptEl();
    if (!el) return;
    var t = dialogVisible ? null : promptState.target;
    if (t && t.action === 'sit' && typeof BridgeCharacter !== 'undefined' && BridgeCharacter.isSeated && BridgeCharacter.isSeated()) t = null;
    var md = typeof BridgeWorld !== 'undefined' && BridgeWorld.getMode && BridgeWorld.getMode();
    if (md && md.solo) { t = null; promptState.target = null; }            // on skis or on the wall: nothing to press E at
    if (typeof BridgeFishing !== 'undefined' && BridgeFishing.isOpen && BridgeFishing.isOpen()) t = null;   // a line in the water
    if (!t || !view || !view.ts) {
      if (promptState.shown) { el.classList.remove('visible'); promptState.shown = null; }
      return;
    }
    if (promptState.shown !== t) {
      var parts = promptParts(t);
      var html = '<span class="ip-key">' + (TOUCH ? 'Tap' : 'E') + '</span><span class="ip-verb">' + esc(parts.verb) + '</span>' +
                 (parts.label && parts.label.toLowerCase() !== parts.verb.toLowerCase() ? '<span class="ip-label">' + esc(parts.label) + '</span>' : '');
      if (html !== promptState.html) { el.innerHTML = html; promptState.html = html; }
      promptState.shown = t;
      el.classList.add('visible');
    }
    var cx = view.offX + (t.x + 0.5) * view.ts;
    var cy = view.offY + (t.y - promptLift(t)) * view.ts;
    var w = el.offsetWidth || 120, h = el.offsetHeight || 28;
    var x = Math.round(Math.max(8, Math.min(window.innerWidth - w - 8, cx - w / 2)));
    var y = Math.round(Math.max(56, Math.min(window.innerHeight - h - 70, cy - h - 6)));
    if (x !== promptState.x || y !== promptState.y) {
      el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      promptState.x = x; promptState.y = y;
    }
  }

  function getTarget() { return dialogVisible ? null : promptState.target; }

  function update(world, character, controls) {
    if (dialogVisible) {
      // Action: finish the line being typed, or dismiss
      if (controls.consumeAction()) {
        if (typing && !typing.done) typing.finish();
        else hideDialog();
      }
      return;
    }

    // Whatever's close: anything within reach, preferring what you face
    // (see findTarget). No exact-tile standing required.
    var found = findTarget(world, character);
    currentInteraction = found;
    promptState.target = found;

    // Handle action press
    if (currentInteraction && controls.consumeAction()) {
      executeInteraction(currentInteraction);
    }

    // Hostiles run an attack state machine each frame: idle → winding
    // (telegraph) → striking (visual streak fires at the locked target
    // tile) → recovering. Damage only lands if the player is still on
    // the target tile at impact, so a wind-up gives the player time to
    // step away. Movement (pathfinding) only happens in the idle phase.
    updateHostiles(world, character);
  }

  // Walk each hostile one tile toward the player (greedy on the larger
  // axis, fall back to the other axis if blocked). Updates the world's
  // tile + collision grids so the engine renders/blocks at the new spot.
  // Pauses while a dialog / inventory menu is open or the player is
  // dead, so the player isn't ground down while reading text.
  function updateHostiles(world, character) {
    if (!world || !world.interactions || !character) return;
    var menuOpen = (typeof BridgeInventory !== 'undefined') &&
                   BridgeInventory.isMenuOpen && BridgeInventory.isMenuOpen();
    var busy = dialogVisible || menuOpen, out = false;
    if (typeof BridgeInventory !== 'undefined' && BridgeInventory.getStats) {
      var stats = BridgeInventory.getStats();
      out = !!(stats && stats.hp <= 0);
    }
    // Someone else here (js/fight.js): the creatures are shared. One of you runs them; the others play out the
    // strikes they're sent and take whatever lands on them. Nobody's reading pauses the fight for the others.
    var F = typeof BridgeFight !== 'undefined' && BridgeFight.shared() ? BridgeFight : null;
    if (!F && (busy || out)) return;
    var now = performance.now();
    if (F && !F.host()) {
      world.interactions.slice().forEach(function (h) {
        if (h.type === 'hostile' && h._attackPhase && h._attackPhase !== 'idle') updateHostileAttack(h, null, now, 0, 1);
      });
      return;
    }
    var targets = F ? F.targets(character, busy || out) : [character];

    // Build occupancy map so two hostiles can't step onto the same cell (nor onto anyone standing there).
    var occupied = {};
    targets.forEach(function (t) { occupied[t.getX() + ',' + t.getY()] = true; });
    for (var i = 0; i < world.interactions.length; i++) {
      var h = world.interactions[i];
      if (h.type === 'hostile') occupied[h.x + ',' + h.y] = true;
    }

    var C = typeof BridgeCombat !== 'undefined' ? BridgeCombat : null;
    var list = world.interactions.slice();            // a creature can die mid-loop (burning)
    for (var j = 0; j < list.length; j++) {
      var hh = list[j];
      if (hh.type !== 'hostile') continue;
      var tgt = nearestTarget(targets, hh);           // whoever's closest (you, or whoever you're fighting beside)
      var slow = C && C.tick ? C.tick(world, hh, now, tgt) : 1;   // frost slows, embers burn, the warden calls
      if (world.interactions.indexOf(hh) < 0) continue;
      if (!tgt) { if (hh._attackPhase && hh._attackPhase !== 'idle') updateHostileAttack(hh, null, now, 0, slow); continue; }
      var px = tgt.getX(), py = tgt.getY();
      var dx = px - hh.x, dy = py - hh.y;
      var manhattan = Math.abs(dx) + Math.abs(dy);

      // Run the attack state machine first. While the statue is in
      // anything but 'idle' it stays planted (no pathing), and damage
      // only lands on impact if the player is still on the target tile.
      updateHostileAttack(hh, tgt, now, manhattan, slow);

      if (hh._attackPhase && hh._attackPhase !== 'idle') continue;
      if (manhattan > (hh.aggroRange || 6)) continue; // out of aggro range — idle
      var cd = (hh.moveCooldown || 2200) * slow;   // slow stalk — about one tile every 2s
      if (hh._lastMove && (now - hh._lastMove) < cd) continue;

      var stepX, stepY;
      if (hh.range) {
        // a caster keeps its distance: back off when you're close, line up with you, close in when you're far
        if (manhattan <= 1) { stepX = -sign(dx); stepY = -sign(dy); if (stepX && stepY) stepY = 0; }
        else if (dx !== 0 && dy !== 0) { if (Math.abs(dx) <= Math.abs(dy)) { stepX = sign(dx); stepY = 0; } else { stepX = 0; stepY = sign(dy); } }
        else if (manhattan > hh.range) { stepX = sign(dx); stepY = sign(dy); }
        else continue;
        if (!tryStep(world, hh, stepX, stepY, occupied) && manhattan <= 1) tryStep(world, hh, stepY, stepX, occupied);
        hh._lastMove = now;
        continue;
      }
      if (manhattan <= 1) continue;                // adjacent — let the next attack cycle fire

      // Try larger axis first.
      if (Math.abs(dx) >= Math.abs(dy)) { stepX = sign(dx); stepY = 0; }
      else                              { stepX = 0;       stepY = sign(dy); }
      if (!tryStep(world, hh, stepX, stepY, occupied)) {
        // Blocked: find the way round (a headstone, a plinth, another creature) rather than stand there
        var way = pathStep(world, hh, px, py, occupied, (hh.aggroRange || 6) + 3);
        if (way) tryStep(world, hh, way[0], way[1], occupied);
      }
      hh._lastMove = now; // cooldown regardless of success — keeps the cadence steady
    }
  }
  function nearestTarget(targets, h) {
    var best = null, bd = 1e9;
    for (var i = 0; i < targets.length; i++) {
      var d = Math.abs(targets[i].getX() - h.x) + Math.abs(targets[i].getY() - h.y);
      if (d < bd) { bd = d; best = targets[i]; }
    }
    return best;
  }

  // Per-hostile attack state machine. Phases:
  //   idle:       not attacking. Becomes 'winding' when player is in range
  //               (Manhattan distance <= 1).
  //   winding:    telegraph — eyes glow, no movement. Lasts windupMs (500).
  //               Strike target locks in at winding-start.
  //   striking:   the visible strike streak fires from the statue to the
  //               locked tile. Lasts strikeMs (200). Damage resolves at end.
  //   recovering: post-strike cooldown. No attack/move. Lasts recoverMs (700).
  // `target` is who it goes for (you, or someone fighting beside you — js/fight.js); null while it only plays out a
  // strike someone else's game started. Whether a strike lands is always checked against you, here.
  function updateHostileAttack(hostile, target, now, manhattan, slow) {
    var phase = hostile._attackPhase || 'idle';
    var elapsed = now - (hostile._attackStart || 0);
    var WIND     = target ? (hostile.windupMs || 500) * (slow || 1) : hostile._windFor || hostile.windupMs || 500;
    var STRIKE   = hostile.strikeMs  || 200;
    var RECOVER  = (hostile.recoverMs || 700) * (slow || 1);
    var C = typeof BridgeCombat !== 'undefined' ? BridgeCombat : null;

    if (phase === 'idle') {
      if (!target) return;
      // in reach: next to you; a caster down a straight line within its range; the warden two tiles out
      var dx = target.getX() - hostile.x, dy = target.getY() - hostile.y;
      var go = manhattan === 1 || (hostile.reach > 1 && manhattan <= hostile.reach && manhattan > 0) ||
               (hostile.range && manhattan > 1 && manhattan <= hostile.range && (dx === 0 || dy === 0));
      if (go) {
        hostile._attackPhase = 'winding';
        hostile._attackStart = now;
        hostile._windFor = WIND;
        hostile._attackTarget = { x: target.getX(), y: target.getY() };
        if (C && C.attackStart) C.attackStart(hostile, target);
        if (typeof BridgeFight !== 'undefined') BridgeFight.wound(hostile);
      }
      return;
    }
    if (phase === 'winding') {
      if (elapsed < WIND) return;
      hostile._attackPhase = 'striking';
      hostile._attackStart = now;
      if (!(C && C.strikeFx && C.strikeFx(hostile, now)) && typeof BridgeFX !== 'undefined' && BridgeFX.spawnStrike) {
        BridgeFX.spawnStrike(hostile.x, hostile.y, hostile._attackTarget.x, hostile._attackTarget.y);
      }
      return;
    }
    if (phase === 'striking') {
      if (elapsed < STRIKE) return;
      // Resolve hit: damage only if the player stayed on the target tile (or inside a slam, or on the warden's ring).
      var t = hostile._attackTarget;
      var px = BridgeCharacter.getX(), py = BridgeCharacter.getY();
      var st = typeof BridgeInventory !== 'undefined' && BridgeInventory.getStats ? BridgeInventory.getStats() : null;
      var landed = t && !(st && st.hp <= 0) && (C && C.dangerAt && hostile.creature ? C.dangerAt(hostile, px, py) : px === t.x && py === t.y);
      if (landed && typeof BridgeArms !== 'undefined' && BridgeArms.dodging()) {     // mid-roll: it goes through you (js/arms.js)
        landed = false;
        if (typeof BridgeFX !== 'undefined' && BridgeFX.spawnFloatingText) BridgeFX.spawnFloatingText(px, py - 0.3, 'DODGED', '#c8f0ff');
        if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('dodge');
      }
      if (landed) {
        var dmg = C && C.attackDamage && hostile.creature ? C.attackDamage(hostile) : hostile.damage || 5;
        if (C && C.shake) C.shake(dmg >= 12 ? 4 : 2);
        if (typeof BridgeInventory !== 'undefined' && BridgeInventory.takeDamage) {
          BridgeInventory.takeDamage(dmg);
        }
        if (BridgeCharacter.hurt) BridgeCharacter.hurt();          // you flash red on your own pixels and flinch (no box)
        if (typeof BridgeFX !== 'undefined') {
          if (BridgeFX.spawnSparks) BridgeFX.spawnSparks(px, py, '#ff4050', 6);
          if (BridgeFX.spawnFloatingText) BridgeFX.spawnFloatingText(px, py - 0.3, '-' + dmg, '#ff5060');
        }
      }
      hostile._attackPhase = 'recovering';
      hostile._attackStart = now;
      return;
    }
    if (phase === 'recovering') {
      if (elapsed < RECOVER) return;
      hostile._attackPhase = 'idle';
      hostile._attackTarget = null;
    }
  }

  function sign(n) { return n > 0 ? 1 : n < 0 ? -1 : 0; }

  // The first step of the shortest walk from a creature to any tile beside the player (a search kept within `lim`
  // tiles of it), or null if there's no way through.
  function pathStep(world, h, px, py, occupied, lim) {
    var C = world.collisions, seen = {}, q = [[h.x, h.y, null]], head = 0;
    seen[h.x + ',' + h.y] = true;
    while (head < q.length && head < 900) {
      var c = q[head++];
      var D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var i = 0; i < 4; i++) {
        var nx = c[0] + D[i][0], ny = c[1] + D[i][1], k = nx + ',' + ny;
        if (seen[k] || Math.abs(nx - h.x) > lim || Math.abs(ny - h.y) > lim) continue;
        seen[k] = true;
        if (nx === px && ny === py) continue;
        if (!C[ny] || C[ny][nx] !== 0 || occupied[k]) continue;
        var first = c[2] || D[i];
        if (Math.abs(nx - px) + Math.abs(ny - py) === 1) return first;
        q.push([nx, ny, first]);
      }
    }
    return null;
  }

  function tryStep(world, hostile, stepX, stepY, occupied) {
    var nx = hostile.x + stepX, ny = hostile.y + stepY;
    if (!world.collisions[ny] || world.collisions[ny][nx] !== 0) return false;
    var key = nx + ',' + ny;
    if (occupied[key]) return false;
    // Hostiles are entity-overlays — we only flip collision so the player
    // can't walk through them. world.tiles is left alone so movement
    // doesn't leave a trail of restored cells behind.
    world.collisions[hostile.y][hostile.x] = 0;
    delete occupied[hostile.x + ',' + hostile.y];
    hostile.x = nx; hostile.y = ny;
    world.collisions[ny][nx] = 1;
    occupied[key] = true;
    return true;
  }

  function executeInteraction(inter) {
    if (typeof BridgeAudio !== 'undefined' && inter.type !== 'farm_plot') BridgeAudio.sfx(/^(enter_world|leave_world|password_gate)$/.test(inter.type) ? 'door' : 'open');   // the field makes its own sounds
    if (typeof BridgeGames !== 'undefined') BridgeGames.note(inter);      // a game played: it waits in the game room now
    var hits = [];
    if (typeof BridgeQuests !== 'undefined') {
      hits = BridgeQuests.onInteract(BridgeWorld.getWorldId(), inter) || [];
      if (inter.home) BridgeQuests.onInteract(inter.home.world, { label: inter.home.label });   // crew aboard (js/crew.js)
    }
    if (typeof BridgeHours !== 'undefined' && BridgeHours.gate(inter)) return;   // a shop shut for the night (js/hours.js)
    if (typeof BridgeLegacy !== 'undefined' && BridgeLegacy.handle(inter)) return; // Captain Mira's statue: room for one more (js/legacy.js)
    var person = (inter.type === 'dialog' || inter.type === 'random_dialog') && typeof BridgePeople !== 'undefined' &&
      BridgePeople.find(BridgeWorld.getWorldId(), inter.label);
    if (person) { showConversation(person, inter); return; }
    // a clue with its own moment (quests.json `say`): that, in place of the thing's usual words
    var moment = hits.filter(function (c) { return c.say; })[0];
    if (moment && (inter.type === 'dialog' || inter.type === 'random_dialog')) { showDialog(inter.label, moment.say, inter); return; }
    var biz = typeof BridgeBusiness !== 'undefined' && BridgeBusiness.find(BridgeWorld.getWorldId(), inter.label);
    if (biz) { showBusiness(biz, inter); return; }
    // sit, sleep, look out of the window (js/actions.js) instead of a text box
    if (inter.action && typeof BridgeActions !== 'undefined') { BridgeActions.run(inter); return; }
    if (OWN[inter.type]) { OWN[inter.type](inter); return; }        // a type some module handles itself (register)
    switch (inter.type) {
      case 'app':
        // the Bridge's own games open over the world, like the arcade cabinets (no reload)
        if (/^\/(chess|cipher-room|typist|genart|runouts|asteroids|breakout|helicopter|missile-command|space-invaders)\b/.test(inter.target || '') &&
            typeof BridgeCabinetModal !== 'undefined') {
          BridgeCabinetModal.show({ url: inter.target, title: inter.label, gameKey: inter.gameKey });
          break;
        }
        // Save world position, then navigate to app
        BridgeState.setWorldPos({
          worldId: BridgeWorld.getWorld().tileset,
          x: BridgeCharacter.getX(),
          y: BridgeCharacter.getY(),
          facing: BridgeCharacter.getFacing()
        });
        BridgeState.transition('redirect', { url: inter.target });
        break;

      case 'forage':
        var bare = typeof BridgeForage !== 'undefined' ? BridgeForage.gather(inter) : 'NOTHING HERE.';
        if (bare) showDialog(inter.label, bare, inter);
        break;

      case 'sell':
        showSellDialog(inter);
        break;

      case 'dig':                   // a treasure map's spot (js/treasure.js)
        if (typeof BridgeTreasure !== 'undefined') BridgeTreasure.dig(inter);
        break;

      case 'rock': case 'mine_down': case 'mine_up': case 'mine_lift': case 'mine_rack': case 'mine_slate':
        if (typeof BridgeMine !== 'undefined') BridgeMine.use(inter);         // the Rose Mine (js/mine.js)
        break;

      case 'climb': case 'climb_board': case 'climb_register': case 'lift': case 'ski_start': case 'ski_gate': case 'ski_here': case 'park_start': case 'park_tow': case 'park_board':   // Hoarfell (js/worlds/hoarfell.js)
        if (typeof BridgeHoarfell !== 'undefined') BridgeHoarfell.use(inter);
        break;

      case 'clinic': case 'rummage': case 'fortune': case 'busker':     // the District's shops and the Skywalk (js/district.js)
        if (typeof BridgeDistrict !== 'undefined') BridgeDistrict.use(inter);
        break;

      case 'companion':                                                 // your pet, following you (js/pet.js)
        if (typeof BridgePet !== 'undefined') BridgePet.use(inter);
        break;

      case 'farm_animal':                                               // the hens and cows (js/animals.js)
        if (typeof BridgeAnimals !== 'undefined') BridgeAnimals.use(inter);
        break;

      case 'club_door': case 'dance':                                    // Club Void (js/dance.js)
        if (typeof BridgeDance !== 'undefined') BridgeDance.use(inter);
        break;

      case 'lodge_fire': case 'lodge_board': case 'dice': case 'lodge_room':               // the Snowcap Lodge (js/lodge.js)
        if (typeof BridgeLodge !== 'undefined') BridgeLodge.use(inter);
        break;

      case 'midnight_tomb':                                             // the violet tomb on Midnight Isle (js/combat.js)
        if (typeof BridgeCombat !== 'undefined') BridgeCombat.tomb(inter);
        break;

      case 'expedition':                                                // past the Hoarspire (js/expedition.js)
        if (typeof BridgeExpedition !== 'undefined') BridgeExpedition.use(inter);
        break;

      case 'curio':                                                     // one of the old curios (js/magic.js)
        if (typeof BridgeMagic !== 'undefined') BridgeMagic.use(inter);
        break;

      case 'farm_house': case 'farm_bin': case 'farm_barn': case 'farm_board': case 'farm_ledger':   // running the farm (js/homestead.js)
        if (typeof BridgeHomestead !== 'undefined') BridgeHomestead.use(inter);
        break;

      case 'farm_plot': case 'farm_tools': case 'farm_well':   // the field on Verdance (js/farm.js)
        if (typeof BridgeFarm !== 'undefined') BridgeFarm.use(inter);
        break;

      case 'home_door': case 'home_piece':   // a home to buy or go into, furniture you use (js/home.js)
        if (typeof BridgeHome !== 'undefined') BridgeHome.use(inter);
        break;

      case 'outfitter':             // suits and packs (js/gear.js); the bridge's coat rack is the wardrobe
        if (typeof BridgeGear !== 'undefined') BridgeGear.open(inter.wardrobe ? {} : { shop: inter.shop, intro: inter.dialog });
        break;

      case 'dialog':
        showDialog(inter.label, inter.dialog, inter);
        break;

      case 'random_dialog':
        var messages = inter.messages || [inter.dialog];
        var msg = messages[Math.floor(Math.random() * messages.length)];
        showDialog(inter.label, msg, inter);
        break;

      case 'leave_world':
        // If a parent world is specified, warp back to it (e.g., arcade
        // interior leaves to the street, not all the way to the cockpit).
        if (inter.leaveTo) {
          BridgeWorld.enterWorld(inter.leaveTo, inter.leaveSpawn);
        } else {
          BridgeWorld.leave();
        }
        break;

      case 'enter_world':
        // Step into another world (a building interior, a cave, etc.)
        // with a quick fade transition.
        BridgeWorld.enterWorld(inter.target, inter.spawn);
        break;

      case 'password_gate':
        // a gate onto another world stays open once you've got the code
        if (inter.targetWorld && gateOpen(inter)) BridgeWorld.enterWorld(inter.targetWorld, inter.spawn);
        else showPasswordDialog(inter);
        break;

      case 'splice':
        if (typeof BridgeSplice !== 'undefined') BridgeSplice.open();
        break;

      case 'pachinko':
        if (typeof BridgePachinko !== 'undefined') BridgePachinko.open(inter);
        break;

      case 'pachinko_prizes':
        if (typeof BridgePachinko !== 'undefined') BridgePachinko.prizes(inter);
        break;

      case 'fish':
        if (typeof BridgeFishing !== 'undefined') BridgeFishing.open(inter);
        break;

      case 'player':                                                  // another pilot, playing alongside you (js/multi.js)
        if (typeof BridgeMulti !== 'undefined') BridgeMulti.menu(inter.pid);
        break;

      case 'game_slot':
      case 'game_scores':
        if (typeof BridgeGames !== 'undefined') BridgeGames.use(inter);
        break;

      case 'sail_to':
        BridgeWorld.sailTo(inter.destination, inter.destinationName || inter.label);
        break;

      case 'chapel_candle': case 'chapel_bell': case 'sea_chart': case 'charts': case 'registry': case 'hands': case 'charters':
      case 'palace_gate': case 'audience': case 'commissions':
        if (typeof BridgeCrown !== 'undefined') BridgeCrown.use(inter);   // Crownhaven's rooms (js/crown.js)
        break;
      case 'exchange':                                                   // the Merchants' Exchange board (js/harbour.js)
        if (typeof BridgeHarbour !== 'undefined') BridgeHarbour.exchange();
        break;
      case 'holm':                                                       // your own island (js/holm.js)
        if (typeof BridgeHolm !== 'undefined') BridgeHolm.use(inter);
        break;
      case 'go_sailing':                                                 // your sloop at the pier (js/sloop.js)
        if (!(typeof BridgeSloop !== 'undefined' && (BridgeSloop.board || BridgeSloop.start)(BridgeWorld.getWorldId())) && typeof BridgeVoyage !== 'undefined')
          BridgeVoyage.start(BridgeWorld.getWorldId());
        break;

      case 'menu':
        showMenuDialog(inter);
        break;

      case 'catalog':
      case 'shop':
        if (typeof BridgeCatalog !== 'undefined') BridgeCatalog.show(inter.shop);
        break;

      case 'cabinet':
        if (typeof BridgeCabinetModal !== 'undefined') {
          BridgeCabinetModal.show({ url: inter.target, title: inter.label, gameKey: inter.gameKey });
        }
        break;

      case 'locker':
        if (typeof BridgeLocker !== 'undefined') BridgeLocker.show();
        break;

      case 'stats_panel':
        if (typeof BridgeStatsPanel !== 'undefined') BridgeStatsPanel.show();
        break;

      case 'vendor':
        // Adventure-shop dialog — buys BridgeItems (food, potions, tools)
        // with server-side coins via BridgeProgression. Distinct from the
        // decor 'shop' / 'catalog' path which uses BridgeCatalog.
        showVendorDialog(inter);
        break;

      case 'rest':
        // Inn-style rest: spend coins via BridgeProgression, restore HP + energy.
        showRestDialog(inter);
        break;

      case 'hostile':
        // Stub: you can't strike back yet. The statue keeps draining
        // until you walk away. Real combat lands in a follow-up.
        showDialog(inter.label || 'HOSTILE',
          'STONE THAT REMEMBERS\\nHOW TO HURT.\\n\\nFISTS WON\\u2019T DENT IT.\\n\\nBACK AWAY.');
        break;

      case 'shuttle':
        if (typeof BridgeShip !== 'undefined') BridgeShip.board();
        break;

      case 'bay_view':
        showDialog(inter.label, typeof BridgeShip !== 'undefined' ? BridgeShip.bayText() : '');
        break;

      case 'deck':
        // the bridge's stations: chart desk, wireless, letters, gauges, scope, decor slots (js/worlds/bridge.js)
        if (typeof BridgeDeck !== 'undefined') BridgeDeck.use(inter);
        break;

      case 'warp_map':
        // Save the player's bridge-room position so closing the warp map
        // returns them right back to the hologram (not the door spawn).
        var w = BridgeWorld.getWorld();
        if (w) {
          BridgeState.setWorldPos({
            worldId: w.tileset,
            x: BridgeCharacter.getX(),
            y: BridgeCharacter.getY(),
            facing: BridgeCharacter.getFacing()
          });
        }
        BridgeState.transition('starmap');
        break;
    }
  }

  function showMenuDialog(inter) {
    dialogVisible = true;
    if (typeof BridgeControls !== 'undefined' && BridgeControls.disable) {
      BridgeControls.disable();
    }
    var promptEl = document.getElementById('interact-prompt');
    if (promptEl) promptEl.classList.remove('visible');

    var overlay = document.getElementById('world-overlay');
    var dialogEl = dialogShell('menu');

    var html = '<div class="wd-body"><div class="wd-title">' + esc(inter.label) + '</div>';
    if (inter.dialog) html += '<div class="wd-text">' + esc(reflow(inter.dialog)) + '</div>';
    if (inter.item && typeof BridgeItems !== 'undefined') html += weaponCard(BridgeItems.get(inter.item), { compare: true, title: true });   // what's being made
    html += '<div class="wd-options">';
    for (var i = 0; i < inter.options.length; i++) {
      html += '<button data-opt="' + i + '" class="wd-opt' + (i === 0 ? ' active' : '') + '">' + esc(inter.options[i].label) + '</button>';
    }
    html += '</div>' + hintHTML('Esc', 'Cancel') + '</div>';

    dialogEl.innerHTML = html;
    overlay.appendChild(dialogEl);
    requestAnimationFrame(function () { dialogEl.classList.add('visible'); });

    // pick with the mouse, or arrows / W S and E / Enter
    var btns = dialogEl.querySelectorAll('.wd-opt');
    var sel = 0;
    function choose(n) {
      sel = (n + btns.length) % btns.length;
      for (var j = 0; j < btns.length; j++) btns[j].classList.toggle('active', j === sel);
    }
    for (var b = 0; b < btns.length; b++) {
      (function (btn, idx) {
        btn.addEventListener('mouseenter', function () { choose(idx); });
        btn.addEventListener('click', function () { handleMenuOption(inter.options[idx]); });
      })(btns[b], b);
    }

    function handleEsc(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup();
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault(); choose(sel + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault(); choose(sel - 1);
      } else if (e.key === 'Enter' || e.key === 'e' || e.key === 'E') {
        e.preventDefault(); handleMenuOption(inter.options[sel]);
      }
    }
    document.addEventListener('keydown', handleEsc);

    function cleanup() {
      document.removeEventListener('keydown', handleEsc);
      hideDialog();
      if (typeof BridgeControls !== 'undefined' && BridgeControls.enable) {
        BridgeControls.enable();
      }
    }

    function handleMenuOption(opt) {
      cleanup();
      switch (opt.action) {
        case 'voyage':
          if (typeof BridgeVoyage !== 'undefined') BridgeVoyage.start(BridgeWorld.getWorldId());
          break;
        case 'sail_to':
          BridgeWorld.sailTo(opt.destination, opt.destinationName || opt.label);
          break;
        case 'enter_world':
          BridgeWorld.enterWorld(opt.target, opt.spawn);
          break;
        case 'password_gate':
          showPasswordDialog(opt);
          break;
        case 'leave_world':
          if (opt.leaveTo) {
            BridgeWorld.enterWorld(opt.leaveTo, opt.leaveSpawn);
          } else {
            BridgeWorld.leave();
          }
          break;
        case 'mine_floor':
          if (typeof BridgeMine !== 'undefined') BridgeMine.goFloor(opt.floor);
          break;
        case 'home_buy':
          if (typeof BridgeHome !== 'undefined') BridgeHome.buy(opt.home);
          break;
        case 'treasure_buy':
          if (typeof BridgeTreasure !== 'undefined') BridgeTreasure.buy(opt.map);
          break;
        case 'mine_upgrade':
          if (typeof BridgeMine !== 'undefined') BridgeMine.forge(opt.to);
          break;
        case 'ski_run':
          if (typeof BridgeHoarfell !== 'undefined') BridgeHoarfell.ski(opt.run, { rival: !!opt.rival });
          break;
        case 'climb_race':
          if (typeof BridgeClimb !== 'undefined') BridgeClimb.start(opt.route, { rival: true });
          break;
        case 'park_run':
          if (typeof BridgeSki !== 'undefined') BridgeSki.park();
          break;
        case 'close':
        default:
          break;
      }
    }
  }

  // ---- dialogs, styled for the world you're in ---------------------------------------------
  // parchment in Lumar, a neon terminal in Arcadia, a CRT on Enigma, violet
  // glass at the Singularity, gingham on Verdance, a holo panel aboard the ship (css .wd-*)
  function dialogTheme() {
    var id = (BridgeWorld.getWorldId && BridgeWorld.getWorldId()) || '';
    var w = BridgeWorld.getWorld();
    var ts = (w && w.tileset) || '';
    if (/^lumar/.test(id) || ts === 'lumar' || ts === 'tavern' || ts === 'cave' || ts === 'tower') return 'parchment';
    if (ts === 'arcadia' || /^(arcadia|cyber|chrome|junk|tech)/.test(id)) return 'neon';
    if (ts === 'enigma' || id === 'enigma') return 'crt';
    if (ts === 'singularity' || id === 'singularity') return 'void';
    if (ts === 'verdance' || /^verdance/.test(id)) return 'meadow';
    if (ts === 'hoarfell' || /^hoarfell/.test(id)) return 'frost';
    if (ts === 'sylvara' || /^sylvara/.test(id)) return 'sylvan';
    return 'holo';
  }

  function dialogShell(kind) {
    var el = document.createElement('div');
    el.id = 'world-dialog';
    el.className = 'world-dialog wd-' + dialogTheme() + (kind ? ' wd-' + kind : '');
    return el;
  }

  // On touch the hint is a close button: a tap does what its key does (Esc)
  document.addEventListener('click', function (e) {
    var h = e.target.closest && e.target.closest('.world-dialog .wd-hint');
    if (!h) return;
    e.preventDefault(); e.stopPropagation();
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  }, true);

  function hintHTML(key, text) {
    return '<div class="wd-hint"><span class="ip-key">' + key + '</span>' + text + '</div>';
  }

  // the face of whoever stands at the interaction's tile (a scene actor)
  function portraitFor(inter) {
    var w = BridgeWorld.getWorld();
    if (!inter || !w || !w.scene || !w.scene.actors) return null;
    for (var i = 0; i < w.scene.actors.length; i++) {
      var a = w.scene.actors[i];
      if (Math.abs(a.x - inter.x) <= 0 && Math.abs(a.y - inter.y) <= 0) return a.sheet;
    }
    return null;
  }

  // Their face on the talk card: the portrait (assets/portraits/<sheet>.png, tools/bridge-art/portraits.py — seen from
  // the front, a strip of expressions; it blinks now and then), or with no portrait file the head and shoulders cropped
  // out of the sheet. Returns the portrait's handle (set(expr)) or null.
  var PORTRAIT_PX = 64;          // a portrait's native size: the card shows it ×2, ×1 on a phone (css .wd-portrait)
  function drawPortrait(canvas, sheet) {
    if (typeof BridgeLook !== 'undefined' && BridgeLook.npcFace)
      return BridgeLook.npcFace(canvas, sheet, { blink: true, fallback: function () { cropPortrait(canvas, sheet); } });
    cropPortrait(canvas, sheet);
    return null;
  }
  // how a reply looks on their face: its mood's words first, else which way their feeling moved
  function expressionOf(d) {
    var m = String(d && d.mood || '').toLowerCase();
    if (/surpris|shock|startl|astonish|amaz|stunn|aghast|taken aback/.test(m)) return 'surprised';
    if (/sad|sorrow|grie|melanchol|wistful|hurt|upset|lonely|gloom|forlorn|tearful|sorry|regret|disappoint/.test(m)) return 'sad';
    if (/happy|glad|cheer|delight|amus|pleas|joy|excit|fond|merry|playful|warm|grate|thrill|giddy|proud|tickled|bright/.test(m)) return 'happy';
    var f = d && +d.feeling;
    return f >= 1 ? 'happy' : f <= -2 ? 'sad' : 'neutral';
  }
  function cropPortrait(canvas, sheet) {
    var img = new Image();
    img.onload = function () {
      // idle frame, facing down: find the top of the head, frame head and shoulders
      var t = document.createElement('canvas');
      t.width = 32; t.height = 48;
      var tc = t.getContext('2d');
      tc.drawImage(img, 0, 0, 32, 48, 0, 0, 32, 48);
      var a = tc.getImageData(0, 0, 32, 48).data, top = 0, l = 32, r = -1;
      for (var y = 0; y < 48 && !top; y++) for (var x = 0; x < 32; x++) if (a[(y * 32 + x) * 4 + 3] > 0) { top = y; break; }
      for (var y2 = top; y2 < Math.min(48, top + 14); y2++) for (var x2 = 0; x2 < 32; x2++) if (a[(y2 * 32 + x2) * 4 + 3] > 0) { l = Math.min(l, x2); r = Math.max(r, x2); }
      var size = Math.max(22, Math.min(28, 2 * Math.max(16 - l, r + 1 - 16)));      // wide enough for an elf's ears or a hat's brim
      var c = canvas.getContext('2d');
      c.imageSmoothingEnabled = false;
      c.clearRect(0, 0, canvas.width, canvas.height);
      c.drawImage(t, 16 - size / 2, Math.max(0, top - 2), size, size, 0, 0, canvas.width, canvas.height);
    };
    img.src = '/bridge/assets/characters/' + sheet + '.png';
  }

  var typing = null;      // the line being typed out

  // Dialog text was hard-wrapped for a narrow monospace box; join the lines
  // of each paragraph so it wraps to the dialog (lists and labels stay put).
  function reflow(t) {
    return String(t || '').replace(/\\n/g, '\n').split(/\n\s*\n/).map(function (para) {
      var lines = para.split('\n'), out = lines[0] || '';
      for (var i = 1; i < lines.length; i++) {
        var L = lines[i];
        var keep = /^\s*[*\-\u2022>\[]/.test(L) || /[:\]]\s*$/.test(lines[i - 1]);
        out += (keep ? '\n' : ' ') + L.trim();
      }
      return out;
    }).join('\n\n');
  }

  function showDialog(title, text, inter) {
    hideDialog();                      // one dialog at a time: drop any line still typing
    dialogVisible = true;
    var promptEl = document.getElementById('interact-prompt');
    if (promptEl) promptEl.classList.remove('visible');

    var overlay = document.getElementById('world-overlay');
    var sheet = portraitFor(inter);
    var dialogEl = dialogShell(sheet ? 'talk' : null);
    var body = reflow(text);
    dialogEl.innerHTML =
      (sheet ? '<canvas class="wd-portrait" width="' + PORTRAIT_PX + '" height="' + PORTRAIT_PX + '"></canvas>' : '') +
      '<div class="wd-body">' +
        '<div class="wd-title">' + esc(title || '') + '</div>' +
        '<div class="wd-text"></div>' +
        hintHTML(TOUCH ? 'Tap' : 'E', '<span class="wd-hint-text">Close</span>') +
      '</div>';
    overlay.appendChild(dialogEl);
    if (sheet) drawPortrait(dialogEl.querySelector('.wd-portrait'), sheet);
    requestAnimationFrame(function () { dialogEl.classList.add('visible'); });

    // type it out; E finishes the line, then closes
    var out = dialogEl.querySelector('.wd-text');
    var hint = dialogEl.querySelector('.wd-hint-text');
    var i = 0;
    hint.textContent = 'Skip';
    dialogEl.classList.add('typing');
    var line = typing = { done: false, finish: function () {
      clearInterval(line.timer);
      out.textContent = body;
      line.done = true;
      hint.textContent = 'Close';
      dialogEl.classList.remove('typing');
    } };
    line.timer = setInterval(function () {
      i = Math.min(body.length, i + 2);
      out.textContent = body.slice(0, i);
      if (i >= body.length) line.finish();
    }, 22);
    dialogEl.addEventListener('click', function () {
      if (typing && !typing.done) typing.finish(); else hideDialog();
    });
    // Esc puts it away too (it didn't: the dialog stayed up, and the next E only closed it, which read as E ignored)
    function onEsc(e) {
      if (!document.body.contains(dialogEl)) { document.removeEventListener('keydown', onEsc, true); return; }
      if (e.key !== 'Escape') return;
      e.preventDefault(); e.stopPropagation();
      document.removeEventListener('keydown', onEsc, true);
      hideDialog();
    }
    document.addEventListener('keydown', onEsc, true);
  }

  // A business's books (js/business.js): buy it; or see when it opens, who works it and what it's made, hire (a hand,
  // a manager, a specialist), move someone to another of yours or let them go, collect what a hand's holding, upgrade
  // it, put crew in charge. `view`: { v: 'main' | 'hire' | 'person', who }.
  function stockNames(biz) {
    var names = (biz.stock || []).slice(0, 4).map(function (it) { var I = typeof BridgeItems !== 'undefined' && BridgeItems.get(it); return (I ? I.name : it).toLowerCase(); });
    return names.join(', ') + ((biz.stock || []).length > 4 ? '…' : '');
  }
  // someone at a business, with their face (js/look.js), what they do there and what they cost
  function personRow(p, id, right) {
    var f = BridgeBusiness.faceOf(p, id);
    return '<div class="wd-sell-row biz-person"><canvas class="biz-face" width="24" height="24" data-seed="' + esc(f.seed) + '" data-style="' + f.style +
      '" data-colour="' + f.colour + '"' + (f.wild ? ' data-wild="1"' : '') + '></canvas><span class="bp-name">' + esc(p.name) + '<small>' + esc(p.title) + '</small></span>' +
      '<span class="bp-perk">' + esc(BridgeBusiness.perkOf(p, id)) + '</span><span class="bp-wage">' + esc(right) + '</span></div>';
  }
  function paintFaces(el) {
    if (typeof BridgeLook === 'undefined' || !BridgeLook.face) return;
    el.querySelectorAll('canvas.biz-face').forEach(function (cv) { BridgeLook.face(cv, cv.getAttribute('data-seed'), cv.getAttribute('data-style'), cv.getAttribute('data-colour'), !!cv.getAttribute('data-wild')); });
  }
  var KIND_NAME = { stall: 'A stall', shop: 'A shop', venue: 'A venue', enterprise: 'An enterprise', legacy: 'A legacy' };
  function showBusiness(biz, inter, note, view) {
    hideDialog();
    dialogVisible = true;
    if (typeof BridgeControls !== 'undefined' && BridgeControls.disable) BridgeControls.disable();
    var overlay = document.getElementById('world-overlay');
    var dialogEl = dialogShell('shop');
    var B = BridgeBusiness, id = biz.id, own = B.owned(id), acts = [], lines = '';
    view = own ? view || { v: 'main' } : { v: 'buy' };
    function row(k, v) { return '<div class="wd-sell-row"><span>' + esc(k) + '</span><span>' + esc(v) + '</span></div>'; }
    var st = B.status(id), slots = B.SLOTS[biz.kind] || 1;
    var open = B.openNow(id) ? 'open now' : 'shut now';
    if (view.v === 'buy') {
      lines = '<div class="wd-text">' + esc(reflow(biz.pitch)) + '</div><div class="wd-sell">' +
        row(KIND_NAME[biz.kind] || 'A business', 'room for ' + slots + (slots > 1 ? ' staff' : ' on staff')) +
        row('Hours', st.hours + ' (' + open + ')') +
        row('Takings', biz.rate + ' coins an open hour, with a hand on') +
        row('To open', st.needsManager ? 'it needs a manager' : 'a hand keeps it open; a manager runs it') +
        (biz.stock ? row('Sells', stockNames(biz) + ': stock it yourself, or it buys in at cost') : '') + '</div>';
      acts.push({ label: 'Buy it for ' + biz.price.toLocaleString() + ' coins', act: 'buy' });
    } else if (view.v === 'hire') {
      var cands = B.candidates(id);
      lines = '<div class="wd-text">' + esc(cands.length ? "WHO'S LOOKING FOR WORK TODAY (NEW FACES TOMORROW). THE FIRST DAY'S WAGE IS PAID UP FRONT, THEN ONE EVERY DAY." : 'NOBODY ELSE IS LOOKING TODAY. TRY TOMORROW.') + '</div>' +
        '<div class="wd-sell">' + cands.map(function (c) { return personRow(c, id, c.wage.toLocaleString() + '/day'); }).join('') + '</div>';
      cands.forEach(function (c) { acts.push({ label: 'Hire ' + c.name + ' (' + c.title.toLowerCase() + ', ' + c.wage.toLocaleString() + ' a day)', act: 'hire', cand: c }); });
      acts.push({ label: 'Back', act: 'back' });
    } else if (view.v === 'person') {
      var p = B.staff().filter(function (x) { return x.id === view.who; })[0];
      if (!p) { showBusiness(biz, inter, note); return; }
      var days = Math.max(0, Math.floor((Date.now() - p.hired) / 86400000));
      lines = '<div class="wd-sell">' + personRow(p, id, p.wage.toLocaleString() + '/day') + row('Wage', p.wage.toLocaleString() + ' coins a day') +
        row('Brought in today', '' + B.status(id).today.toLocaleString() + ' coins (all of ' + biz.name + ')') +
        row('With you', days ? days + (days === 1 ? ' day' : ' days') : 'since today') +
        (p.arrives && p.arrives > Date.now() ? row('On the way', 'starts in about ' + Math.ceil((p.arrives - Date.now()) / 3600000) + 'h') : '') +
        (p.owe > 0 ? row('Owed', Math.ceil(p.owe).toLocaleString() + ' coins') : '') + '</div>';
      B.summary().forEach(function (o) { if (o.id !== id && B.room(o.id)) acts.push({ label: 'Send to ' + o.name, act: 'move', who: p.id, to: o.id }); });
      acts.push({ label: 'Let ' + p.name + ' go', act: 'dismiss', who: p.id });
      acts.push({ label: 'Back', act: 'back' });
    } else {
      var bs = B.state(id), up = B.nextUpgrade(id), mgr = bs.manager && BridgePeople.all()[bs.manager];
      var working = st.staff.map(function (x) { return x.name + ' (' + x.title.toLowerCase() + ')'; });
      if (mgr) working.unshift(mgr.name + ' (crew)');
      var why = !st.running ? (st.needsManager ? 'shut: it needs a manager' : 'shut: nobody working it') : B.perHour(id).toLocaleString() + ' coins an open hour';
      lines = (inter && inter.dialog ? '<div class="wd-text">' + esc(reflow(inter.dialog)) + '</div>' : '') +
        '<div class="wd-sell">' + row('Hours', st.hours + ' (' + open + ')') + row('Takings', why) +
        (mgr ? row('Run by', mgr.name + ' (crew)') : '') + (st.staff.length ? st.staff.map(function (x) { return personRow(x, id, x.wage.toLocaleString() + '/day'); }).join('') : row('Staff', 'nobody yet')) +
        (st.wages ? row('Wages', st.wages.toLocaleString() + ' coins a day') : '') +
        row('Made today', st.today.toLocaleString() + ' coins') +
        (B.stockOf(id) ? row('Stock', B.stockOf(id).units ? B.stockOf(id).units + ' units, about ' + B.stockOf(id).hours + ' open hours' : 'none: buying in at cost (takings down a third)') : '') +
        (st.banks ? row('Banked to you', st.banked.toLocaleString() + ' coins so far') : row('Waiting to collect', B.pending(id).toLocaleString() + ' coins')) + '</div>';
      if (!st.banks || B.pending(id)) acts.push({ label: B.pending(id) ? 'Collect ' + B.pending(id).toLocaleString() + ' coins' : 'Nothing to collect yet', act: 'collect', off: !B.pending(id) });
      var canStock = B.stockable(id);
      if (biz.stock) acts.push({ label: canStock.length ? 'Stock it from your pack (' + canStock.reduce(function (a, x) { return a + x.units; }, 0) + ' units)' : 'Nothing in your pack it sells', act: 'stock', off: !canStock.length });
      if (B.room(id)) acts.push({ label: 'Hire someone (' + st.staff.length + ' of ' + slots + ')', act: 'hireview' });
      st.staff.forEach(function (x) { acts.push({ label: x.name + ': move or let go', act: 'person', who: x.id }); });
      if (up) acts.push({ label: up.name + ' (' + up.cost.toLocaleString() + ')', act: 'upgrade' });
      if (mgr) acts.push({ label: 'Send ' + mgr.name + ' back to the ship', act: 'assign', who: null });
      else B.freeCrew().forEach(function (c) { acts.push({ label: 'Put ' + c.name + ' in charge', act: 'assign', who: c.id }); });
    }
    acts.push({ label: 'Leave', act: 'close' });
    dialogEl.innerHTML = '<div class="wd-body"><div class="wd-title">' + esc(biz.name) + '</div>' + lines +
      (note ? '<div class="wd-text wd-note">' + esc(note) + '</div>' : '') +
      '<div class="wd-options">' + acts.map(function (a, i) {
        return '<button class="wd-opt' + (i === 0 ? ' active' : '') + '"' + (a.off ? ' disabled' : '') + '>' + esc(a.label) + '</button>';
      }).join('') + '</div>' + hintHTML('Esc', 'Leave') + '</div>';
    overlay.appendChild(dialogEl);
    paintFaces(dialogEl);
    requestAnimationFrame(function () { dialogEl.classList.add('visible'); });
    var btns = dialogEl.querySelectorAll('.wd-opt'), sel = 0, busy = false;
    function choose(n) { sel = (n + btns.length) % btns.length; for (var j = 0; j < btns.length; j++) btns[j].classList.toggle('active', j === sel); }
    function close() {
      document.removeEventListener('keydown', onKey, true);
      hideDialog();
      if (typeof BridgeControls !== 'undefined' && BridgeControls.enable) BridgeControls.enable();
    }
    function reopen(msg, v) { document.removeEventListener('keydown', onKey, true); showBusiness(biz, inter, msg, v); }
    function fail(r) { return !r || r.reason === 'offline' || r.reason === 'error' || r.reason === 'no_pilot' || r.reason === 'no_client' ? 'NO WAY TO MOVE COINS RIGHT NOW.' : r.reason === 'full' ? 'NO ROOM FOR ANYONE ELSE THERE.' : 'NOT ENOUGH COINS.'; }
    function act(a) {
      if (busy || a.off) return;
      if (a.act === 'close') { close(); return; }
      if (a.act === 'back') { reopen(null); return; }
      if (a.act === 'hireview') { reopen(null, { v: 'hire' }); return; }
      if (a.act === 'person') { reopen(null, { v: 'person', who: a.who }); return; }
      busy = true;
      if (a.act === 'buy') B.buy(id).then(function (r) {
        if (r.ok && typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast('Business', biz.name, 'Yours now');
        reopen(r.ok ? (st.needsManager ? "IT'S YOURS. IT WON'T OPEN WITHOUT A MANAGER: HIRE ONE." : "IT'S YOURS. HIRE A HAND TO KEEP IT OPEN.") : fail(r));
      });
      else if (a.act === 'hire') B.hire(id, a.cand).then(function (r) {
        reopen(r.ok ? a.cand.name.toUpperCase() + ' STARTS NOW.' : fail(r));
      });
      else if (a.act === 'move') {
        var m = B.move(a.who, a.to);
        reopen(m.ok ? (m.same ? 'ON THEIR WAY. THEY START WITHIN THE HOUR.' : 'ON THEIR WAY. ANOTHER WORLD: THEY START TOMORROW.') : 'NO ROOM THERE.');
      }
      else if (a.act === 'dismiss') { B.dismiss(a.who); reopen('THEY PACK UP AND GO.'); }
      else if (a.act === 'stock') {
        var r = B.restock(id);
        if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('pickup');
        reopen(r.units ? 'STOCKED: ' + r.items.map(function (x) { var I = typeof BridgeItems !== 'undefined' && BridgeItems.get(x.id); return x.n + ' ' + (I ? I.name : x.id).toUpperCase(); }).join(', ') + ' (+' + r.units + ' UNITS).' : 'NOTHING TO STOCK IT WITH.');
      }
      else if (a.act === 'collect') B.collect(id).then(function (r) { reopen(r.ok ? 'COLLECTED ' + r.amount.toLocaleString() + ' COINS.' : fail(r)); });
      else if (a.act === 'upgrade') B.upgrade(id).then(function (r) { reopen(r.ok ? 'DONE. BUSINESS IS LOOKING UP.' : fail(r)); });
      else if (a.act === 'assign') { B.assign(id, a.who); reopen(a.who ? "THEY'LL RUN IT AS WELL AS ANY MANAGER." : 'BACK TO THE SHIP THEY GO.'); }
    }
    function onKey(e) {
      var k = e.key;
      if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      else if (k === 'ArrowDown' || k === 's' || k === 'S') { e.preventDefault(); choose(sel + 1); }
      else if (k === 'ArrowUp' || k === 'w' || k === 'W') { e.preventDefault(); choose(sel - 1); }
      else if (k === 'Enter' || k === 'e' || k === 'E' || k === ' ') { e.preventDefault(); e.stopPropagation(); act(acts[sel]); }
    }
    for (var b = 0; b < btns.length; b++) {
      (function (btn, idx) {
        btn.addEventListener('mouseenter', function () { choose(idx); });
        btn.addEventListener('click', function (e) { e.stopPropagation(); act(acts[idx]); });
      })(btns[b], b);
    }
    document.addEventListener('keydown', onKey, true);
  }

  // Selling what you've gathered to someone who buys it: what they'll take and
  // what you carry, a count to pick for each (none to start with, so nothing
  // goes by accident), or everything at once. Coins via BridgeProgression; the
  // goods leave your pack only once you're paid.
  function showSellDialog(inter) {
    hideDialog();
    dialogVisible = true;
    if (typeof BridgeControls !== 'undefined' && BridgeControls.disable) BridgeControls.disable();
    var overlay = document.getElementById('world-overlay');
    var dialogEl = dialogShell('shop');
    var qm = inter.type === 'sell' && typeof BridgeCrew !== 'undefined' && BridgeCrew.has('quartermaster') ? 1.2 : 1;
    var rows = (inter.buys || []).map(function (b) {
      var item = typeof BridgeItems !== 'undefined' && BridgeItems.get(b.id);
      var have = typeof BridgeInventory !== 'undefined' ? BridgeInventory.getCount(b.id) : 0;
      return { id: b.id, price: Math.round(b.price * qm), name: item ? item.name : b.id, item: item, have: have, qty: 0 };
    });
    rows.sort(function (a, b) { return (b.have ? 1 : 0) - (a.have ? 1 : 0); });
    var everything = rows.reduce(function (a, r) { return a + r.have * r.price; }, 0);
    dialogEl.innerHTML = '<div class="wd-body"><div class="wd-title">' + esc(inter.label) + '</div>' +
      (inter.dialog ? '<div class="wd-text">' + esc(reflow(inter.dialog)) + '</div>' : '') +
      '<div class="wd-sell wd-sell-pick">' + rows.map(function (r, i) {
        return '<div class="wd-sell-row pick' + (r.have ? '' : ' none') + '" data-r="' + i + '">' +
          '<canvas class="sp-icon" width="24" height="24"></canvas><span class="sp-name">' + esc(r.name) + '</span>' +
          '<span class="sp-have">' + (r.have ? 'you have ' + r.have : 'none on you') + '</span>' +
          (r.have ? '<span class="sp-qty"><button class="sp-b" data-d="-1">&minus;</button><b class="sp-n">0</b>' +
                    '<button class="sp-b" data-d="1">+</button><button class="sp-b sp-all" data-d="all">all</button></span>' : '<span class="sp-qty"></span>') +
          '<span class="sp-price">' + r.price + ' ea</span></div>';
      }).join('') + '</div>' +
      '<div class="wd-options"><button class="wd-opt" data-act="sell" disabled>Pick what to sell</button>' +
      '<button class="wd-opt" data-act="all"' + (everything ? '' : ' disabled') + '>' + (everything ? 'Sell everything they want: ' + everything + ' coins' : 'Nothing they want') + '</button>' +
      '<button class="wd-opt" data-act="close">Leave</button></div>' + hintHTML('Esc', 'Leave') + '</div>';
    overlay.appendChild(dialogEl);
    requestAnimationFrame(function () { dialogEl.classList.add('visible'); });
    dialogEl.querySelectorAll('.wd-sell-row.pick').forEach(function (rowEl) {
      var r = rows[+rowEl.getAttribute('data-r')], cv = rowEl.querySelector('.sp-icon');
      if (r.item && r.item.draw) { var g = cv.getContext('2d'); g.imageSmoothingEnabled = false; r.item.draw(g, 0, 0, 24); }
    });
    // focus runs over the rows you can sell from, then the buttons
    var rowEls = [].slice.call(dialogEl.querySelectorAll('.wd-sell-row.pick')).filter(function (e) { return rows[+e.getAttribute('data-r')].have; });
    var btns = [].slice.call(dialogEl.querySelectorAll('.wd-opt'));
    var items = rowEls.concat(btns), sel = rowEls.length ? 0 : btns.length - 1;
    function total() { return rows.reduce(function (a, r) { return a + r.qty * r.price; }, 0); }
    function count() { return rows.reduce(function (a, r) { return a + r.qty; }, 0); }
    function paint() {
      rowEls.forEach(function (e) { var r = rows[+e.getAttribute('data-r')]; e.querySelector('.sp-n').textContent = r.qty; e.classList.toggle('chosen', r.qty > 0); });
      var t = total(), b = btns[0];
      b.disabled = !t;
      b.textContent = t ? 'Sell ' + count() + ' for ' + t + ' coins' : 'Pick what to sell';
      items.forEach(function (e, j) { e.classList.toggle('active', j === sel); });
    }
    function choose(n) { sel = (n + items.length) % items.length; paint(); }
    function adjust(r, d) {
      r.qty = d === 'all' ? (r.qty === r.have ? 0 : r.have) : Math.max(0, Math.min(r.have, r.qty + d));
      if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('blip');
      paint();
    }
    paint();
    function close() {
      document.removeEventListener('keydown', onKey, true);
      hideDialog();
      if (typeof BridgeControls !== 'undefined' && BridgeControls.enable) BridgeControls.enable();
    }
    function act(which) {
      if (which === 'all') rows.forEach(function (r) { r.qty = r.have; });
      var t = total();
      if (which === 'close' || !t) { close(); return; }
      var sold = rows.filter(function (r) { return r.qty > 0; }).map(function (r) { return { id: r.id, n: r.qty, name: r.name }; });
      if (typeof BridgeTreasury !== 'undefined') BridgeTreasury.noteSale(rows.filter(function (r) { return r.qty > 0; }).map(function (r) { return { id: r.id, total: r.qty * r.price }; }));   // (what the Workshop made, in the treasury)
      var paid = typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins
        ? BridgeProgression.awardCoins(t, 'sell:' + (inter.label || 'trader')) : Promise.resolve(null);
      close();
      showDialog(inter.label, 'COUNTING IT OUT...', inter);
      paid.then(function (bal) {           // the goods change hands only once the coins are in your purse
        if (bal === null || bal === undefined) {
          showDialog(inter.label, 'THE PURSE WON\'T OPEN - NO WAY TO PAY YOU RIGHT NOW.\n\nKEEP YOUR GOODS; COME BACK LATER.', inter);
          return;
        }
        sold.forEach(function (x) { BridgeInventory.removeItem(x.id, x.n); });
        showDialog(inter.label, 'SOLD: ' + sold.map(function (x) { return x.n + ' ' + x.name.toUpperCase(); }).join(', ') +
          ', FOR ' + t + ' COINS.\n\nPLEASURE DOING BUSINESS.', inter);
      }).catch(function () {
        showDialog(inter.label, 'THE PURSE WON\'T OPEN - NO WAY TO PAY YOU RIGHT NOW.', inter);
      });
    }
    function onKey(e) {
      var k = e.key, cur = items[sel], onRow = sel < rowEls.length, r = onRow ? rows[+cur.getAttribute('data-r')] : null;
      if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      else if (k === 'ArrowDown' || k === 's' || k === 'S') { e.preventDefault(); e.stopPropagation(); choose(sel + 1); }
      else if (k === 'ArrowUp' || k === 'w' || k === 'W') { e.preventDefault(); e.stopPropagation(); choose(sel - 1); }
      else if (onRow && (k === 'ArrowRight' || k === 'd' || k === 'D' || k === '+' || k === '=')) { e.preventDefault(); e.stopPropagation(); adjust(r, 1); }
      else if (onRow && (k === 'ArrowLeft' || k === 'a' || k === 'A' || k === '-')) { e.preventDefault(); e.stopPropagation(); adjust(r, -1); }
      else if (k === 'Enter' || k === 'e' || k === 'E' || k === ' ') {
        e.preventDefault(); e.stopPropagation();
        if (onRow) adjust(r, 'all'); else if (!cur.disabled) act(cur.getAttribute('data-act'));
      }
    }
    rowEls.forEach(function (rowEl, idx) {
      var r = rows[+rowEl.getAttribute('data-r')];
      rowEl.addEventListener('mouseenter', function () { choose(idx); });
      rowEl.querySelectorAll('.sp-b').forEach(function (b) {
        b.addEventListener('click', function (e) { e.stopPropagation(); var d = b.getAttribute('data-d'); adjust(r, d === 'all' ? 'all' : +d); });
      });
    });
    btns.forEach(function (btn, idx) {
      btn.addEventListener('mouseenter', function () { choose(rowEls.length + idx); });
      btn.addEventListener('click', function (e) { e.stopPropagation(); if (!btn.disabled) act(btn.getAttribute('data-act')); });
    });
    document.addEventListener('keydown', onKey, true);
  }

  // A chooser in the world's dialog style, for the systems that need one (the farm's bin, board and seed box,
  // hiring a hand, giving a gift): spec = { title, text, art: fn(canvas) (a picture under the text: a ship as she's
  // fitted), face: fn(canvas) (someone's portrait beside it, as on the talk card: a passer-by), rows: [{ label, note, icon: item id, draw: fn(ctx, size) for any other picture (a fish tank), stats: a
  // weapon's id (its stats card under the row), disabled, info: a row to read, not pick (a figure), pick }],
  // input: { placeholder, value, submit }, buttons: [{ label, act, disabled }] }. Picking a row or a button closes
  // the chooser unless its function returns false.
  function showChooser(spec) {
    hideDialog();
    dialogVisible = true;
    if (typeof BridgeControls !== 'undefined' && BridgeControls.disable) BridgeControls.disable();
    var overlay = document.getElementById('world-overlay');
    var dialogEl = dialogShell(spec.face ? 'shop wd-talk' : 'shop');
    var rows = spec.rows || [], buttons = (spec.buttons || []).concat([{ label: spec.closeLabel || 'Leave', act: null }]);
    dialogEl.innerHTML = (spec.face ? '<canvas class="wd-portrait" width="' + PORTRAIT_PX + '" height="' + PORTRAIT_PX + '"></canvas>' : '') +
      '<div class="wd-body"><div class="wd-title">' + esc(spec.title || '') + '</div>' +
      (spec.text ? '<div class="wd-text">' + esc(reflow(spec.text)) + '</div>' : '') +
      (spec.art ? '<canvas class="wd-art" width="1" height="1"></canvas>' : '') +
      (rows.length ? '<div class="wd-sell wd-sell-pick wd-chooser">' + rows.map(function (r, i) {
        return '<div class="wd-sell-row pick' + (r.disabled ? ' none' : '') + (r.info ? ' info' : '') + '" data-r="' + i + '">' +
          '<canvas class="sp-icon" width="24" height="24"></canvas><span class="sp-name">' + esc(r.label) + '</span>' +
          '<span class="sp-have">' + esc(r.sub || '') + '</span><span class="sp-qty"></span>' +
          '<span class="sp-price">' + esc(r.note || '') + '</span>' +
          (r.stats && typeof BridgeItems !== 'undefined' ? weaponCard(BridgeItems.get(r.stats), { compare: true, compact: true }) : '') + '</div>';
      }).join('') + '</div>' : '') +
      (spec.input ? '<form class="wd-say wd-chooser-input"><input class="wd-say-input" type="text" maxlength="' + (spec.input.max || 24) +
                    '" autocomplete="off" placeholder="' + esc(spec.input.placeholder || '') + '" value="' + esc(spec.input.value || '') + '">' +
                    '<button type="submit" class="wd-say-send">' + esc(spec.input.button || 'OK') + '</button></form>' : '') +
      '<div class="wd-options">' + buttons.map(function (b, i) {
        return '<button class="wd-opt" data-b="' + i + '"' + (b.disabled ? ' disabled' : '') + '>' + esc(b.label) + '</button>';
      }).join('') + '</div>' + hintHTML('Esc', 'Leave') + '</div>';
    overlay.appendChild(dialogEl);
    requestAnimationFrame(function () { dialogEl.classList.add('visible'); });
    var art = spec.art && dialogEl.querySelector('.wd-art');
    if (art) { dialogEl.classList.add('wd-has-art'); try { spec.art(art); } catch (e) { art.remove(); } }
    var faceCv = spec.face && dialogEl.querySelector('.wd-portrait');
    if (faceCv) { try { spec.face(faceCv); } catch (e) { faceCv.remove(); } }
    dialogEl.querySelectorAll('.wd-sell-row.pick').forEach(function (rowEl) {
      var r = rows[+rowEl.getAttribute('data-r')], cv = rowEl.querySelector('.sp-icon');
      var item = r.icon && typeof BridgeItems !== 'undefined' && BridgeItems.get(r.icon);
      if (item && item.draw) { var g = cv.getContext('2d'); g.imageSmoothingEnabled = false; item.draw(g, 0, 0, 24); }
      else if (r.draw) { var g2 = cv.getContext('2d'); g2.imageSmoothingEnabled = false; r.draw(g2, 24); }
      else if (r.face && typeof BridgeLook !== 'undefined' && BridgeLook.face) { cv.classList.add('sp-face'); BridgeLook.face(cv, r.face.seed, r.face.style, r.face.colour, r.face.wild); }   // someone you'd hire
      else cv.style.visibility = 'hidden';
    });
    var rowEls = [].slice.call(dialogEl.querySelectorAll('.wd-sell-row.pick')).filter(function (e) { var r = rows[+e.getAttribute('data-r')]; return !r.disabled && !r.info; });
    var btnEls = [].slice.call(dialogEl.querySelectorAll('.wd-opt'));
    var items = rowEls.concat(btnEls.filter(function (b) { return !b.disabled; })), sel = 0;
    var form = dialogEl.querySelector('.wd-chooser-input'), input = form && form.querySelector('input');
    function paint() { items.forEach(function (e, j) { e.classList.toggle('active', j === sel); }); }
    function close() {
      document.removeEventListener('keydown', onKey, true);
      hideDialog();
      if (typeof BridgeControls !== 'undefined' && BridgeControls.enable) BridgeControls.enable();
    }
    function run(fn) {
      if (!fn) { close(); return; }
      close();
      fn();
    }
    function fire(el) {
      if (!el) return;
      if (el.hasAttribute('data-r')) { var r = rows[+el.getAttribute('data-r')]; if (!r.disabled) run(r.pick); }
      else { var b = buttons[+el.getAttribute('data-b')]; if (!b.disabled) run(b.act); }
    }
    function onKey(e) {
      if (input && document.activeElement === input) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } return; }
      var k = e.key;
      if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      else if (k === 'ArrowDown' || k === 's' || k === 'S') { e.preventDefault(); e.stopPropagation(); sel = (sel + 1) % items.length; paint(); }
      else if (k === 'ArrowUp' || k === 'w' || k === 'W') { e.preventDefault(); e.stopPropagation(); sel = (sel - 1 + items.length) % items.length; paint(); }
      else if (k === 'Enter' || k === 'e' || k === 'E' || k === ' ') { e.preventDefault(); e.stopPropagation(); fire(items[sel]); }
    }
    items.forEach(function (el, j) {
      el.addEventListener('mouseenter', function () { sel = j; paint(); });
      el.addEventListener('click', function (e) { e.stopPropagation(); fire(el); });
    });
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value.trim();
      close();
      if (spec.input.submit) spec.input.submit(v);
    });
    paint();
    document.addEventListener('keydown', onKey, true);
    if (input) setTimeout(function () { input.focus(); input.select(); }, 60);
  }

  // A conversation with someone from the cast (js/people.js): a greeting,
  // then topics to ask about; the answer types out above the choices.
  function showConversation(person, inter) {
    hideDialog();
    dialogVisible = true;
    if (typeof BridgeControls !== 'undefined' && BridgeControls.disable) BridgeControls.disable();
    var promptEl = document.getElementById('interact-prompt');
    if (promptEl) promptEl.classList.remove('visible');
    var overlay = document.getElementById('world-overlay');
    var sheet = person.sheet || portraitFor(inter);
    var dialogEl = dialogShell('talk wd-convo');
    var talk = typeof BridgeTalk !== 'undefined' && BridgeTalk.enabled();
    var feel = typeof BridgeTalk !== 'undefined' ? BridgeTalk.feeling(person.id) : 0;
    // topics that wait on a quest (`when: 'quest/clue'` or `'quest'`) or go once it's moved on (`until`);
    // the ones a quest has just opened come first, lit up
    var Q = typeof BridgeQuests !== 'undefined' && BridgeQuests.has ? BridgeQuests.has : function () { return false; };
    var topics = person.topics.filter(function (t) {
      return (!t.when || [].concat(t.when).every(Q)) && (!t.until || ![].concat(t.until).some(Q));
    });
    var fresh = topics.filter(function (t) { return t.when && !BridgePeople.asked(person.id, t.q); });
    topics = fresh.concat(topics.filter(function (t) { return fresh.indexOf(t) < 0; }));
    if (person.crew && typeof BridgeCrew !== 'undefined') {
      var after = person.crew.after && typeof BridgeQuests !== 'undefined' ? BridgeQuests.progress(person.crew.after) : null;
      topics.push(BridgeCrew.isHired(person.id)
        ? { q: 'About the work', a: person.crew.perkText.toUpperCase() }
        : after && !after.done
          ? { q: 'Join my crew?', a: person.crew.notYet }          // not until a quest of theirs is settled
          : feel <= -3
            ? { q: 'Join my crew?', a: "NOT AFTER THE WAY YOU'VE TREATED ME." }
            : { q: 'Join my crew?', a: person.crew.pitch + '\n\n' + person.crew.wage + ' COINS UP FRONT, AS ' + person.crew.role.toUpperCase() + '.', hire: true });
    }
    var trade = typeof BridgeBusiness !== 'undefined' && BridgeBusiness.ofOwner ? BridgeBusiness.ofOwner(person.id) : null;
    if (trade) topics.push({ q: BridgeBusiness.owned(trade.id) ? "How's business?" : 'Would you sell up?', business: trade.id });
    if (typeof BridgeGifts !== 'undefined' && BridgeGifts.can()) topics.push({ q: 'Give a gift', gift: true });
    person = Object.create(person);
    person.topics = topics;
    var opts = topics.map(function (t) { return t.q; }).concat(['Goodbye']);
    dialogEl.innerHTML =
      (sheet ? '<canvas class="wd-portrait" width="' + PORTRAIT_PX + '" height="' + PORTRAIT_PX + '"></canvas>' : '') +
      '<div class="wd-body">' +
        '<div class="wd-title">' + esc(person.name) + '</div>' +
        '<div class="wd-role">' + esc(person.role || '') + '<span class="wd-feel"></span></div>' +
        '<div class="wd-you"></div>' +
        '<div class="wd-text"></div>' +
        '<div class="wd-options">' + opts.map(function (q, i) {
          return '<button data-opt="' + i + '" class="wd-opt' + (i === 0 ? ' active' : '') +
            (i < person.topics.length && BridgePeople.asked(person.id, q) ? ' asked' : '') +
            (i < fresh.length ? ' nudge' : '') + '">' + esc(q) + '</button>';
        }).join('') + '</div>' +
        (talk ? '<form class="wd-say"><input class="wd-say-input" type="text" maxlength="200" autocomplete="off" ' +
                'enterkeyhint="send" placeholder="Say something..."><button type="submit" class="wd-say-send">Say</button></form>' : '') +
        hintHTML('Esc', 'Leave') +
      '</div>';
    overlay.appendChild(dialogEl);
    var face = sheet ? drawPortrait(dialogEl.querySelector('.wd-portrait'), sheet) : null;
    requestAnimationFrame(function () { dialogEl.classList.add('visible'); });

    var out = dialogEl.querySelector('.wd-text');
    var you = dialogEl.querySelector('.wd-you');
    var feelEl = dialogEl.querySelector('.wd-feel');
    var form = dialogEl.querySelector('.wd-say');
    var input = form && form.querySelector('.wd-say-input');
    var btns = dialogEl.querySelectorAll('.wd-opt');
    var sel = 0, line = null, pitched = -1;
    var history = [], waiting = false, closed = false;
    function showFeel(force) {
      if (feelEl && typeof BridgeTalk !== 'undefined' && (force || BridgeTalk.bond(person.id).met)) feelEl.textContent = ' \u00b7 ' + BridgeTalk.feelingLabel(person.id);
    }
    function heard(from, text) { history.push({ from: from, text: String(text).slice(0, 400) }); if (history.length > 16) history.shift(); }
    // something they said that points at a topic (joining the crew, trading): light that button up
    function nudge(test) {
      for (var j = 0; j < person.topics.length; j++) {
        if (test(person.topics[j])) { choose(j); btns[j].classList.add('nudge'); return; }
      }
    }
    function speak(text) {
      if (!input || waiting) return;
      waiting = true;
      input.disabled = true;
      you.textContent = 'YOU: ' + text.toUpperCase();
      if (line) clearInterval(line.timer);
      line = null;
      out.textContent = '...';
      out.classList.add('wd-thinking');
      var prior = history.slice();
      heard('you', text);
      BridgeTalk.say(Object.getPrototypeOf(person), text, prior).then(function (d) {
        if (closed) return;
        waiting = false;
        input.disabled = false;
        out.classList.remove('wd-thinking');
        if (!d) { say("(THEY DON'T SEEM TO HEAR YOU. TRY AGAIN IN A MOMENT.)"); return; }
        heard('them', d.reply);
        if (face) face.set(expressionOf(d));          // their face follows how they took it
        say(d.reply.toUpperCase());
        showFeel(true);
        if (d.action === 'join_crew') nudge(function (t) { return t.hire || t.q === 'Join my crew?'; });
        if (d.action === 'trade') nudge(function (t) { return t.sell; });
        input.focus();
      });
    }
    function say(text) {
      if (line) clearInterval(line.timer);
      var body = reflow(text), i = 0;
      line = typing = { done: false, finish: function () { clearInterval(line.timer); out.textContent = body; line.done = true; } };
      line.timer = setInterval(function () {
        i = Math.min(body.length, i + 2);
        out.textContent = body.slice(0, i);
        if (i >= body.length) line.finish();
      }, 22);
    }
    function choose(n) {
      sel = (n + btns.length) % btns.length;
      for (var j = 0; j < btns.length; j++) btns[j].classList.toggle('active', j === sel);
    }
    function pick(n) {
      if (n >= person.topics.length) { close(); return; }
      var t = person.topics[n];
      if (t.sell) {
        var mult = typeof BridgeCrew !== 'undefined' && BridgeCrew.has('quartermaster') ? 1.2 : 1;
        if (feel >= 5) mult *= 1.1;                                // friends get a better price
        close();
        showSellDialog({ label: person.name, dialog: t.a, buys: t.sell.map(function (b) { return { id: b.id, price: Math.round(b.price * mult) }; }) });
        return;
      }
      if (t.business && typeof BridgeBusiness !== 'undefined' && BridgeBusiness.get(t.business)) {   // their business, for sale or yours
        close();
        showBusiness(BridgeBusiness.get(t.business), null);
        return;
      }
      if (t.gift && typeof BridgeGifts !== 'undefined') {             // something from your pack, for them (js/gifts.js)
        close();
        BridgeGifts.open(Object.getPrototypeOf(person));
        return;
      }
      if (t.harbour && typeof BridgeHarbour !== 'undefined') {        // a harbourmaster's book: ships, yard, hands, hold, market
        close();
        BridgeHarbour.open(BridgeWorld.getWorldId(), t.a);
        return;
      }
      if (t.peddler && typeof BridgeMagic !== 'undefined') {          // Wendel's wares (js/magic.js)
        close();
        BridgeMagic.shop();
        return;
      }
      if (t.hand && typeof BridgeHomestead !== 'undefined') {         // a farmhand on Verdance: hire them by the day
        close();
        BridgeHomestead.hire(t.hand);
        return;
      }
      if (t.treasure && typeof BridgeTreasure !== 'undefined') {      // Ilsa's treasure maps
        close();
        BridgeTreasure.shop(person.name.split(' ')[0]);
        return;
      }
      if (t.charts && typeof BridgeChart !== 'undefined') {           // Ilsa's sea charts (js/chart.js)
        close();
        BridgeChart.shop(BridgeWorld.getWorldId(), 'EVERY SOUNDING, EVERY SHOAL, EVERY HARBOUR MOUTH. ONCE A SEA\'S ON YOUR CHART YOU CAN SET A COURSE FOR ANY ISLAND IN IT.');
        return;
      }
      if (t.workshop && typeof BridgeWorkshop !== 'undefined') {      // materials and plans for your workshop (js/workshop.js)
        close();
        BridgeWorkshop.shop(t.workshop, person, t.a);
        return;
      }
      if (t.mine && typeof BridgeMine !== 'undefined') {              // Hob's forge: a better pickaxe
        close();
        BridgeMine.upgrade(person.name, t.mine);
        return;
      }
      if (t.pet && typeof BridgePet !== 'undefined') {                // a pup, a kitten, a drone (js/pet.js)
        close();
        BridgePet.adopt(t.pet, person.name.split(' ')[0]);
        return;
      }
      if (t.climbrace && typeof BridgeHoarfell !== 'undefined') {     // Ysolde: race her up the face (js/climb.js)
        close();
        BridgeHoarfell.climbRace(person.name.split(' ')[0]);
        return;
      }
      if (t.race && typeof BridgeHoarfell !== 'undefined') {          // Liv: race her down a run (js/ski.js)
        close();
        BridgeHoarfell.race(person.name.split(' ')[0]);
        return;
      }
      if (t.outfit && typeof BridgeGear !== 'undefined') {           // what they've got to wear or carry
        close();
        BridgeGear.open({ shop: t.outfit, intro: t.a });
        return;
      }
      if (t.hire && pitched === n && line && line.done) {        // the pitch heard: asking again signs them on
        out.textContent = 'SIGNING ON...';
        BridgeCrew.hire(Object.getPrototypeOf(person)).then(function (res) {
          if (res.ok) {
            if (face) face.set('happy');
            say('DONE. YOU WON\'T REGRET IT.');
            btns[n].textContent = 'About the work';
            person.topics[n] = { q: 'About the work', a: person.crew.perkText.toUpperCase() };
            if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast('Crew', person.name + ' joins you', person.crew.role);
          } else {
            say(res.reason === 'insufficient_funds' || res.reason === 'insufficient' ? 'COME BACK WHEN YOU CAN PAY.' : 'NOT TODAY. (NO WAY TO PAY RIGHT NOW.)');
          }
        });
        return;
      }
      if (t.hire) { pitched = n; BridgePeople.ask(person.id, t.q); btns[n].classList.add('asked'); say(t.a + '\n\n(ASK AGAIN TO HIRE.)'); return; }
      BridgePeople.ask(person.id, t.q);
      btns[n].classList.add('asked');
      btns[n].classList.remove('nudge');
      heard('you', t.q);
      heard('them', t.a);
      you.textContent = '';
      if (face) face.set('neutral');
      say(t.a);
    }
    function close() {
      closed = true;
      document.removeEventListener('keydown', onKey, true);
      hideDialog();
      if (typeof BridgeTalk !== 'undefined') BridgeTalk.end(Object.getPrototypeOf(person));
      if (typeof BridgeControls !== 'undefined' && BridgeControls.enable) BridgeControls.enable();
    }
    function onKey(e) {
      var k = e.key;
      if (input && e.target === input) {                       // typing: leave the keys to the text box
        if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); input.blur(); }
        return;
      }
      if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      else if (input && (k === 't' || k === 'T' || k === '/')) { e.preventDefault(); e.stopPropagation(); input.focus(); }
      else if (k === 'ArrowDown' || k === 's' || k === 'S') { e.preventDefault(); choose(sel + 1); }
      else if (k === 'ArrowUp' || k === 'w' || k === 'W') { e.preventDefault(); choose(sel - 1); }
      else if (k === 'Enter' || k === 'e' || k === 'E' || k === ' ') {
        e.preventDefault(); e.stopPropagation();
        if (line && !line.done) line.finish(); else pick(sel);
      }
    }
    for (var b = 0; b < btns.length; b++) {
      (function (btn, idx) {
        btn.addEventListener('mouseenter', function () { choose(idx); });
        btn.addEventListener('click', function (e) { e.stopPropagation(); pick(idx); });
      })(btns[b], b);
    }
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var text = input.value.trim();
        if (!text) return;
        input.value = '';
        speak(text);
      });
      form.addEventListener('click', function (e) { e.stopPropagation(); });
    }
    document.addEventListener('keydown', onKey, true);
    var first = !BridgePeople.met(person.id);
    BridgePeople.meet(person.id);
    showFeel();
    var opening = first ? person.greet : (person.again || person.greet);
    if (talk && !first) {
      // someone you've met greets you as they remember you (the written line if the server is slow)
      out.textContent = '...';
      out.classList.add('wd-thinking');
      var settled = false;
      var fallback = setTimeout(function () { if (!settled && !closed && !history.length) { settled = true; out.classList.remove('wd-thinking'); heard('them', opening); say(opening); } }, 6000);
      BridgeTalk.greet(Object.getPrototypeOf(person)).then(function (d) {
        if (settled || closed || history.length) return;         // they've already moved on
        settled = true;
        clearTimeout(fallback);
        out.classList.remove('wd-thinking');
        var g = d ? d.reply : opening;
        heard('them', g);
        say(d ? g.toUpperCase() : g);
        showFeel();
      });
    } else {
      heard('them', opening);
      say(opening);
    }
  }

  function hideDialog() {
    if (dialogVisible) if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('close');
    dialogVisible = false;
    if (typing) { clearInterval(typing.timer); typing = null; }
    var dialogEl = document.getElementById('world-dialog');
    if (dialogEl) dialogEl.remove();
  }

  // what a weapon does, in numbers and plain words, styled by the dialog it's in (js/arms.js BridgeArms.card)
  function weaponCard(item, opts) {
    return item && typeof BridgeArms !== 'undefined' && BridgeArms.stats(item) ? BridgeArms.card(item, opts) : '';
  }

  // Vendor / shop dialog — buy BridgeItems with server-side coins via BridgeProgression.
  // inter.items: [{ id, price }, ...]
  // inter.label: shop name displayed at the top
  function showVendorDialog(inter) {
    if (typeof BridgeInventory === 'undefined' || typeof BridgeItems === 'undefined') {
      showDialog(inter.label || 'SHOP', 'NO INVENTORY SYSTEM\\nAVAILABLE.');
      return;
    }
    if (typeof BridgeProgression === 'undefined') {
      showDialog(inter.label || 'SHOP', 'CURRENCY SYSTEM\\nUNAVAILABLE.');
      return;
    }
    dialogVisible = true;
    if (typeof BridgeControls !== 'undefined' && BridgeControls.disable) BridgeControls.disable();
    var promptEl = document.getElementById('interact-prompt');
    if (promptEl) promptEl.classList.remove('visible');

    var overlay = document.getElementById('world-overlay');
    var dialogEl = dialogShell('shop');

    var html = '<div class="wd-body"><div class="wd-title">' + esc(inter.label || 'SHOP') + '</div>' +
               '<div id="vendor-balance" class="wd-sub">Coins: ...</div>' +
               '<div id="vendor-items" class="wd-items"></div>' +
               '<div id="vendor-close">' + hintHTML('E', 'Close') + '</div></div>';
    dialogEl.innerHTML = html;
    overlay.appendChild(dialogEl);
    requestAnimationFrame(function () { dialogEl.classList.add('visible'); });

    var balanceLabel = document.getElementById('vendor-balance');
    var listEl = document.getElementById('vendor-items');
    var currentBalance = 0;
    var unsubCoin = null;

    function updateBalance(n) {
      currentBalance = (typeof n === 'number') ? n : currentBalance;
      balanceLabel.textContent = 'Coins: ' + currentBalance;
    }
    function renderItems() {
      listEl.innerHTML = '';
      (inter.items || []).forEach(function (entry) {
        var item = BridgeItems.get(entry.id);
        if (!item) return;
        var row = document.createElement('div');
        row.className = 'wd-item';
        var cnv = document.createElement('canvas');
        cnv.width = cnv.height = 28;
        cnv.className = 'wd-item-icon';
        item.draw(cnv.getContext('2d'), 0, 0, 28);
        row.appendChild(cnv);
        var info = document.createElement('div');
        info.className = 'wd-item-info';
        info.innerHTML = '<div class="wd-item-name">' + esc(item.name) + '</div>' +
                         '<div class="wd-item-desc">' + esc(item.desc) + '</div>' +
                         weaponCard(item, { compare: true, compact: true });
        row.appendChild(info);
        var canAfford = currentBalance >= entry.price;
        var buyBtn = document.createElement('button');
        buyBtn.className = 'wd-btn' + (canAfford ? ' primary' : '');
        buyBtn.textContent = entry.price + ' · Buy';
        buyBtn.disabled = !canAfford;
        buyBtn.addEventListener('click', function () {
          if (buyBtn.disabled) return;
          buyBtn.disabled = true;
          buyBtn.textContent = '...';
          BridgeProgression.wagerCoins(entry.price, 'vendor:' + entry.id).then(function (res) {
            if (res && res.ok) {
              // bought and paid for: if it won't fit, you're asked what to make room with (it's never just lost)
              if (BridgeInventory.give) BridgeInventory.give(entry.id, 1, { title: 'Bought - but your pack is full' }); else BridgeInventory.addItem(entry.id, 1);
              updateBalance(res.balance);
            }
            renderItems();
          });
        });
        row.appendChild(buyBtn);
        listEl.appendChild(row);
      });
    }

    // Initial balance fetch + subscribe for live updates (e.g. CoinHUD ticker)
    BridgeProgression.getBalance().then(function (b) {
      updateBalance(b == null ? 0 : b);
      renderItems();
    });
    unsubCoin = BridgeProgression.onCoinChange(function (e) {
      updateBalance(e.balance);
      renderItems();
    });

    document.getElementById('vendor-close').addEventListener('click', closeVendor);
    function closeVendor() {
      var el = document.getElementById('world-dialog');
      if (el) el.remove();
      dialogVisible = false;
      if (typeof unsubCoin === 'function') unsubCoin();
      if (typeof BridgeControls !== 'undefined' && BridgeControls.enable) BridgeControls.enable();
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'e' || e.key === 'E') {
        e.preventDefault(); closeVendor();
      }
    }
    document.addEventListener('keydown', onKey);
  }

  // Rest at the inn: confirm, deduct coins, restore HP + energy to max.
  function showRestDialog(inter) {
    if (typeof BridgeInventory === 'undefined' || typeof BridgeProgression === 'undefined') return;
    dialogVisible = true;
    if (typeof BridgeControls !== 'undefined' && BridgeControls.disable) BridgeControls.disable();
    var promptEl = document.getElementById('interact-prompt');
    if (promptEl) promptEl.classList.remove('visible');

    var cost = inter.cost || 5;

    var overlay = document.getElementById('world-overlay');
    var dialogEl = dialogShell('rest');

    dialogEl.innerHTML =
      '<div class="wd-body"><div class="wd-title">' + esc(inter.label || 'REST') + '</div>' +
      '<div class="wd-text">A warm room, a fresh pillow.\nRestores HP and energy.</div>' +
      '<div id="rest-cost" class="wd-sub">Cost: ' + cost + ' coins · you have: ...</div>' +
      '<div class="wd-buttons"><button id="rest-yes" class="wd-btn" disabled>Checking...</button>' +
      '<button id="rest-no" class="wd-btn">Cancel</button></div></div>';

    overlay.appendChild(dialogEl);
    requestAnimationFrame(function () { dialogEl.classList.add('visible'); });

    var costEl = document.getElementById('rest-cost');
    var yesBtn = document.getElementById('rest-yes');

    function setAffordState(balance) {
      var canRest = balance >= cost;
      costEl.textContent = 'Cost: ' + cost + ' coins · you have: ' + balance;
      yesBtn.disabled = !canRest;
      yesBtn.textContent = canRest ? 'Rest' : 'Not enough coins';
      yesBtn.classList.toggle('primary', canRest);
    }

    BridgeProgression.getBalance().then(function (b) {
      setAffordState(b == null ? 0 : b);
    });

    function close() {
      var el = document.getElementById('world-dialog');
      if (el) el.remove();
      dialogVisible = false;
      if (typeof BridgeControls !== 'undefined' && BridgeControls.enable) BridgeControls.enable();
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape' || e.key === 'e' || e.key === 'E') { e.preventDefault(); close(); } }
    document.addEventListener('keydown', onKey);
    document.getElementById('rest-no').addEventListener('click', close);
    yesBtn.addEventListener('click', function () {
      if (yesBtn.disabled) return;
      yesBtn.disabled = true;
      yesBtn.textContent = '...';
      BridgeProgression.wagerCoins(cost, 'rest:inn').then(function (res) {
        if (res && res.ok) {
          BridgeInventory.restoreAll();
          close();
        } else {
          // Refresh state in case server says insufficient
          BridgeProgression.getBalance().then(function (b) {
            setAffordState(b == null ? 0 : b);
          });
        }
      });
    });
  }

  // gates you've opened (password_gate with a targetWorld), by world and label
  function gateOpen(inter, set) {
    var key = BridgeWorld.getWorldId() + ':' + inter.label, open = {};
    try { open = JSON.parse(localStorage.getItem('bridge_gates') || '{}') || {}; } catch (e) { open = {}; }
    if (set) {
      open[key] = Date.now();
      try { localStorage.setItem('bridge_gates', JSON.stringify(open)); } catch (e) { /* private mode */ }
    }
    return !!open[key];
  }

  function showPasswordDialog(inter) {
    dialogVisible = true;
    // Disable game controls so the Enter key only reaches the password input,
    // not BridgeInteractions.update() (which would auto-close the dialog).
    if (typeof BridgeControls !== 'undefined' && BridgeControls.disable) {
      BridgeControls.disable();
    }
    var promptEl = document.getElementById('interact-prompt');
    if (promptEl) promptEl.classList.remove('visible');

    var overlay = document.getElementById('world-overlay');
    var dialogEl = dialogShell('password');

    dialogEl.innerHTML =
      '<div class="wd-body"><div class="wd-title">' + esc(inter.label) + '</div>' +
      '<div class="wd-text">' + esc(reflow(inter.dialog)) + '</div>' +
      '<input id="pw-input" class="wd-input" type="text" autocomplete="off" placeholder="..." />' +
      '<div id="pw-error" class="wd-error"></div>' +
      hintHTML('Enter', 'Submit · Esc to cancel') + '</div>';

    overlay.appendChild(dialogEl);
    requestAnimationFrame(function () { dialogEl.classList.add('visible'); });

    var input = document.getElementById('pw-input');
    setTimeout(function () { input.focus(); }, 50);

    function handleKey(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var val = input.value.trim();
        if (inter.passwordHash) {
          // only a hash of the password is kept (the repo is public): hash what was typed and compare
          if (!window.crypto || !crypto.subtle) return;
          crypto.subtle.digest('SHA-256', new TextEncoder().encode(val)).then(function (buf) {
            var hex = Array.prototype.map.call(new Uint8Array(buf), function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
            if (hex === inter.passwordHash) { cleanup(); go(); } else denied();
          });
          return;
        }
        if (inter.targetWorld && val.toUpperCase() === String(inter.password).toUpperCase()) {
          cleanup();
          gateOpen(inter, true);
          BridgeWorld.enterWorld(inter.targetWorld, inter.spawn);
        } else if (val === inter.password) {
          // Correct — navigate to target
          cleanup();
          go();
        } else {
          denied();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cleanup();
      }
    }

    function go() {
      BridgeState.setWorldPos({
        worldId: BridgeWorld.getWorld().tileset,
        x: BridgeCharacter.getX(),
        y: BridgeCharacter.getY(),
        facing: BridgeCharacter.getFacing()
      });
      BridgeState.transition('redirect', { url: inter.target });
    }

    function denied() {
      var err = document.getElementById('pw-error');
      if (err) err.textContent = inter.failMessage || 'ACCESS DENIED.';
      input.value = '';
      input.focus();
    }

    function cleanup() {
      document.removeEventListener('keydown', handleKey);
      hideDialog();
      // Re-enable controls when leaving the password input.
      if (typeof BridgeControls !== 'undefined' && BridgeControls.enable) {
        BridgeControls.enable();
      }
    }

    document.addEventListener('keydown', handleKey);
  }

  // Click-to-interact for mouse / trackpad. Given a clicked world tile,
  // find an interaction at that tile and run it if the player is close
  // enough. Returns true if the click was handled.
  function tryClickAt(tx, ty) {
    if (typeof BridgeWorld === 'undefined') return false;
    var world = BridgeWorld.getWorld();
    if (!world || !world.interactions) return false;
    if (dialogVisible) return false;
    // Objects stand up from their tile, so a click up to two tiles above
    // one still lands on it; the exact tile wins, then the nearest below.
    var inter = null, bestUp = 9;
    for (var i = 0; i < world.interactions.length; i++) {
      var it = world.interactions[i];
      var up = it.y - ty;
      if (it.x === tx && up >= 0 && up <= 2 && up < bestUp) { inter = it; bestUp = up; }
    }
    if (!inter) return false;
    tx = inter.x; ty = inter.y;
    var px = BridgeCharacter.getX(), py = BridgeCharacter.getY();
    var dist = Math.max(Math.abs(tx - px), Math.abs(ty - py));
    if (dist > 4) return false; // too far — same as if you weren't there
    // Hostile tiles: clicking is an attack, not the stub dialog. Route
    // through useSelected so the equipped weapon (if any) handles it.
    if (inter.type === 'hostile') {
      faceTowards(px, py, tx, ty);
      if (typeof BridgeInventory !== 'undefined' && BridgeInventory.useSelected) {
        BridgeInventory.useSelected();
      }
      return true;
    }
    // For everything else, turn to face the target then run the interaction.
    faceTowards(px, py, tx, ty);
    executeInteraction(inter);
    return true;
  }

  function faceTowards(px, py, tx, ty) {
    if (typeof BridgeCharacter === 'undefined' || !BridgeCharacter.setFacing) return;
    var dx = tx - px, dy = ty - py;
    if (Math.abs(dx) >= Math.abs(dy)) {
      BridgeCharacter.setFacing(dx > 0 ? 'right' : 'left');
    } else {
      BridgeCharacter.setFacing(dy > 0 ? 'down' : 'up');
    }
  }

  // Kill a hostile interaction: replace its tile with rubble, drop it
  // from the world's interaction list, and reward the player.
  // opts.quiet: just take it away (it fell to someone else, out of sight) — no coins, no loot.
  function killHostile(world, target, opts) {
    if (!world || !target) return;
    if (world.tiles[target.y] && typeof target.x === 'number') {
      world.tiles[target.y][target.x] = target.deadTile || 61;
    }
    if (world.collisions[target.y] && typeof target.x === 'number') {
      world.collisions[target.y][target.x] = 0;
    }
    var idx = world.interactions.indexOf(target);
    if (idx >= 0) world.interactions.splice(idx, 1);
    if (typeof BridgeFight !== 'undefined') BridgeFight.died(world, target, opts);
    if (opts && opts.quiet) return;
    if (typeof BridgeCombat !== 'undefined' && BridgeCombat.onKill) BridgeCombat.onKill(world, target);
    if (typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins) {
      BridgeProgression.awardCoins(target.reward || 10, 'kill:' + (target.label || 'hostile'));
    }
    // Loot drops — bounce a small handful of items at the death tile.
    // The drop table lives on the interaction (drops: [{id, min, max}]),
    // defaulting to 2-3 stone_shards for any hostile that didn't specify.
    if (typeof BridgeLoot !== 'undefined' && BridgeLoot.spawn) {
      var table = Array.isArray(target.drops) ? target.drops : [{ id: 'stone_shard', min: 2, max: 3 }];
      for (var i = 0; i < table.length; i++) {
        var row = table[i];
        if (!row || !row.id) continue;
        if (typeof row.chance === 'number' && Math.random() > row.chance) continue;
        var min = (typeof row.min === 'number') ? row.min : 1;
        var max = (typeof row.max === 'number') ? row.max : min;
        var n = Math.floor(min + Math.random() * (max - min + 1));
        for (var j = 0; j < n; j++) BridgeLoot.spawn(target.x, target.y, row.id, 1);
      }
    }
  }

  // BridgeInteractions.register('chest', fn(inter)) — a module brings its own interaction type, no case needed here
  // (verb: the prompt's word, as VERBS above)
  var OWN = {};
  function register(type, fn, verb) { OWN[type] = fn; if (verb) VERBS[type] = verb; }

  return { update: update, tryClickAt: tryClickAt, killHostile: killHostile, register: register, placePrompt: placePrompt, getTarget: getTarget,
           say: showDialog, execute: executeInteraction, choose: showChooser,
           business: function (id, view) { var d = typeof BridgeBusiness !== 'undefined' && BridgeBusiness.get(id); if (d) showBusiness(d, null, null, view); },   // the ledger's staff page
           findTarget: findTarget, promptParts: promptParts };
})();
