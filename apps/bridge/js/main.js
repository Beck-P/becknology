/**
 * Bridge — Main entry point.
 * Wires modules together, runs the animation loop, handles state transitions.
 */
var Bridge = (function () {
  var canvas, ctx;
  var dpr;

  function init() {
    canvas = document.getElementById('bridge-canvas');
    ctx = canvas.getContext('2d');

    resize();
    window.addEventListener('resize', resize);
    // Short of graphics memory (a long session, many rooms, a 3D game in the cabinet) the browser can
    // drop the canvas and hand it back blank, its scale reset: set it up again and redraw the caches
    // that may have gone blank with it.
    canvas.addEventListener('contextrestored', recover);

    BridgeStarfield.init(canvas);
    if (typeof BridgeCoinHUD !== 'undefined') BridgeCoinHUD.init();
    if (typeof BridgeInventory !== 'undefined') BridgeInventory.init();
    BridgeState.onChange(onStateChange);

    // Check if returning from an app with a saved world position
    var savedWorldPos = BridgeState.loadWorldPos();
    if (savedWorldPos && BridgeState.getCachedPilotName()) {
      var cached = BridgeState.getCachedPilotName();
      BridgeDB.lookupPilot(cached).then(function (result) {
        if (result && !result.error) {
          BridgeState.setPilot(result);
          BridgeDB.updateLastSeen(result.id);
          // Load world and restore position
          BridgeWorld.load(savedWorldPos.worldId, function () {
            BridgeState.transition('world', {
              worldId: savedWorldPos.worldId,
              spawn: { x: savedWorldPos.x, y: savedWorldPos.y }
            });
          });
        } else {
          BridgeState.clearPilot();
          BridgeState.transition('intro');
        }
      });
    } else {
      // Normal start — intro (ship flythrough)
      // Cached pilots skip identity after the zoom — handled in intro.js
      BridgeState.transition('intro');
    }

    requestAnimationFrame(loop);
  }

  var sizedW = 0, sizedH = 0;
  function resize() {
    dpr = window.devicePixelRatio || 1;
    sizedW = window.innerWidth; sizedH = window.innerHeight;
    canvas.width = sizedW * dpr;
    canvas.height = sizedH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function recover() {
    resize();
    if (typeof BridgeWorld !== 'undefined' && BridgeWorld.invalidateTiles) BridgeWorld.invalidateTiles();
    if (typeof BridgeScene !== 'undefined' && BridgeScene.restore) BridgeScene.restore();
    if (typeof BridgeSea !== 'undefined' && BridgeSea.reset) BridgeSea.reset();
    if (typeof BridgeOrbit !== 'undefined' && BridgeOrbit.reset) BridgeOrbit.reset();
  }

  function loop() {
    if (typeof BridgeVoyage !== 'undefined' && BridgeVoyage.covers()) { requestAnimationFrame(loop); return; }
    if (typeof BridgeSloop !== 'undefined' && BridgeSloop.covers()) { requestAnimationFrame(loop); return; }
    var w = window.innerWidth;
    var h = window.innerHeight;

    // The canvas's size and scale, made right every frame: a window moved to another screen changes
    // its pixel density without a resize, and a canvas the browser restored comes back unscaled — which
    // left this clear covering only the top-left quarter, and old frames showing round the rest.
    if (w !== sizedW || h !== sizedH || (window.devicePixelRatio || 1) !== dpr) resize();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);

    var state = BridgeState.getState();

    // Background: world tiles for world state, starfield for everything else
    if (state === 'world' && typeof BridgeWorld !== 'undefined') {
      BridgeWorld.update();
      BridgeWorld.draw(ctx, w, h);
    } else if (state !== 'redirect') {
      BridgeStarfield.draw(ctx, w, h);
    }

    // State-specific rendering (guarded — modules load incrementally)
    if (state === 'intro' && typeof BridgeIntro !== 'undefined') {
      BridgeIntro.draw(ctx, w, h);
    } else if (state === 'starmap' && typeof BridgeStarmap !== 'undefined') {
      BridgeStarmap.draw(ctx, w, h);
    }

    requestAnimationFrame(loop);
  }

  function onStateChange(newState, prevState, context) {
    var overlays = document.querySelectorAll('.overlay');
    for (var i = 0; i < overlays.length; i++) {
      overlays[i].style.display = 'none';
      overlays[i].classList.remove('active');
    }

    // Inventory panel: visible whenever the player is in a world; hidden
    // during pre-pilot states (intro/identity) and pure-canvas modes.
    if (typeof BridgeInventory !== 'undefined') {
      if (newState === 'world') BridgeInventory.show();
      else BridgeInventory.hide();
    }

    // Module calls guarded — they're created incrementally across tasks
    switch (newState) {
      case 'intro':
        if (typeof BridgeIntro !== 'undefined') BridgeIntro.show();
        break;
      case 'identity':
        if (typeof BridgeIdentity !== 'undefined') BridgeIdentity.show();
        break;
      case 'starmap':
        if (typeof BridgeStarmap !== 'undefined') BridgeStarmap.show();
        break;
      case 'travel':
        if (typeof BridgeHyperspace !== 'undefined') BridgeHyperspace.start(context);
        break;
      case 'landing':
        if (typeof BridgeLanding !== 'undefined') BridgeLanding.show(context);
        break;
      case 'world':
        if (typeof BridgeWorld !== 'undefined') BridgeWorld.show(context && context.spawn);
        // Track wayfarer progress when player lands on a hyperspace destination.
        if (typeof BridgeProgression !== 'undefined' && context && context.worldId) {
          var destinations = { arcadia: 1, lumar: 1, singularity: 1, enigma: 1, 'arcadia-street': 1, verdance: 1, hoarfell: 1, sylvara: 1 };
          var landed = context.worldId === 'verdance-village' ? 'verdance' : context.worldId;   // Verdance's shuttle sets down in Brambleford
          if (destinations[landed]) {
            if (typeof BridgeStarmap !== 'undefined' && BridgeStarmap.markVisited) {
              BridgeStarmap.markVisited(landed);
            }
            BridgeProgression.recordAchievement('visited_' + landed, 25, { source: 'hyperspace' })
              .then(function () { BridgeProgression.maybeAwardWayfarer(); });
          }
        }
        break;
      case 'redirect':
        // Fade-to-black so the bridge → app transition matches the
        // bridge-skin's fade-in on the other side.
        var fade = document.getElementById('landing-overlay');
        if (fade) {
          fade.style.display = 'block';
          fade.classList.add('active');
          fade.style.background = '#050510';
          fade.style.transition = 'opacity 0.28s ease';
          fade.style.opacity = '0';
          fade.innerHTML = '';
          void fade.offsetHeight;
          fade.style.opacity = '1';
          setTimeout(function () { window.location.href = context.url; }, 280);
        } else {
          window.location.href = context.url;
        }
        break;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { init: init };
})();
