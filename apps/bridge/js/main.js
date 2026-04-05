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

    BridgeStarfield.init(canvas);
    BridgeState.onChange(onStateChange);

    // Determine starting state
    var cached = BridgeState.getCachedPilotName();
    var saved = BridgeState.loadSaved();

    if (cached && saved && saved.state === 'cockpit') {
      // Returning from an app — restore cockpit directly
      BridgeDB.lookupPilot(cached).then(function (result) {
        if (result && !result.error) {
          BridgeState.setPilot(result);
          BridgeDB.updateLastSeen(result.id);
          BridgeState.transition('cockpit');
        } else {
          BridgeState.clearPilot();
          BridgeState.transition('intro');
        }
      });
    } else {
      // Fresh visit — start from intro
      BridgeState.transition('intro');
    }

    requestAnimationFrame(loop);
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function loop() {
    var w = window.innerWidth;
    var h = window.innerHeight;

    ctx.clearRect(0, 0, w, h);

    var state = BridgeState.getState();
    if (state !== 'redirect') {
      BridgeStarfield.draw(ctx, w, h);
    }

    // State-specific rendering (guarded — modules load incrementally)
    if (state === 'intro' && typeof BridgeIntro !== 'undefined') {
      BridgeIntro.draw(ctx, w, h);
    } else if (state === 'cockpit' && typeof BridgeCockpit !== 'undefined') {
      BridgeCockpit.draw(ctx, w, h);
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

    // Module calls guarded — they're created incrementally across tasks
    switch (newState) {
      case 'intro':
        if (typeof BridgeIntro !== 'undefined') BridgeIntro.show();
        break;
      case 'identity':
        if (typeof BridgeIdentity !== 'undefined') BridgeIdentity.show();
        break;
      case 'cockpit':
        if (typeof BridgeCockpit !== 'undefined') BridgeCockpit.show();
        break;
      case 'starmap':
        if (typeof BridgeStarmap !== 'undefined') BridgeStarmap.show();
        break;
      case 'travel':
        if (typeof BridgeHyperspace !== 'undefined') BridgeHyperspace.start(context);
        break;
      case 'redirect':
        window.location.href = context.url;
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
