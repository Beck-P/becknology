/**
 * BridgeStarmap — Star map with planet nodes, info panel, and jump trigger.
 *
 * Renders canvas background (connection lines) and DOM nodes/panels.
 * Clicking a planet shows an info panel. "JUMP HERE" initiates hyperspace.
 */
var BridgeStarmap = (function () {
  var overlay;
  var selected = null;

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
      id: 'arcadia-street',
      name: 'ARCADIA',
      blurb: 'A retro arcade planet bathed in neon light. Cabinets line the streets, high scores flicker on the walls.',
      apps: [{ name: 'Runouts', url: '/runouts' }],
      color: '#d06090',
      glow: 'rgba(208, 96, 144, 0.3)',
      px: 0.25,
      py: 0.35,
      hasOverworld: true
    },
    {
      id: 'singularity',
      name: 'THE SINGULARITY',
      blurb: 'A cosmic anomaly at the edge of known space. Reality warps and fractures around its event horizon.',
      apps: [{ name: 'Genart', url: '/genart' }],
      color: '#a078dc',
      glow: 'rgba(160, 120, 220, 0.3)',
      px: 0.45,
      py: 0.55,
      hasOverworld: true
    },
    {
      id: 'enigma',
      name: 'ENIGMA STATION',
      blurb: 'An abandoned intelligence outpost drifting in deep space. Terminals still flicker with encrypted transmissions.',
      apps: [
        { name: 'Cipher Room', url: '/cipher-room', desc: 'Daily crossword dispatches' },
        { name: 'Typist', url: '/typist', desc: 'Signal relay — decode transmissions' }
      ],
      color: '#5cc8d0',
      glow: 'rgba(92, 200, 208, 0.3)',
      px: 0.70,
      py: 0.30,
      hasOverworld: true
    },
    {
      id: 'lumar',
      name: 'LUMAR',
      blurb: 'A world of emerald spore seas and moonlit shores. Saltstone islands rise from shimmering green depths.',
      apps: [{ name: 'Aether Seas', url: '/aether-seas' }],
      color: '#40a068',
      glow: 'rgba(64, 160, 104, 0.3)',
      px: 0.20,
      py: 0.70,
      hasOverworld: true
    }
  ];

  function show() {
    overlay = document.getElementById('starmap-overlay');
    overlay.style.display = 'block';
    overlay.classList.add('active');
    selected = null;

    var html = '<a class="starmap-back" id="starmap-back">&larr; BRIDGE</a>';
    html += '<div class="starmap-container">';
    html += '<div class="starmap-you-are-here">&#9670; YOU ARE HERE</div>';

    var visited = getVisited();
    for (var i = 0; i < WORLDS.length; i++) {
      var w = WORLDS[i];
      var visitedCls = visited[w.id] ? ' visited' : '';
      html += '<div class="starmap-planet' + visitedCls + '" data-world="' + i + '" style="' +
        'left:' + (w.px * 100) + '%;top:' + (w.py * 100) + '%;' +
        'background:radial-gradient(circle,' + w.color + ',' + w.color + '80 60%,transparent 70%);' +
        'box-shadow:0 0 20px ' + w.glow + ';' +
        '">' +
        '<span class="starmap-planet-label">' + w.name + '</span>' +
        '</div>';
    }

    html += '<div class="starmap-info" id="starmap-info"></div>';
    html += '</div>';

    overlay.innerHTML = html;

    var planetEls = overlay.querySelectorAll('.starmap-planet');
    for (var i = 0; i < planetEls.length; i++) {
      planetEls[i].addEventListener('click', function () {
        selectWorld(parseInt(this.getAttribute('data-world')));
      });
    }

    document.getElementById('starmap-back').addEventListener('click', function (e) {
      e.preventDefault();
      // Return to the bridge — preserve hologram position if we have one.
      var saved = BridgeState.getWorldPos();
      var spawn = (saved && saved.worldId === 'bridge')
        ? { x: saved.x, y: saved.y } : null;
      // Clear it so future returns from worlds use the bridge spawn instead.
      BridgeState.clearWorldPos();
      BridgeWorld.load('bridge', function () {
        BridgeState.transition('world', { worldId: 'bridge', spawn: spawn });
      });
    });
  }

  function selectWorld(index) {
    selected = WORLDS[index];
    var info = document.getElementById('starmap-info');

    var appsHtml = '<div class="apps-list">';
    for (var i = 0; i < selected.apps.length; i++) {
      appsHtml += '<span>&#9656; ' + selected.apps[i].name + '</span>';
    }
    appsHtml += '</div>';

    info.innerHTML =
      '<a class="starmap-info-close" id="info-close">&times;</a>' +
      '<h3>' + selected.name + '</h3>' +
      '<p>' + selected.blurb + '</p>' +
      appsHtml +
      '<button class="jump-btn" id="jump-btn">JUMP HERE</button>';

    info.classList.add('visible');

    document.getElementById('info-close').addEventListener('click', function (e) {
      e.stopPropagation();
      info.classList.remove('visible');
      info.style.top = '';
      info.style.bottom = '';
      selected = null;
    });

    // On mobile, position the info panel near the selected planet
    if (window.innerWidth <= 768) {
      var planetY = selected.py * 100;
      // Place above or below the planet depending on position
      if (planetY > 50) {
        // Planet is in lower half — show panel above it
        info.style.top = Math.max(5, planetY - 45) + '%';
        info.style.bottom = 'auto';
      } else {
        // Planet is in upper half — show panel below it
        info.style.top = (planetY + 10) + '%';
        info.style.bottom = 'auto';
      }
    }

    document.getElementById('jump-btn').addEventListener('click', function () {
      BridgeState.transition('travel', { world: selected });
    });
  }

  function draw(ctx, w, h) {
    var t = Date.now() / 1000;
    var cx = w * 0.45;
    var cy = h * 0.50;
    var minDim = Math.min(w, h);

    ctx.save();

    // 1. Tactical astrogation polar range rings
    for (var r = 1; r <= 3; r++) {
      var rad = minDim * (0.16 * r);
      ctx.strokeStyle = 'rgba(120, 160, 220, ' + (0.045 + (3 - r) * 0.015).toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Subtle crosshair axes through chart origin
    ctx.strokeStyle = 'rgba(120, 160, 220, 0.04)';
    ctx.beginPath();
    ctx.moveTo(cx - minDim * 0.52, cy);
    ctx.lineTo(cx + minDim * 0.52, cy);
    ctx.moveTo(cx, cy - minDim * 0.52);
    ctx.lineTo(cx, cy + minDim * 0.52);
    ctx.stroke();

    // 2. Connection hyperlanes + traveling telemetry pulses
    for (var i = 0; i < WORLDS.length - 1; i++) {
      for (var j = i + 1; j < WORLDS.length; j++) {
        var x1 = WORLDS[i].px * w + 24;
        var y1 = WORLDS[i].py * h + 24;
        var x2 = WORLDS[j].px * w + 24;
        var y2 = WORLDS[j].py * h + 24;
        var p = (Math.sin(t * 0.7 + (i + j) * 0.9) + 1) * 0.5;

        ctx.strokeStyle = 'rgba(160, 180, 220, ' + (0.10 + p * 0.10).toFixed(3) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Traveling signal bead along the lane
        var beadT = ((t * 0.22 + i * 0.31 + j * 0.19) % 1);
        var bx = x1 + (x2 - x1) * beadT;
        var by = y1 + (y2 - y1) * beadT;
        ctx.fillStyle = 'rgba(190, 225, 255, ' + (0.35 + p * 0.35).toFixed(2) + ')';
        ctx.fillRect(Math.floor(bx - 1.5), Math.floor(by - 1.5), 3, 3);
      }
    }

    // 3. Canvas-drawn planetary details behind each DOM planet node
    for (var k = 0; k < WORLDS.length; k++) {
      var pw = WORLDS[k];
      var px = pw.px * w + 24;
      var py = pw.py * h + 24;

      if (pw.id === 'arcadia-street') {
        // Tilted neon planetary ring
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(-0.38);
        ctx.strokeStyle = 'rgba(232, 120, 175, 0.42)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 36, 11, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (pw.id === 'singularity') {
        // Rotating event-horizon accretion swirl
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(t * 0.55);
        ctx.strokeStyle = 'rgba(180, 130, 255, 0.38)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 34, 16, 0, 0, Math.PI * 1.65);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, 0, 28, 13, 0.8, Math.PI * 0.4, Math.PI * 1.9);
        ctx.stroke();
        ctx.restore();
      } else if (pw.id === 'enigma') {
        // Orbiting relay satellite + dashed telemetry orbit
        var satAng = t * 0.9;
        var sx = px + Math.cos(satAng) * 32;
        var sy = py + Math.sin(satAng) * 18;
        ctx.strokeStyle = 'rgba(92, 200, 208, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(px, py, 32, 18, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#90f0f8';
        ctx.fillRect(Math.floor(sx - 2), Math.floor(sy - 2), 4, 4);
      } else if (pw.id === 'lumar') {
        // Orbiting silver moon + emerald spore shimmer ring
        var moonAng = t * 0.45 + 1.2;
        var mx = px + Math.cos(moonAng) * 34;
        var my = py + Math.sin(moonAng) * 20;
        ctx.strokeStyle = 'rgba(80, 210, 140, 0.24)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(px, py, 34, 20, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#d8e4ec';
        ctx.beginPath();
        ctx.arc(mx, my, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Animated target-lock reticle on the selected world
      if (selected && selected.id === pw.id) {
        var lockR = 34 + Math.sin(t * 4) * 2;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(t * 0.4);
        ctx.strokeStyle = pw.color || '#a0c8ff';
        ctx.lineWidth = 1.5;
        for (var q = 0; q < 4; q++) {
          var a0 = q * (Math.PI / 2) + 0.18;
          var a1 = (q + 1) * (Math.PI / 2) - 0.18;
          ctx.beginPath();
          ctx.arc(0, 0, lockR, a0, a1);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    ctx.restore();
  }

  function hide() {
    selected = null;
    if (overlay) {
      overlay.style.display = 'none';
      overlay.classList.remove('active');
    }
  }

  return { show: show, draw: draw, hide: hide, markVisited: markVisited, getVisited: getVisited };
})();
