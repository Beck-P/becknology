/**
 * BridgeLanding — Arrival animation when entering a world.
 *
 * Shows world name + subtitle, then fades into the world view.
 */
var BridgeLanding = (function () {
  var overlay;

  function show(worldData) {
    overlay = document.getElementById('landing-overlay');
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.classList.add('active');
    overlay.style.opacity = '1';
    overlay.style.background = 'rgba(0, 0, 0, 0.9)';
    overlay.style.transition = 'opacity 1s';

    overlay.innerHTML =
      '<div class="landing-text">' + worldData.name.toUpperCase() + '</div>' +
      '<div class="landing-subtitle">ARRIVING...</div>';

    // Load the world data in parallel
    BridgeWorld.load(worldData.id, function () {
      // After 1.5s, fade out landing and show world
      setTimeout(function () {
        overlay.style.opacity = '0';

        setTimeout(function () {
          overlay.style.display = 'none';
          overlay.classList.remove('active');
          BridgeState.transition('world', { worldId: worldData.id });
        }, 1000);
      }, 1500);
    });
  }

  return { show: show };
})();
