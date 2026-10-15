/**
 * BridgeHyperspace — Hyperspace jump animation.
 *
 * Sequence: starfield streaks (2s) → white/purple flash (0.5s) → navigate or selection screen
 */
var BridgeHyperspace = (function () {

  function start(context) {
    var world = context.world;

    // Hide overlays (cockpit retired; bridge world will be hidden by the
    // world overlay system when state changes — no manual hide needed here)
    BridgeStarmap.hide();

    // The Wayfarer's jump, as a cutscene (from where it was parked to the new world), then straight down
    // in the shuttle to the world's pad — the first time at a world, a moment on it and its name before
    // the shuttle goes. The star map's "stay aboard" keeps you on the bridge instead (gaze out of the window).
    if (world.hasOverworld && typeof BridgeShip !== 'undefined' && typeof BridgeCine !== 'undefined' && BridgeCine.jump) {
      var from = context.from || 'deep-space';
      var first = !BridgeStarmap.getVisited()[world.id];
      var stay = BridgeStarmap.stayAboard();
      BridgeCine.jump(from, world.loc || world.id, { hold: 150, first: first, name: world.name, kind: world.kind }).then(function () {
        BridgeStarmap.markVisited(world.id);
        if (typeof BridgeProgression !== 'undefined') {
          BridgeProgression.recordAchievement('visited_' + (world.loc || world.id), 25, { source: 'hyperspace' })
            .then(function () { BridgeProgression.maybeAwardWayfarer(); });
        }
        if (stay) BridgeShip.arriveInOrbit(world);
        else BridgeShip.descend(world);
      });
      return;
    }

    // Streak mode
    BridgeStarfield.setMode('streak');

    // After 2s, flash
    setTimeout(function () {
      flash(function () {
        BridgeStarfield.setMode('drift');

        if (world.hasOverworld && typeof BridgeShip !== 'undefined') {
          // The mothership arrives in orbit; the shuttle takes you down
          BridgeShip.arriveInOrbit(world);
        } else if (world.hasOverworld) {
          BridgeState.transition('landing', { id: world.id, name: world.name });
        } else if (world.apps.length === 1) {
          // Single app — navigate directly
          BridgeState.transition('redirect', { url: world.apps[0].url });
        } else {
          // Multi-app — show selection screen
          showSelection(world);
        }
      });
    }, 2000);
  }

  function flash(callback) {
    var div = document.createElement('div');
    div.style.cssText =
      'position:fixed;top:0;left:0;right:0;bottom:0;z-index:200;' +
      'background:white;opacity:0;transition:opacity 0.15s;';
    document.body.appendChild(div);

    // Flash white
    requestAnimationFrame(function () {
      div.style.opacity = '0.8';
    });

    setTimeout(function () {
      div.style.background = 'rgba(160, 120, 220, 0.6)';
      div.style.opacity = '0.5';
    }, 150);

    setTimeout(function () {
      div.style.opacity = '0';
    }, 350);

    setTimeout(function () {
      div.remove();
      callback();
    }, 550);
  }

  function showSelection(world) {
    var overlay = document.getElementById('selection-overlay');
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.classList.add('active');

    var html = '<div class="selection-panel">';
    html += '<h2>' + world.name + '</h2>';

    for (var i = 0; i < world.apps.length; i++) {
      var app = world.apps[i];
      html += '<a class="selection-app" href="' + app.url + '">';
      html += '<div>' + app.name + '</div>';
      if (app.desc) {
        html += '<div class="app-desc">' + app.desc + '</div>';
      }
      html += '</a>';
    }

    html += '<a class="selection-back" id="selection-back">&larr; RETURN TO BRIDGE</a>';
    html += '</div>';

    overlay.innerHTML = html;

    document.getElementById('selection-back').addEventListener('click', function (e) {
      e.preventDefault();
      overlay.style.display = 'none';
      overlay.classList.remove('active');
      BridgeWorld.load('bridge', function () {
        BridgeState.transition('world', { worldId: 'bridge' });
      });
    });
  }

  return { start: start };
})();
