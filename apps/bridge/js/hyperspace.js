/**
 * BridgeHyperspace — Hyperspace jump animation.
 *
 * Sequence: starfield streaks (2s) → white/purple flash (0.5s) → navigate or selection screen
 */
var BridgeHyperspace = (function () {

  function start(context) {
    var world = context.world;

    // Hide overlays
    BridgeCockpit.hide();
    BridgeStarmap.hide();

    // Streak mode
    BridgeStarfield.setMode('streak');

    // After 2s, flash
    setTimeout(function () {
      flash(function () {
        BridgeStarfield.setMode('drift');

        if (world.hasOverworld) {
          // World has a walkable overworld — go through landing animation
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

    html += '<a class="selection-back" id="selection-back">&larr; RETURN TO COCKPIT</a>';
    html += '</div>';

    overlay.innerHTML = html;

    document.getElementById('selection-back').addEventListener('click', function (e) {
      e.preventDefault();
      overlay.style.display = 'none';
      overlay.classList.remove('active');
      BridgeState.transition('cockpit');
    });
  }

  return { start: start };
})();
