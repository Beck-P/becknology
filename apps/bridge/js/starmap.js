/**
 * BridgeStarmap — the navigator's chart on the Wayfarer's bridge.
 *
 * A pixel-art chart (drawn into a small buffer, scaled by a whole number,
 * like the worlds): the systems as live planets (js/orbit.js), range rings
 * round wherever the Wayfarer is parked, the route to the selected system
 * streaming toward it. Names, the detail panel and the jump control are
 * crisp DOM over it. Pick a system with a click or ←/→, read what's there,
 * hold JUMP (or Enter / J) to charge the drive; Esc goes back to the bridge.
 */
var BridgeStarmap = (function () {
  var overlay;
  var selected = 0;
  var charging = null;       // {start} while JUMP is held
  var CHARGE_MS = 900;
  var buf = document.createElement('canvas'), bctx = buf.getContext('2d');
  var panelPlanet = null;

  function getVisited() {
    try {
      var raw = localStorage.getItem('bridge_visited');
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function markVisited(worldId) {
    var v = getVisited();
    v[worldId] = Date.now();
    try { localStorage.setItem('bridge_visited', JSON.stringify(v)); } catch (e) {}
  }

  var WORLDS = [
    {
      id: 'lumar', loc: 'lumar', name: 'LUMAR', kind: 'Ocean world · spore seas',
      blurb: 'Emerald seas that glow at night, saltstone islands, a harbour town under the lighthouse. Fishermen, crystal harvesters, a dragon under the hill.',
      places: ['Diggen’s Point harbour', 'The Market Square', 'Crimson Reach · Rose Cove', 'Sapphire Port · Midnight Isle', 'The open sea, at the helm'],
      apps: [{ name: 'Aether Seas', url: '/aether-seas' }],
      color: '#40c890', px: 0.22, py: 0.66, hasOverworld: true
    },
    {
      id: 'arcadia-street', loc: 'arcadia', name: 'ARCADIA', kind: 'City world · night side lit',
      blurb: 'A megacity stacked into the smog. Neon, rain, traffic between the towers; the Arcade where Runouts is played all night.',
      places: ['Skyport 7', 'The District', 'The Arcade'],
      apps: [{ name: 'Runouts', url: '/runouts' }],
      color: '#e070b0', px: 0.32, py: 0.3, hasOverworld: true
    },
    {
      id: 'enigma', loc: 'enigma', name: 'ENIGMA STATION', kind: 'Listening post · ringed giant',
      blurb: 'An abandoned relay station turning by a ringed gas giant. Its antenna still listens to something on 47.3 MHz, and somebody is still aboard.',
      places: ['Docking Bay 3', 'The relay deck'],
      apps: [{ name: 'Cipher Room', url: '/cipher-room' }, { name: 'Typist', url: '/typist' }],
      color: '#5cc8d0', px: 0.68, py: 0.26, hasOverworld: true
    },
    {
      id: 'singularity', loc: 'singularity', name: 'THE SINGULARITY', kind: 'Black hole · the Brink',
      blurb: 'The edge of known space. Shattered planes of stone at the brink of the horizon, where light bends and time runs strange.',
      places: ['The landing ring', 'The avenue of columns', 'The altar at the brink'],
      apps: [{ name: 'Genart', url: '/genart' }],
      color: '#b090f0', px: 0.6, py: 0.68, hasOverworld: true
    },
    {
      id: 'verdance', loc: 'verdance', name: 'VERDANCE', kind: 'Garden world · two small moons',
      blurb: 'Green country, quilted with fields. A farmstead at the landing pad with a plot going spare: seeds at the stall, water from the well, and whatever grows, Marlo buys.',
      places: ['The farmstead', 'The pond and the orchard', 'Hollin\u2019s seed stall'],
      apps: [],
      color: '#90d070', px: 0.47, py: 0.5, hasOverworld: true
    },
    {
      id: 'hoarfell', loc: 'hoarfell', name: 'HOARFELL', kind: 'Ice world · the Hoarspire',
      blurb: 'Snowfields and frozen seas under a low pink sun. Fellhaven, a ski village under the cliffs: three climbing routes up the Hoarspire, a chairlift, runs to ski back down.',
      places: ['Fellhaven', 'The Staircase · the Icefall', 'The summit of the Hoarspire'],
      apps: [],
      color: '#a8d8f0', px: 0.13, py: 0.36, hasOverworld: true
    },
    {
      id: 'sylvara', loc: 'sylvara', name: 'SYLVARA', kind: 'Forest world \u00b7 the wood elves',
      blurb: 'One forest from pole to pole, trees wider than houses. Elderglade, the wood elves\u2019 capital, where Queen Alyssa holds court inside the Great Tree with Beckolas, her first sword, at her side.',
      places: ['Elderglade', 'The Heartwood Hall', 'The Moonwell'],
      apps: [],
      color: '#7ac070', px: 0.5, py: 0.16, hasOverworld: true
    }
  ];

  function here() {
    var loc = typeof BridgeOrbit !== 'undefined' ? BridgeOrbit.getLocation() : 'deep-space';
    for (var i = 0; i < WORLDS.length; i++) if (WORLDS[i].loc === loc) return i;
    return -1;
  }

  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  // ---- DOM: names, the detail panel, the jump control -------------------------------------------
  function show() {
    overlay = document.getElementById('starmap-overlay');
    overlay.style.display = 'block';
    overlay.classList.add('active');
    var h = here();
    selected = h >= 0 ? (h + 1) % WORLDS.length : 0;
    var visited = getVisited();
    var html = '<div class="nav-head"><span class="ip-key">Esc</span> Bridge<span class="nav-title">NAVIGATION</span></div>';
    for (var i = 0; i < WORLDS.length; i++) {
      var w = WORLDS[i];
      var status = i === h ? 'You are here' : visited[w.id] ? 'Charted' : 'Uncharted';
      html += '<button class="nav-node' + (i === h ? ' here' : '') + '" data-i="' + i + '" style="left:' + (w.px * 100) + '%;top:' + (w.py * 100) + '%">' +
              '<span class="nav-name">' + w.name + '</span><span class="nav-status">' + status + '</span></button>';
    }
    html += '<div class="nav-panel" id="nav-panel"></div>';
    html += '<div class="nav-hint"><span class="ip-key">←</span><span class="ip-key">→</span> choose' +
            '<span class="ip-key">Enter</span> hold to jump</div>';
    overlay.innerHTML = html;
    var nodes = overlay.querySelectorAll('.nav-node');
    for (var j = 0; j < nodes.length; j++) {
      nodes[j].addEventListener('click', function () { select(+this.getAttribute('data-i')); });
    }
    overlay.querySelector('.nav-head').addEventListener('click', back);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('keyup', onKeyUp, true);
    select(selected);
  }

  // what's waiting at a world: quests begun there and not finished, people there who'd join your crew
  var LOC_RX = { lumar: /^lumar/, arcadia: /^(arcadia|cyber|chrome|junk|tech)/, enigma: /^enigma/, singularity: /^singularity/, verdance: /^verdance/, hoarfell: /^hoarfell/, sylvara: /^sylvara/ };
  function waiting(loc) {
    var rx = LOC_RX[loc], out = [];
    if (!rx) return '';
    if (typeof BridgeQuests !== 'undefined' && BridgeQuests.summary) {
      BridgeQuests.summary().forEach(function (q) {
        if (q.started && !q.done && q.worlds.some(function (wid) { return rx.test(wid); })) out.push(q.title + ' · ' + q.found + '/' + q.total);
      });
    }
    if (typeof BridgePeople !== 'undefined' && typeof BridgeCrew !== 'undefined') {
      var all = BridgePeople.all();
      Object.keys(all).forEach(function (id) {
        var p = all[id];
        if (p.crew && !BridgeCrew.isHired(id) && p.at.some(function (a) { return rx.test(a.world); }) && BridgePeople.met(id)) {
          out.push(p.name + ' would sign on (' + p.crew.role + ')');
        }
      });
    }
    if (typeof BridgeBusiness !== 'undefined') {
      BridgeBusiness.summary().forEach(function (b) { if (b.loc === loc && b.pending > 0) out.push(b.name + ': ' + b.pending + ' coins to collect'); });
    }
    if (!out.length) return '';
    return '<div class="nav-p-sub">Waiting for you</div><ul class="nav-p-list">' +
      out.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
  }

  function select(i) {
    selected = (i + WORLDS.length) % WORLDS.length;
    var w = WORLDS[selected];
    var h = here();
    var nodes = overlay.querySelectorAll('.nav-node');
    for (var j = 0; j < nodes.length; j++) nodes[j].classList.toggle('selected', j === selected);
    var panel = document.getElementById('nav-panel');
    var isHere = selected === h;
    panel.innerHTML =
      '<canvas class="nav-planet" width="72" height="72"></canvas>' +
      '<div class="nav-p-name" style="color:' + w.color + '">' + w.name + '</div>' +
      '<div class="nav-p-kind">' + esc(w.kind) + '</div>' +
      '<div class="nav-p-blurb">' + esc(w.blurb) + '</div>' +
      '<div class="nav-p-sub">Known places</div>' +
      '<ul class="nav-p-list">' + w.places.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>' +
      waiting(w.loc) +
      (isHere ? '<div class="nav-p-here">The Wayfarer is in orbit here.</div>'
              : '<button class="nav-jump" id="nav-jump"><span class="nav-jump-fill"></span><span class="nav-jump-label">Hold to jump</span></button>' +
                '<label class="nav-stay"><input type="checkbox" id="nav-stay"' + (stayAboard() ? ' checked' : '') + '> Stay aboard after the jump</label>');
    panelPlanet = panel.querySelector('.nav-planet');
    var sb = document.getElementById('nav-stay');
    if (sb) sb.addEventListener('change', function () { try { localStorage.setItem('bridge_stay_aboard', sb.checked ? '1' : ''); } catch (e) { /* private */ } });
    var jb = document.getElementById('nav-jump');
    if (jb) {
      jb.addEventListener('pointerdown', function (e) { e.preventDefault(); startCharge(); });
      jb.addEventListener('pointerup', stopCharge);
      jb.addEventListener('pointerleave', stopCharge);
    }
  }

  function startCharge() {
    if (charging || selected === here()) return;
    charging = { start: performance.now() };
  }
  function stopCharge() { charging = null; }

  function onKey(e) {
    if (!overlay || overlay.style.display === 'none') return;
    var k = e.key;
    if (k === 'ArrowRight' || k === 'd' || k === 'D' || k === 'ArrowDown' || k === 's' || k === 'S') { e.preventDefault(); select(selected + 1); }
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A' || k === 'ArrowUp' || k === 'w' || k === 'W') { e.preventDefault(); select(selected - 1); }
    else if (k === 'Enter' || k === 'j' || k === 'J' || k === ' ') { e.preventDefault(); if (!e.repeat) startCharge(); }
    else if (k === 'Escape') { e.preventDefault(); back(); }
  }
  function onKeyUp(e) {
    if (e.key === 'Enter' || e.key === 'j' || e.key === 'J' || e.key === ' ') stopCharge();
  }

  function jump() {
    var w = WORLDS[selected];
    charging = null;
    var from = typeof BridgeOrbit !== 'undefined' ? BridgeOrbit.getLocation() : 'deep-space';
    if (typeof BridgeOrbit !== 'undefined') BridgeOrbit.setLocation(w.id);
    BridgeState.transition('travel', { world: w, from: from });
  }

  function back(e) {
    if (e && e.preventDefault) e.preventDefault();
    var saved = BridgeState.getWorldPos();
    var spawn = (saved && saved.worldId === 'bridge') ? { x: saved.x, y: saved.y } : null;
    BridgeState.clearWorldPos();
    BridgeWorld.load('bridge', function () {
      BridgeState.transition('world', { worldId: 'bridge', spawn: spawn });
    });
  }

  // ---- the chart -------------------------------------------------------------------------------
  function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  function draw(ctx, w, h) {
    var now = performance.now();
    var Z = Math.max(2, Math.round(Math.min(w, h) / 300));
    var W = Math.ceil(w / Z), H = Math.ceil(h / Z);
    if (buf.width !== W || buf.height !== H) { buf.width = W; buf.height = H; }
    var b = bctx;
    b.imageSmoothingEnabled = false;
    // deep space, a band of nebula, faint constellation grid
    var g = b.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#05060f'); g.addColorStop(0.5, '#0a0a1c'); g.addColorStop(1, '#070512');
    b.fillStyle = g; b.fillRect(0, 0, W, H);
    b.save();
    b.globalCompositeOperation = 'lighter';
    for (var n = 0; n < 6; n++) {
      var nx = W * (0.1 + n * 0.17), ny = H * (0.75 - n * 0.09) + Math.sin(now / 9000 + n) * 4;
      var ng = b.createRadialGradient(nx, ny, 0, nx, ny, W * 0.2);
      ng.addColorStop(0, n % 2 ? 'rgba(90,40,140,0.12)' : 'rgba(30,80,120,0.1)');
      ng.addColorStop(1, 'rgba(0,0,0,0)');
      b.fillStyle = ng; b.fillRect(nx - W * 0.2, ny - W * 0.2, W * 0.4, W * 0.4);
    }
    b.restore();
    for (var s = 0; s < 220; s++) {
      var tw = 0.3 + 0.5 * hash(s * 3) + 0.2 * Math.sin(now / 800 + s);
      b.fillStyle = 'rgba(220,225,255,' + tw.toFixed(2) + ')';
      b.fillRect(Math.floor(hash(s) * W), Math.floor(hash(s + 50) * H), 1, 1);
    }
    b.fillStyle = 'rgba(120,150,220,0.06)';
    for (var gx = 0; gx < W; gx += 24) b.fillRect(gx, 0, 1, H);
    for (var gy = 0; gy < H; gy += 24) b.fillRect(0, gy, W, 1);
    var hi = here();
    function P(i) { return [Math.round(WORLDS[i].px * W), Math.round(WORLDS[i].py * H)]; }
    // range rings round the Wayfarer
    var c0 = hi >= 0 ? P(hi) : [Math.round(W * 0.45), Math.round(H * 0.5)];
    b.strokeStyle = 'rgba(140,180,240,0.14)';
    b.lineWidth = 1;
    for (var r = 1; r <= 4; r++) {
      b.setLineDash([2, 3]);
      b.beginPath(); b.arc(c0[0], c0[1], r * Math.min(W, H) * 0.14, 0, Math.PI * 2); b.stroke();
    }
    b.setLineDash([]);
    // faint lanes between every system, the chosen route bright and streaming
    for (var i = 0; i < WORLDS.length; i++) {
      for (var j = i + 1; j < WORLDS.length; j++) {
        var a = P(i), bb = P(j);
        b.strokeStyle = 'rgba(150,170,220,0.12)';
        b.beginPath(); b.moveTo(a[0], a[1]); b.lineTo(bb[0], bb[1]); b.stroke();
      }
    }
    if (selected !== hi) {
      var from = c0, to = P(selected);
      var mx = (from[0] + to[0]) / 2, my = (from[1] + to[1]) / 2 - Math.hypot(to[0] - from[0], to[1] - from[1]) * 0.18;
      b.strokeStyle = WORLDS[selected].color;
      b.lineWidth = 1;
      b.setLineDash([4, 3]);
      b.lineDashOffset = -now / 60;
      b.beginPath(); b.moveTo(from[0], from[1]); b.quadraticCurveTo(mx, my, to[0], to[1]); b.stroke();
      b.setLineDash([]);
      if (charging) {                                           // the drive charging: the route fills with light
        var cf = Math.min(1, (now - charging.start) / CHARGE_MS);
        b.save();
        b.globalCompositeOperation = 'lighter';
        b.lineWidth = 2;
        b.strokeStyle = 'rgba(255,255,255,' + (0.3 + cf * 0.7).toFixed(2) + ')';
        b.beginPath(); b.moveTo(from[0], from[1]);
        var steps = Math.round(cf * 20);
        for (var q = 1; q <= steps; q++) {
          var tt = q / 20;
          b.lineTo((1 - tt) * (1 - tt) * from[0] + 2 * (1 - tt) * tt * mx + tt * tt * to[0],
                   (1 - tt) * (1 - tt) * from[1] + 2 * (1 - tt) * tt * my + tt * tt * to[1]);
        }
        b.stroke();
        b.restore();
        if (cf >= 1) setTimeout(jump, 0);
      }
    }
    // the systems: live planets
    for (var k = 0; k < WORLDS.length; k++) {
      var p = P(k), wk = WORLDS[k];
      var kind = BridgeOrbit.kindOf(wk.id);
      var R = k === selected ? 13 : 9;
      if (k === selected) {                                     // target lock
        b.strokeStyle = wk.color;
        b.lineWidth = 1;
        var lr = R + 6 + Math.sin(now / 250) * 1;
        for (var qd = 0; qd < 4; qd++) {
          var a0 = qd * Math.PI / 2 + now / 2400 + 0.25;
          b.beginPath(); b.arc(p[0], p[1], lr, a0, a0 + Math.PI / 2 - 0.5); b.stroke();
        }
      }
      if (kind === 'hole') BridgeOrbit.drawHole(b, p[0], p[1], R, now);
      else if (kind === 'gas' && wk.id === 'enigma') {
        BridgeOrbit.drawPlanet(b, 'gas', p[0], p[1], R, now);
        BridgeOrbit.drawStation(b, p[0] + R + 5, p[1] - R * 0.6, 3, now);
      } else BridgeOrbit.drawPlanet(b, kind || 'ocean', p[0], p[1], R, now);
      if (k === hi) {                                           // the Wayfarer, in orbit
        var oa = now / 1800;
        var sx = p[0] + Math.cos(oa) * (R + 7), sy = p[1] + Math.sin(oa) * (R + 4) * 0.5;
        b.fillStyle = '#e8d8a0'; b.fillRect(Math.round(sx) - 2, Math.round(sy), 5, 1);
        b.fillStyle = '#3a3a8a'; b.fillRect(Math.round(sx) - 1, Math.round(sy) - 1, 3, 1);
        b.fillStyle = '#80e0ff'; b.fillRect(Math.round(sx) - 3, Math.round(sy), 1, 1);
      }
    }
    // frame corners, brass
    b.fillStyle = '#a08040';
    [[2, 2, 1, 1], [W - 3, 2, -1, 1], [2, H - 3, 1, -1], [W - 3, H - 3, -1, -1]].forEach(function (c) {
      b.fillRect(c[0], c[1], 10 * c[2], 1); b.fillRect(c[0], c[1], 1, 10 * c[3]);
      if (c[2] < 0) b.fillRect(c[0] - 9, c[1], 10, 1);
      if (c[3] < 0) b.fillRect(c[0], c[1] - 9, 1, 10);
    });
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, 0, 0, W * Z, H * Z);
    ctx.restore();
    // the panel's planet, turning
    if (panelPlanet) {
      var pc = panelPlanet.getContext('2d');
      pc.imageSmoothingEnabled = false;
      pc.clearRect(0, 0, 72, 72);
      var wk2 = WORLDS[selected], kd = BridgeOrbit.kindOf(wk2.id);
      if (kd === 'hole') BridgeOrbit.drawHole(pc, 36, 36, 20, now);
      else BridgeOrbit.drawPlanet(pc, kd || 'ocean', 36, 36, 26, now);
    }
    var jl = overlay && overlay.querySelector('.nav-jump-fill');
    if (jl) jl.style.width = (charging ? Math.min(100, (now - charging.start) / CHARGE_MS * 100) : 0) + '%';
  }

  function hide() {
    charging = null;
    panelPlanet = null;
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('keyup', onKeyUp, true);
    if (overlay) {
      overlay.style.display = 'none';
      overlay.classList.remove('active');
    }
  }

  // after a jump: straight down in the shuttle (the default), or stay aboard on the bridge to look out at the world
  function stayAboard() { try { return localStorage.getItem('bridge_stay_aboard') === '1'; } catch (e) { return false; } }

  return { show: show, draw: draw, hide: hide, markVisited: markVisited, getVisited: getVisited, stayAboard: stayAboard };
})();
