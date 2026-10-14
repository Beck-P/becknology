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
    if (inter.messages && inter.messages.length) return inter.messages[Math.floor(Math.random() * inter.messages.length)];
    return unwrap((inter.dialog || '').replace(/\\n/g, '\n'));
  }
  // old dialogs were wrapped by hand to a narrow box; keep their paragraphs, not their line ends
  function unwrap(t) { return t.replace(/([^\n])\n(?!\n)/g, '$1 '); }

  function run(inter) {
    if (inter.deny) { BridgeInteractions.say(inter.label, inter.deny, inter); return; }
    if (inter.action === 'sit') sit(inter);
    else if (inter.action === 'sleep') sleep(inter);
    else if (inter.action === 'view') openView(inter);
  }

  // ---- sitting -----------------------------------------------------------------------------------
  var pill = null, rest = 0;
  function sit(inter) {
    var s = inter.seat || [inter.x + 0.5, inter.y + 0.6];
    if (!BridgeCharacter.sit({ x: s[0], y: s[1], facing: inter.facing || 'down' })) return;
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
  var sleeping = false;
  function sleep(inter) {
    if (sleeping) return;
    sleeping = true;
    var fade = document.createElement('div');
    fade.id = 'sleep-fade';
    fade.innerHTML = '<div class="sf-z">z<span>z</span><span>z</span></div><div class="sf-text"></div>';
    var t = textOf(inter);
    fade.querySelector('.sf-text').textContent = t || 'You sleep.';
    document.body.appendChild(fade);
    if (typeof BridgeControls !== 'undefined') BridgeControls.disable();
    BridgeCharacter.setHidden(true);
    requestAnimationFrame(function () { fade.classList.add('dark'); });
    setTimeout(function () {
      if (typeof BridgeInventory !== 'undefined' && BridgeInventory.restoreAll) BridgeInventory.restoreAll();
      fade.querySelector('.sf-text').textContent = 'You wake rested. Health and energy full.';
      fade.classList.add('woke');
    }, 2600);
    setTimeout(function () {
      BridgeCharacter.setHidden(false);
      fade.classList.remove('dark');
      if (typeof BridgeControls !== 'undefined') BridgeControls.enable();
    }, 4200);
    setTimeout(function () { fade.remove(); sleeping = false; }, 5200);
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
    return 'orbit';
  }

  function seaPalette() {
    var id = BridgeWorld.getWorldId() || '';
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
    else BridgeOrbit.draw(ctx, 0, 0, VW, VH, now, { horizon: 0.32 });
    raf = requestAnimationFrame(drawView);
  }

  function openView(inter) {
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'view-panel';
      panel.innerHTML = '<div class="vp-frame"><div class="vp-head"><span class="vp-title"></span>' +
        '<button class="qj-close vp-close" aria-label="Close"><span class="ip-key">Esc</span></button></div>' +
        '<canvas class="vp-canvas" width="' + VW + '" height="' + VH + '"></canvas><div class="vp-caption"></div></div>';
      document.body.appendChild(panel);
      cv = panel.querySelector('.vp-canvas');
      ctx = cv.getContext('2d');
      panel.addEventListener('click', function (e) { if (e.target === panel || e.target.closest('.vp-close')) closeView(); });
    }
    kind = viewKind(inter);
    opts = { beam: !!inter.beam, roofs: !!inter.roofs };
    var big = kind === 'skyline';
    cv.width = big ? 480 : VW; cv.height = big ? 270 : VH;
    panel.className = 'vp-' + kind;
    panel.querySelector('.vp-title').textContent = inter.label;
    var t = textOf(inter);
    panel.querySelector('.vp-caption').textContent = t;
    panel.querySelector('.vp-caption').style.display = t ? '' : 'none';
    var vw = window.innerWidth, vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    var cw = cv.width, ch = cv.height;
    var s = Math.max(1, Math.min(Math.floor((vw - 40) / cw), Math.floor((vh - (t ? 200 : 110)) / ch)));
    if (s < 2) s = Math.max(0.5, Math.min((vw - 30) / cw, (vh - (t ? 170 : 90)) / ch));
    cv.style.width = Math.round(cw * s) + 'px'; cv.style.height = Math.round(ch * s) + 'px';
    panel.classList.add('visible');
    if (typeof BridgeControls !== 'undefined') BridgeControls.disable();
    document.addEventListener('keydown', onViewKey, true);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(drawView);
  }

  function onViewKey(e) {
    if (['Escape', 'e', 'E', ' ', 'Enter'].indexOf(e.key) < 0) return;
    e.preventDefault(); e.stopPropagation();
    closeView();
  }

  function closeView() {
    if (!panel || !panel.classList.contains('visible')) return;
    panel.classList.remove('visible');
    cancelAnimationFrame(raf);
    document.removeEventListener('keydown', onViewKey, true);
    if (typeof BridgeControls !== 'undefined') BridgeControls.enable();
  }

  return { decorate: decorate, run: run, closeView: closeView, ready: function (cb) { load(cb); } };
})();
