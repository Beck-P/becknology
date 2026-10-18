/**
 * BridgeActions — things you do rather than read about.
 *
 *   sit    chairs, benches, stools, beanbags: the pilot sits on the seat
 *          (BridgeCharacter.sit, the seated sheet), energy comes back while
 *          you rest, and moving gets you up again. A seat by a window can
 *          open the view as well.
 *   sleep  beds, bunks, a hammock: the screen goes dark, you wake rested
 *          (BridgeInventory.restoreAll). `deny` instead says why not (it's
 *          someone else's).
 *   view   windows, viewports, lookouts: a panel opens on what's out there,
 *          live — the spore sea under its moon (with the lighthouse beam
 *          sweeping, from Sapphire's light), Arcadia's skyline in the rain,
 *          the ringed giant beyond Enigma's glass, the planet the Wayfarer is
 *          parked over (BridgeOrbit), stars through a telescope. The
 *          interaction's text runs underneath as a caption.
 *
 * Which interactions do what is data, in assets/actions.json, by world id:
 *   { "world": [ { "label": "WINDOW", "action": "view", "view": "sea" },
 *                { "label": "BENCH", "x": 21, "y": 20, "action": "sit", "seat": [21.8, 20.7], "facing": "down",
 *                  "dialog": "...", "add": true } ] }
 * An entry tags every interaction with its label (or only the one at x, y);
 * with "add" it creates the interaction when it isn't there. Runs as each
 * world loads (decorate, like forage and fishing), so re-rendered worlds
 * keep their actions. Quest clues still count — the action replaces only
 * the text box.
 */
var BridgeActions = (function () {
  var data = null, loading = null;
  function load(cb) {
    if (data) { cb(data); return; }
    if (!loading) {
      loading = [];
      fetch('/bridge/assets/actions.json?v=' + Date.now()).then(function (r) { return r.json(); })
        .then(function (d) { data = d || {}; }, function () { data = {}; })
        .then(function () { var l = loading; loading = null; l.forEach(function (f) { f(data); }); });
    }
    loading.push(cb);
  }
  load(function () {});

  // ---- tagging interactions as a world loads -----------------------------------------------------
  var KEYS = ['action', 'view', 'seat', 'facing', 'deny', 'beam', 'roofs', 'caption'];
  function decorate(worldId, world) {
    if (!data || !world || !world.interactions) return;
    (data[worldId] || []).forEach(function (e) {
      var hits = world.interactions.filter(function (i) {
        return i.label === e.label && (e.x == null || (i.x === e.x && i.y === e.y));
      });
      if (!hits.length && e.add) {
        var it = { x: e.x, y: e.y, type: 'dialog', label: e.label, prompt: e.prompt || defaultPrompt(e.action), dialog: e.dialog || '' };
        world.interactions.push(it);
        hits = [it];
      }
      hits.forEach(function (i) {
        KEYS.forEach(function (k) { if (e[k] != null) i[k] = e[k]; });
        if (e.prompt) i.prompt = e.prompt;
        else if (e.action && !e.keepPrompt) i.prompt = defaultPrompt(e.action, i.view);
      });
    });
  }
  function defaultPrompt(a, view) {
    return a === 'sit' ? (view ? 'PRESS E TO SIT AND LOOK' : 'PRESS E TO SIT') : a === 'sleep' ? 'PRESS E TO SLEEP' : 'PRESS E TO LOOK OUT';
  }

  function textOf(inter) {
    if (inter.caption) return inter.caption;
    if (inter.type === 'bay_view' && typeof BridgeShip !== 'undefined') return BridgeShip.bayText().replace(/\\n/g, '\n');
    if (inter.messages && inter.messages.length) return inter.messages[Math.floor(Math.random() * inter.messages.length)].replace(/\\n/g, '\n');
    return unwrap((inter.dialog || '').replace(/\\n/g, '\n'));
  }
  // old dialogs were wrapped by hand to a narrow box; keep their paragraphs, not their line ends
  function unwrap(t) { return t.replace(/([^\n])\n(?!\n)/g, '$1 '); }

  function run(inter) {
    if (inter.deny) { BridgeInteractions.say(inter.label, inter.deny, inter); return; }
    if (inter.action === 'sit') sit(inter);
    else if (inter.action === 'sleep') sleep(inter);
    else if (inter.action === 'view') openView(inter);
    else if (inter.type === 'deck' && typeof BridgeDeck !== 'undefined') BridgeDeck.use(inter);   // the bridge's stations: not ours
  }

  // ---- sitting -----------------------------------------------------------------------------------
  var pill = null, rest = 0;
  function sit(inter) {
    var s = inter.seat || [inter.x + 0.5, inter.y + 0.6];
    if (!BridgeCharacter.sit({ x: s[0], y: s[1], facing: inter.facing || 'down' })) return;
    if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('sit');
    if (!pill) {
      pill = document.createElement('div');
      pill.id = 'act-pill';
      document.body.appendChild(pill);
    }
    var t = textOf(inter);
    pill.innerHTML = (t ? '<div class="ap-text"></div>' : '') +
      '<div class="ap-hint"><span class="ip-key">←↑→↓</span> to get up</div>';
    if (t) pill.querySelector('.ap-text').textContent = t;
    pill.classList.add('visible');
    clearInterval(rest);
    var since = Date.now();
    rest = setInterval(function () {
      if (!BridgeCharacter.isSeated()) { clearInterval(rest); pill.classList.remove('visible'); return; }
      if (Date.now() - since > 6000) pill.classList.add('quiet');
      if (typeof BridgeInventory !== 'undefined' && BridgeInventory.restoreEnergy) BridgeInventory.restoreEnergy(2);
    }, 1500);
    pill.classList.remove('quiet');
    if (inter.view) setTimeout(function () { if (BridgeCharacter.isSeated()) openView(inter); }, 450);
  }

  // ---- sleeping ----------------------------------------------------------------------------------
  // Sleep takes a little time (Beck: "you have to get a little bit of health and energy back for every certain amount of
  // time that you sleep… shouldn't ever have to sleep for too long"): the room dims, health and energy fill as you sleep —
  // from nothing, energy in FULL_EN seconds and health in FULL_HP in an ordinary bed — and any key or tap wakes you with
  // what you've got; sleep till both are full and you wake by yourself. A bed's `rest` (actions.json) scales it: the
  // clinic's recovery bed heals at twice the pace, a hammock a little slower.
  var FULL_HP = 60, FULL_EN = 45;
  var sleeping = null;
  function sleep(inter) {
    slumber({ text: textOf(inter), rate: inter.rest || 1 });
  }
  /** Go to sleep: { text, rate (× an ordinary bed), woke(summary) — after you're up, onTick(dt) — extra each second asleep }. */
  function slumber(o) {
    if (sleeping) return;
    o = o || {};
    if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('sleep');
    var fade = document.createElement('div');
    fade.id = 'sleep-fade';
    fade.className = 'resting';
    fade.innerHTML = '<div class="sf-z">z<span>z</span><span>z</span></div><div class="sf-text"></div>' +
      '<div class="sf-bars"><div class="sf-bar sf-hp"><i></i><b></b></div><div class="sf-bar sf-en"><i></i><b></b></div></div>' +
      '<div class="sf-hint"></div>';
    fade.querySelector('.sf-text').textContent = o.text || 'You sleep.';
    document.body.appendChild(fade);
    if (typeof BridgeControls !== 'undefined') BridgeControls.disable();
    BridgeCharacter.setHidden(true);
    requestAnimationFrame(function () { fade.classList.add('dark'); });
    var S = st(), start = { hp: S.hp, energy: S.energy }, t0 = Date.now(), last = t0, acc = { hp: 0, en: 0 }, rate = o.rate || 1;
    var touch = document.documentElement.classList.contains('touch');
    sleeping = { o: o, fade: fade };
    function st() { return typeof BridgeInventory !== 'undefined' && BridgeInventory.getStats ? BridgeInventory.getStats() : { hp: 1, maxHP: 1, energy: 1, maxEnergy: 1 }; }
    function show() {
      var s2 = st(), secs = Math.round((Date.now() - t0) / 1000);
      fade.querySelector('.sf-hp i').style.width = Math.round(100 * s2.hp / s2.maxHP) + '%';
      fade.querySelector('.sf-hp b').textContent = 'Health ' + Math.floor(s2.hp) + ' / ' + s2.maxHP;
      fade.querySelector('.sf-en i').style.width = Math.round(100 * s2.energy / s2.maxEnergy) + '%';
      fade.querySelector('.sf-en b').textContent = 'Energy ' + Math.floor(s2.energy) + ' / ' + s2.maxEnergy;
      fade.querySelector('.sf-hint').textContent = (secs ? 'Asleep ' + secs + 's · ' : '') + (touch ? 'tap to wake' : 'any key to wake');
    }
    show();
    var timer = setInterval(function () {
      var now = Date.now(), dt = Math.min(1, (now - last) / 1000); last = now;
      var s2 = st();
      acc.hp += s2.maxHP / FULL_HP * rate * dt; acc.en += s2.maxEnergy / FULL_EN * rate * dt;
      var h = Math.floor(acc.hp), e = Math.floor(acc.en);
      if (h && s2.hp < s2.maxHP) { BridgeInventory.restoreHP(h); acc.hp -= h; } else if (s2.hp >= s2.maxHP) acc.hp = 0;
      if (e && s2.energy < s2.maxEnergy) { BridgeInventory.restoreEnergy(e); acc.en -= e; } else if (s2.energy >= s2.maxEnergy) acc.en = 0;
      if (o.onTick) o.onTick(dt);
      show();
      s2 = st();
      if (s2.hp >= s2.maxHP && s2.energy >= s2.maxEnergy && now - t0 > 1500) wake(true);
    }, 250);
    function key(e) { if (e.key === 'Escape' || e.key.length === 1 || /^(Enter|Arrow)/.test(e.key)) { e.preventDefault(); wake(false); } }
    function tap(e) { e.preventDefault(); wake(false); }
    setTimeout(function () {                            // a moment to settle before a key can wake you
      if (!sleeping || sleeping.fade !== fade) return;
      window.addEventListener('keydown', key, true);
      fade.addEventListener('pointerdown', tap);
      fade.style.pointerEvents = 'auto';
    }, 900);
    function wake(full) {
      if (!sleeping || sleeping.fade !== fade) return;
      clearInterval(timer);
      window.removeEventListener('keydown', key, true);
      fade.removeEventListener('pointerdown', tap);
      var s2 = st(), got = { hp: Math.round(s2.hp - start.hp), energy: Math.round(s2.energy - start.energy), secs: Math.round((Date.now() - t0) / 1000), full: full };
      fade.querySelector('.sf-text').textContent = full ? (o.rested || 'You wake rested. Health and energy full.')
        : 'You wake after ' + got.secs + 's' + (got.hp > 0 || got.energy > 0 ? ': ' + [got.hp > 0 ? '+' + got.hp + ' health' : '', got.energy > 0 ? '+' + got.energy + ' energy' : ''].filter(Boolean).join(', ') + '.' : '.');
      fade.classList.add('woke');
      fade.style.pointerEvents = 'none';
      setTimeout(function () {
        BridgeCharacter.setHidden(false);
        fade.classList.remove('dark');
        if (typeof BridgeControls !== 'undefined') BridgeControls.enable();
        if (o.woke) o.woke(got);
      }, 1100);
      setTimeout(function () { fade.remove(); if (sleeping && sleeping.fade === fade) sleeping = null; }, 2000);
    }
    sleeping.wake = wake;
  }

  // ---- looking out -------------------------------------------------------------------------------
  var VW = 320, VH = 180;
  var panel = null, cv = null, ctx = null, raf = 0, kind = null, opts = null, seaBuf = null;

  function viewKind(inter) {
    if (inter.view && inter.view !== true) return inter.view;
    var id = BridgeWorld.getWorldId() || '';
    if (/^lumar/.test(id)) return 'sea';
    if (/^(arcadia|cyber|chrome|junk|tech|null)/.test(id)) return 'skyline';
    if (/^enigma/.test(id)) return 'giant';
    if (/^singularity/.test(id)) return 'void';
    if (/^hoarfell/.test(id)) return 'peaks';
    if (/^sylvara/.test(id)) return 'orbit';
    return 'orbit';
  }

  function seaPalette() {
    var id = BridgeWorld.getWorldId() || '', W = BridgeWorld.getWorld && BridgeWorld.getWorld();
    if (W && W.sea) return W.sea;
    var m = id.match(/^lumar-(crimson|rose|sapphire|midnight)/);
    return m ? m[1] : 'emerald';
  }

  function drawSea(c, now) {
    var hz = Math.round(VH * 0.46);
    var g = c.createLinearGradient(0, 0, 0, hz);
    g.addColorStop(0, '#060a16'); g.addColorStop(1, '#16243a');
    c.fillStyle = g; c.fillRect(0, 0, VW, hz);
    if (BridgeOrbit.drawStars) BridgeOrbit.drawStars(c, 0, 0, VW, hz - 6, now, 41, 1 / 900000);
    // the moon and its road on the water
    var mx = Math.round(VW * 0.7), my = Math.round(hz * 0.36);
    c.fillStyle = 'rgba(200,220,255,0.10)'; c.beginPath(); c.arc(mx, my, 20, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#d8e0ea'; c.beginPath(); c.arc(mx, my, 9, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#b8c0cc'; c.fillRect(mx - 3, my - 2, 3, 2); c.fillRect(mx + 2, my + 2, 2, 2);
    // the sea
    var sh = VH - hz;
    if (!seaBuf) { seaBuf = document.createElement('canvas'); seaBuf.width = VW; seaBuf.height = sh; }
    if (typeof BridgeSea !== 'undefined') BridgeSea.drawSea(seaBuf.getContext('2d'), VW, sh, now, seaPalette());
    c.drawImage(seaBuf, 0, hz);
    var fog = c.createLinearGradient(0, hz, 0, hz + 40);
    fog.addColorStop(0, 'rgba(18,30,48,0.9)'); fog.addColorStop(1, 'rgba(18,30,48,0)');
    c.fillStyle = fog; c.fillRect(0, hz, VW, 40);
    for (var y = hz + 2; y < VH; y += 3) {
      var w = 2 + (y - hz) * 0.12, wob = Math.sin(now / 400 + y * 0.7) * (1 + (y - hz) * 0.05);
      c.fillStyle = 'rgba(220,232,255,' + (0.5 - (y - hz) / VH * 0.6).toFixed(2) + ')';
      c.fillRect(Math.round(mx - w / 2 + wob), y, Math.round(w), 1);
    }
    // islands on the horizon
    c.fillStyle = '#0a1420';
    [[0.08, 0.2, 9], [0.42, 0.12, 6], [0.86, 0.16, 12]].forEach(function (s) {
      var x0 = VW * s[0], w2 = VW * s[1];
      c.beginPath(); c.moveTo(x0, hz);
      for (var i = 0; i <= 8; i++) c.lineTo(x0 + w2 * i / 8, hz - Math.sin(i / 8 * Math.PI) * s[2] - (i % 3 === 1 ? 2 : 0));
      c.closePath(); c.fill();
    });
    c.fillStyle = '#ffd890'; c.fillRect(Math.round(VW * 0.47), hz - 3, 1, 1); c.fillRect(Math.round(VW * 0.9), hz - 6, 1, 1);
    // spores drifting up off the water
    for (var i = 0; i < 26; i++) {
      var sx = (i * 73 + now * 0.004 * (1 + i % 3)) % VW, sy = VH - ((i * 37 + now * 0.012 * (1 + i % 2)) % (VH - hz));
      c.fillStyle = i % 4 ? 'rgba(140,240,180,0.55)' : 'rgba(200,255,220,0.8)';
      c.fillRect(Math.round(sx), Math.round(sy), 1, 1);
    }
    if (opts.roofs) {                                 // a window over the town: rooftops in front, smoke, lit windows
      var x = -6, k = 0;
      while (x < VW) {
        var rw = 34 + (k * 17) % 22, rh = 16 + (k * 11) % 12, base = VH - 8 - (k % 3) * 5;
        c.fillStyle = k % 2 ? '#0c0a12' : '#100c16';
        c.beginPath(); c.moveTo(x, VH); c.lineTo(x, base - rh * 0.5); c.lineTo(x + rw / 2, base - rh); c.lineTo(x + rw, base - rh * 0.5);
        c.lineTo(x + rw, VH); c.closePath(); c.fill();
        c.fillStyle = '#16121c'; c.fillRect(Math.round(x + rw * 0.7), Math.round(base - rh - 4), 4, 8);
        for (var p = 0; p < 4; p++) {                                   // chimney smoke
          var age = ((now / 900 + p * 0.25 + k * 0.13) % 1);
          c.fillStyle = 'rgba(150,150,170,' + (0.35 * (1 - age)).toFixed(2) + ')';
          c.fillRect(Math.round(x + rw * 0.7 + 1 + Math.sin(age * 5 + k) * 3 + age * 6), Math.round(base - rh - 6 - age * 22), 2 + Math.round(age * 3), 2);
        }
        if (k % 2 === 0) { c.fillStyle = '#ffd070'; c.fillRect(Math.round(x + rw * 0.3), Math.round(base - rh * 0.3), 3, 3); }
        if (k % 3 === 1) { c.fillStyle = '#e8b050'; c.fillRect(Math.round(x + rw * 0.55), Math.round(base - rh * 0.2), 3, 3); }
        x += rw - 2; k++;
      }
    }
    if (opts.beam) {                                  // the Sapphire Light, sweeping over your head
      var a = (now / 5200) % 1;
      c.save();
      c.globalCompositeOperation = 'lighter';
      var bx = VW * (1.3 - a * 1.6);
      var bg = c.createLinearGradient(bx - 60, 0, bx + 60, 0);
      bg.addColorStop(0, 'rgba(120,170,255,0)'); bg.addColorStop(0.5, 'rgba(140,190,255,0.32)'); bg.addColorStop(1, 'rgba(120,170,255,0)');
      c.fillStyle = bg;
      c.beginPath(); c.moveTo(VW * 0.5, -40); c.lineTo(bx - 70, VH); c.lineTo(bx + 70, VH); c.closePath(); c.fill();
      c.restore();
    }
  }

  // Arcadia's skyline (js/skyline.js) framed for a window: no street in front, so the mid towers end
  // just above the middle and the city far below starts under them. The painter reads the world's view,
  // so it's handed one placed for this canvas while it draws.
  function drawSkyline(c, now, w, h) {
    if (typeof BridgeSkyline === 'undefined') { c.fillStyle = '#0a0418'; c.fillRect(0, 0, w, h); return; }
    var real = BridgeWorld.getView;
    var offY = Math.round((0.55 * h - h / 2) / 0.55 + h / 2 - 6 * 32);
    BridgeWorld.getView = function () { return { offX: w / 2 - 16 * 32, offY: offY, ts: 32, w: w, h: h }; };
    try {
      BridgeSkyline.draw(c, w, h, now, { baseRow: 6, railRow: 7, centerCol: 16 });
      if (BridgeSkyline.rain) BridgeSkyline.rain(c, w, h, now, { drops: 110 });
    } finally { BridgeWorld.getView = real; }
  }

  function drawGiant(c, now) {
    c.fillStyle = '#03040a'; c.fillRect(0, 0, VW, VH);
    BridgeOrbit.drawStars(c, 0, 0, VW, VH, now, 23, 1 / 700000);
    BridgeOrbit.drawGiant(c, VW * 0.6, VH * 0.56, 52, now, 0.3);
    if (BridgeOrbit.drawStation) BridgeOrbit.drawStation(c, VW * 0.18, VH * 0.3 + Math.sin(now / 2600) * 2, 4, now);
  }

  function drawVoid(c, now) {
    c.fillStyle = '#040208'; c.fillRect(0, 0, VW, VH);
    BridgeOrbit.drawStars(c, 0, 0, VW, VH, now, 77, 1 / 300000);
    BridgeOrbit.drawHole(c, VW / 2, VH / 2, 30, now);
  }

  function drawStarsView(c, now) {
    c.fillStyle = '#02030a'; c.fillRect(0, 0, VW, VH);
    BridgeOrbit.drawStars(c, 0, 0, VW, VH, now, 91, 1 / 400000);
    var g = c.createRadialGradient(VW * 0.6, VH * 0.45, 4, VW * 0.6, VH * 0.45, 90);
    g.addColorStop(0, 'rgba(150,110,220,0.35)'); g.addColorStop(1, 'rgba(150,110,220,0)');
    c.fillStyle = g; c.fillRect(0, 0, VW, VH);
    c.fillStyle = 'rgba(0,0,0,0.85)';                  // the eyepiece's round edge
    c.beginPath(); c.rect(0, 0, VW, VH); c.arc(VW / 2, VH / 2, VH * 0.48, 0, Math.PI * 2, true); c.fill();
  }

  function drawView(now) {
    if (!panel || !panel.classList.contains('visible')) return;
    ctx.imageSmoothingEnabled = false;
    if (kind === 'sea') drawSea(ctx, now);
    else if (kind === 'skyline') drawSkyline(ctx, now, cv.width, cv.height);
    else if (kind === 'giant') drawGiant(ctx, now);
    else if (kind === 'void') drawVoid(ctx, now);
    else if (kind === 'stars') drawStarsView(ctx, now);
    else if (kind === 'peaks' && typeof BridgeHoarfell !== 'undefined') BridgeHoarfell.vista(ctx, VW, VH, now);
    else BridgeOrbit.draw(ctx, 0, 0, VW, VH, now, { horizon: 0.32 });
    raf = requestAnimationFrame(drawView);
  }

  // Looking out is first person: the room leans in toward the window, then the view swivels in to fill
  // the screen — framed by the window's mullions indoors, open air outside, an eyepiece at a telescope —
  // with the caption along the bottom. Getting up turns you back the same way.
  var leanT = 0, outT = 0;
  function openView(inter) {
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'view-panel';
      panel.innerHTML = '<canvas class="vp-canvas"></canvas><div class="vp-frame-fp"></div>' +
        '<div class="vp-foot"><div class="vp-title"></div><div class="vp-caption"></div>' +
        '<div class="vp-hint"><span class="ip-key">Esc</span> look away</div></div>';
      document.body.appendChild(panel);
      cv = panel.querySelector('.vp-canvas');
      ctx = cv.getContext('2d');
      panel.addEventListener('click', function () { closeView(); });
    }
    clearTimeout(outT); clearTimeout(leanT);
    kind = viewKind(inter);
    opts = { beam: !!inter.beam, roofs: !!inter.roofs };
    // the canvas takes the screen's shape, so the view fills it without bars
    var vw = window.innerWidth, vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    var base = kind === 'skyline' ? 270 : 180;
    VH = base; VW = Math.max(Math.round(base * 0.9), Math.min(560, Math.round(base * vw / vh)));   // a phone held upright sees the middle of a squarer view
    if (seaBuf && (seaBuf.width !== VW || seaBuf.height !== VH - Math.round(VH * 0.46))) seaBuf = null;
    cv.width = VW; cv.height = VH;
    var w = BridgeWorld.getWorld(), indoor = !!(w && w.scene && !w.scene.backdrop) && kind !== 'stars';
    var t = textOf(inter);
    panel.querySelector('.vp-title').textContent = inter.label || '';
    panel.querySelector('.vp-caption').textContent = t;
    panel.querySelector('.vp-caption').style.display = t ? '' : 'none';
    // which way you turn: toward the window's side of you
    var sv = BridgeWorld.getScreenView(), side = 1;
    if (sv && sv.ts) {
      var wx = sv.offX + (inter.x + 0.5) * sv.ts, wy = sv.offY + (inter.y + 0.5) * sv.ts;
      side = wx < vw / 2 ? -1 : 1;
      var bc = document.getElementById('bridge-canvas');
      if (bc) { bc.style.transformOrigin = Math.round(wx) + 'px ' + Math.round(wy) + 'px'; bc.classList.add('fp-lean'); }
    }
    panel.style.setProperty('--turn', (side * 58) + 'deg');
    panel.className = 'vp-' + kind + (indoor ? ' vp-framed' : '');
    if (typeof BridgeControls !== 'undefined') BridgeControls.disable();
    document.addEventListener('keydown', onViewKey, true);
    cancelAnimationFrame(raf);
    leanT = setTimeout(function () {                  // the lean, then the swivel
      panel.classList.add('visible');
      void panel.offsetWidth;
      panel.classList.add('fp-in');
      raf = requestAnimationFrame(drawView);
    }, 260);
  }

  function onViewKey(e) {
    if (['Escape', 'e', 'E', ' ', 'Enter'].indexOf(e.key) < 0) return;
    e.preventDefault(); e.stopPropagation();
    closeView();
  }

  function closeView() {
    if (!panel || !panel.classList.contains('visible') || panel.classList.contains('fp-out')) return;
    document.removeEventListener('keydown', onViewKey, true);
    panel.classList.remove('fp-in');
    panel.classList.add('fp-out');
    var bc = document.getElementById('bridge-canvas');
    if (bc) bc.classList.remove('fp-lean');
    outT = setTimeout(function () {
      panel.classList.remove('visible', 'fp-out');
      cancelAnimationFrame(raf);
      if (typeof BridgeControls !== 'undefined') BridgeControls.enable();
    }, 420);
  }

  return { decorate: decorate, run: run, closeView: closeView, ready: function (cb) { load(cb); },
           rest: slumber, sleeping: function () { return !!sleeping; }, _wake: function () { if (sleeping && sleeping.wake) sleeping.wake(false); } };
})();
