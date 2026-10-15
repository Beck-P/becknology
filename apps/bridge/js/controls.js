/**
 * BridgeControls — Keyboard + mouse + mobile d-pad input.
 *
 * Tracks which directions are held and whether the action button is pressed.
 * Other modules poll getDir() and consumeAction() each frame.
 *
 * Inventory hotkeys (Stardew-style):
 *   1-0 jump to slot · [ ] cycle · F use selected
 *   left-click on world  = interact (E)
 *   right-click on world = use selected (F)
 */
var BridgeControls = (function () {
  var keys = { up: false, down: false, left: false, right: false };
  var actionPressed = false;
  var enabled = false;

  function enable() {
    enabled = true;
    document.documentElement.classList.remove('controls-off');
    keys = { up: false, down: false, left: false, right: false };
    actionPressed = false;
  }

  function disable() {
    enabled = false;
    document.documentElement.classList.add('controls-off');
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
      case 'f': case 'F':
        if (typeof BridgeInventory !== 'undefined') BridgeInventory.useSelected();
        e.preventDefault();
        break;
      case 'j': case 'J':
        if (typeof BridgeQuests !== 'undefined') BridgeQuests.toggle();
        e.preventDefault();
        break;
      case 'i': case 'I':
        if (typeof BridgeInventory !== 'undefined') BridgeInventory.toggleMenu();
        e.preventDefault();
        break;
      case '[':
        if (typeof BridgeInventory !== 'undefined') BridgeInventory.cycleSlot(-1);
        e.preventDefault();
        break;
      case ']':
        if (typeof BridgeInventory !== 'undefined') BridgeInventory.cycleSlot(1);
        e.preventDefault();
        break;
      case '1': case '2': case '3': case '4': case '5':
      case '6': case '7': case '8': case '9':
        if (typeof BridgeInventory !== 'undefined') BridgeInventory.selectSlot(parseInt(e.key, 10) - 1);
        e.preventDefault();
        break;
      case '0':
        if (typeof BridgeInventory !== 'undefined') BridgeInventory.selectSlot(9);
        e.preventDefault();
        break;
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

  // Mouse / trackpad on the world canvas. Left-click on a nearby
  // interaction acts on it (Stardew-style click-at-distance, capped at
  // ~4 tiles). Falls back to "as if E was pressed" if nothing's clicked.
  // Right-click (two-finger tap on a Mac trackpad) uses the selected
  // inventory item.
  function bindCanvasMouse() {
    var canvas = document.getElementById('bridge-canvas');
    if (!canvas) return;

    function clickedTile(e) {
      if (typeof BridgeWorld === 'undefined') return null;
      var rect = canvas.getBoundingClientRect();
      // On-screen (CSS px) placement of the last rendered frame.
      var v = BridgeWorld.getScreenView();
      var ts = v && v.ts;
      if (!ts) return null;
      var sx = e.clientX - rect.left;
      var sy = e.clientY - rect.top;
      var offX = v.offX;
      var offY = v.offY;
      return { x: Math.floor((sx - offX) / ts), y: Math.floor((sy - offY) / ts) };
    }

    canvas.addEventListener('mousedown', function (e) {
      if (!enabled) return;
      if (e.button === 0) {
        var t = clickedTile(e);
        if (t && typeof BridgeInteractions !== 'undefined' && BridgeInteractions.tryClickAt) {
          if (BridgeInteractions.tryClickAt(t.x, t.y)) {
            e.preventDefault();
            return;
          }
        }
        // No click-at-distance match — fall back to "as if E was pressed"
        // (the world.update loop will trigger if the player is adjacent
        // to something).
        actionPressed = true;
        e.preventDefault();
      } else if (e.button === 2) {
        if (typeof BridgeInventory !== 'undefined') BridgeInventory.useSelected();
        e.preventDefault();
      }
    });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  // Touch: a thumb stick (drag anywhere on it; four directions, like the
  // keys) and the A button. While another mode owns the keyboard (sailing,
  // html.keys-mode) the stick and A are sent as key presses instead, so that
  // mode needs no touch code of its own.
  var stick = { up: false, down: false, left: false, right: false };
  var KEYNAME = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
  function keysMode() { return document.documentElement.classList.contains('keys-mode'); }
  function sendKey(type, key) {
    document.body.dispatchEvent(new KeyboardEvent(type, { key: key, bubbles: true, cancelable: true }));
  }
  function setStick(next) {
    ['up', 'down', 'left', 'right'].forEach(function (d) {
      if (next[d] === stick[d]) return;
      stick[d] = next[d];
      if (keysMode()) sendKey(next[d] ? 'keydown' : 'keyup', KEYNAME[d]);
      else if (enabled) keys[d] = next[d];
    });
  }

  function bindDpad() {
    var dpad = document.getElementById('dpad');
    if (!dpad) return;
    var pad = dpad.querySelector('.stick'), knob = dpad.querySelector('.stick-knob'), act = dpad.querySelector('.dpad-action');
    var touchId = null;
    function find(list) {
      for (var i = 0; i < list.length; i++) if (list[i].identifier === touchId) return list[i];
      return null;
    }
    function move(t) {
      var r = pad.getBoundingClientRect(), R = r.width / 2;
      var x = t.clientX - (r.left + R), y = t.clientY - (r.top + R), d = Math.hypot(x, y) || 1;
      var k = Math.min(d, R * 0.6);
      knob.style.transform = 'translate(' + (x / d * k).toFixed(1) + 'px,' + (y / d * k).toFixed(1) + 'px)';
      var next = { up: false, down: false, left: false, right: false };
      if (d > R * 0.22) {
        if (Math.abs(x) > Math.abs(y)) next[x > 0 ? 'right' : 'left'] = true;
        else next[y > 0 ? 'down' : 'up'] = true;
      }
      setStick(next);
    }
    function release() {
      touchId = null;
      knob.style.transform = '';
      pad.classList.remove('held');
      setStick({ up: false, down: false, left: false, right: false });
    }
    if (pad) {
      pad.addEventListener('touchstart', function (e) {
        e.preventDefault();
        var t = e.changedTouches[0];
        touchId = t.identifier;
        pad.classList.add('held');
        move(t);
      }, { passive: false });
      pad.addEventListener('touchmove', function (e) {
        e.preventDefault();
        var t = find(e.changedTouches);
        if (t) move(t);
      }, { passive: false });
      pad.addEventListener('touchend', function (e) { if (find(e.changedTouches)) release(); });
      pad.addEventListener('touchcancel', function (e) { if (find(e.changedTouches)) release(); });
    }
    var itemBtn = dpad.querySelector('.dpad-item');        // B: the selected hotbar item (swing, eat, dig)
    if (itemBtn) {
      itemBtn.addEventListener('touchstart', function (e) {
        e.preventDefault();
        itemBtn.classList.add('held');
        if (!keysMode() && enabled && typeof BridgeInventory !== 'undefined') BridgeInventory.useSelected();
      }, { passive: false });
      var upB = function () { itemBtn.classList.remove('held'); };
      itemBtn.addEventListener('touchend', upB);
      itemBtn.addEventListener('touchcancel', upB);
    }
    if (act) {
      act.addEventListener('touchstart', function (e) {
        e.preventDefault();
        act.classList.add('held');
        if (keysMode()) sendKey('keydown', 'e');
        else if (enabled) actionPressed = true;
      }, { passive: false });
      var up = function () { act.classList.remove('held'); if (keysMode()) sendKey('keyup', 'e'); };
      act.addEventListener('touchend', up);
      act.addEventListener('touchcancel', up);
    }
  }

  // The stick belongs to walking around a world (sailing has keys-mode)
  function trackState() {
    if (typeof BridgeState === 'undefined' || !BridgeState.onChange) return;
    var set = function (st) {
      document.documentElement.classList.toggle('in-world', st === 'world');
      document.documentElement.classList.toggle('on-chart', st === 'starmap');
    };
    BridgeState.onChange(set);
    if (BridgeState.getState) set(BridgeState.getState());
  }

  // The visible height left when the on-screen keyboard is up (iOS keeps the
  // layout viewport, so fixed panels are placed against this instead).
  function trackViewport() {
    var vv = window.visualViewport;
    if (!vv) return;
    var set = function () {
      var root = document.documentElement.style;
      root.setProperty('--vvh', vv.height + 'px');
      root.setProperty('--kb', Math.max(0, window.innerHeight - vv.height - vv.offsetTop) + 'px');
    };
    vv.addEventListener('resize', set);
    vv.addEventListener('scroll', set);
    set();
  }

  // Bind d-pad + canvas mouse on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { bindDpad(); bindCanvasMouse(); trackViewport(); trackState(); });
  } else {
    bindDpad();
    bindCanvasMouse();
    trackViewport();
    trackState();
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
