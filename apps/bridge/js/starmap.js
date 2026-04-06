/**
 * BridgeStarmap — Star map with planet nodes, info panel, and jump trigger.
 *
 * Renders canvas background (connection lines) and DOM nodes/panels.
 * Clicking a planet shows an info panel. "JUMP HERE" initiates hyperspace.
 */
var BridgeStarmap = (function () {
  var overlay;
  var selected = null;

  var WORLDS = [
    {
      id: 'arcadia',
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
    }
  ];

  function show() {
    overlay = document.getElementById('starmap-overlay');
    overlay.style.display = 'block';
    overlay.classList.add('active');
    selected = null;

    var html = '<a class="starmap-back" id="starmap-back">&larr; COCKPIT</a>';
    html += '<div class="starmap-container">';

    for (var i = 0; i < WORLDS.length; i++) {
      var w = WORLDS[i];
      html += '<div class="starmap-planet" data-world="' + i + '" style="' +
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
      BridgeState.transition('cockpit');
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
    ctx.strokeStyle = 'rgba(100, 100, 120, 0.08)';
    ctx.lineWidth = 1;
    for (var i = 0; i < WORLDS.length - 1; i++) {
      for (var j = i + 1; j < WORLDS.length; j++) {
        ctx.beginPath();
        ctx.moveTo(WORLDS[i].px * w + 24, WORLDS[i].py * h + 24);
        ctx.lineTo(WORLDS[j].px * w + 24, WORLDS[j].py * h + 24);
        ctx.stroke();
      }
    }
  }

  function hide() {
    selected = null;
    if (overlay) {
      overlay.style.display = 'none';
      overlay.classList.remove('active');
    }
  }

  return { show: show, draw: draw, hide: hide };
})();
