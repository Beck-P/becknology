/**
 * BridgeControls — Keyboard + mobile d-pad input.
 *
 * Tracks which directions are held and whether the action button is pressed.
 * Other modules poll getDir() and consumeAction() each frame.
 */
var BridgeControls = (function () {
  var keys = { up: false, down: false, left: false, right: false };
  var actionPressed = false;
  var enabled = false;

  function enable() {
    enabled = true;
    keys = { up: false, down: false, left: false, right: false };
    actionPressed = false;
  }

  function disable() {
    enabled = false;
    keys = { up: false, down: false, left: false, right: false };
    actionPressed = false;
  }

  // Keyboard
  document.addEventListener('keydown', function (e) {
    if (!enabled) return;
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W': keys.up = true; e.preventDefault(); break;
      case 'ArrowDown': case 's': case 'S': keys.down = true; e.preventDefault(); break;
      case 'ArrowLeft': case 'a': case 'A': keys.left = true; e.preventDefault(); break;
      case 'ArrowRight': case 'd': case 'D': keys.right = true; e.preventDefault(); break;
      case 'Enter': case ' ': case 'e': case 'E': actionPressed = true; e.preventDefault(); break;
    }
  });

  document.addEventListener('keyup', function (e) {
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W': keys.up = false; break;
      case 'ArrowDown': case 's': case 'S': keys.down = false; break;
      case 'ArrowLeft': case 'a': case 'A': keys.left = false; break;
      case 'ArrowRight': case 'd': case 'D': keys.right = false; break;
    }
  });

  // D-pad (mobile)
  function bindDpad() {
    var dpad = document.getElementById('dpad');
    if (!dpad) return;

    var map = {
      'dpad-up': 'up', 'dpad-down': 'down',
      'dpad-left': 'left', 'dpad-right': 'right'
    };

    var btns = dpad.querySelectorAll('.dpad-btn');
    for (var i = 0; i < btns.length; i++) {
      (function (btn) {
        var dir = null;
        for (var cls in map) {
          if (btn.classList.contains(cls)) { dir = map[cls]; break; }
        }
        var isAction = btn.classList.contains('dpad-action');

        btn.addEventListener('touchstart', function (e) {
          e.preventDefault();
          if (!enabled) return;
          if (isAction) actionPressed = true;
          else if (dir) keys[dir] = true;
        });
        btn.addEventListener('touchend', function (e) {
          e.preventDefault();
          if (dir) keys[dir] = false;
        });
        btn.addEventListener('touchcancel', function () {
          if (dir) keys[dir] = false;
        });
      })(btns[i]);
    }
  }

  // Bind d-pad on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindDpad);
  } else {
    bindDpad();
  }

  /** Returns { dx, dy } for the currently held direction, or { dx:0, dy:0 }. */
  function getDir() {
    if (!enabled) return { dx: 0, dy: 0 };
    var dx = 0, dy = 0;
    if (keys.left) dx = -1;
    else if (keys.right) dx = 1;
    if (keys.up) dy = -1;
    else if (keys.down) dy = 1;
    // Prioritize one axis (no diagonal in grid movement)
    if (dx !== 0 && dy !== 0) dy = 0;
    return { dx: dx, dy: dy };
  }

  /** Returns true if action was pressed since last consume. Clears the flag. */
  function consumeAction() {
    if (!enabled) return false;
    var was = actionPressed;
    actionPressed = false;
    return was;
  }

  return {
    enable: enable,
    disable: disable,
    getDir: getDir,
    consumeAction: consumeAction
  };
})();
