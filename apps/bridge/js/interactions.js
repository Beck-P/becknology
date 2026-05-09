/**
 * BridgeInteractions — Proximity detection, prompts, and actions.
 *
 * Checks if the player is adjacent to an interactive tile and facing it.
 * Shows a prompt. On action key, executes the interaction (navigate to app, show dialog).
 */
var BridgeInteractions = (function () {
  var currentInteraction = null;
  var dialogVisible = false;

  function update(world, character, controls) {
    if (dialogVisible) {
      // Dismiss dialog on action press
      if (controls.consumeAction()) {
        hideDialog();
      }
      return;
    }

    // Find interaction either at the tile the player is facing OR the tile
    // they are standing on. The same-tile check lets walkable interactions
    // (NPCs, dock tiles) trigger when you stop on top of them.
    var px = character.getX();
    var py = character.getY();
    var facing = character.getFacing();

    var checkX = px + (facing === 'right' ? 1 : facing === 'left' ? -1 : 0);
    var checkY = py + (facing === 'down' ? 1 : facing === 'up' ? -1 : 0);

    var found = null;
    var sameTile = null;
    for (var i = 0; i < world.interactions.length; i++) {
      var inter = world.interactions[i];
      if (inter.x === checkX && inter.y === checkY) {
        found = inter;
        break;
      }
      if (inter.x === px && inter.y === py) {
        sameTile = inter;
      }
    }
    // Prefer the tile in front of you, fall back to the one you're on.
    if (!found) found = sameTile;

    // Show/hide prompt
    var promptEl = document.getElementById('interact-prompt');
    if (found && !character.isMoving()) {
      currentInteraction = found;
      if (promptEl) {
        promptEl.textContent = found.prompt || 'PRESS E';
        promptEl.classList.add('visible');
      }
    } else {
      currentInteraction = null;
      if (promptEl) promptEl.classList.remove('visible');
    }

    // Handle action press
    if (currentInteraction && controls.consumeAction()) {
      executeInteraction(currentInteraction);
    }
  }

  function executeInteraction(inter) {
    switch (inter.type) {
      case 'app':
        // Save world position, then navigate to app
        BridgeState.setWorldPos({
          worldId: BridgeWorld.getWorld().tileset,
          x: BridgeCharacter.getX(),
          y: BridgeCharacter.getY(),
          facing: BridgeCharacter.getFacing()
        });
        BridgeState.transition('redirect', { url: inter.target });
        break;

      case 'dialog':
        showDialog(inter.label, inter.dialog);
        break;

      case 'random_dialog':
        var messages = inter.messages || [inter.dialog];
        var msg = messages[Math.floor(Math.random() * messages.length)];
        showDialog(inter.label, msg);
        break;

      case 'leave_world':
        // If a parent world is specified, warp back to it (e.g., arcade
        // interior leaves to the street, not all the way to the cockpit).
        if (inter.leaveTo) {
          BridgeWorld.enterWorld(inter.leaveTo, inter.leaveSpawn);
        } else {
          BridgeWorld.leave();
        }
        break;

      case 'enter_world':
        // Step into another world (a building interior, a cave, etc.)
        // with a quick fade transition.
        BridgeWorld.enterWorld(inter.target, inter.spawn);
        break;

      case 'password_gate':
        showPasswordDialog(inter);
        break;

      case 'sail_to':
        BridgeWorld.sailTo(inter.destination, inter.destinationName || inter.label);
        break;

      case 'menu':
        showMenuDialog(inter);
        break;

      case 'warp_map':
        // Save the player's bridge-room position so closing the warp map
        // returns them right back to the hologram (not the door spawn).
        var w = BridgeWorld.getWorld();
        if (w) {
          BridgeState.setWorldPos({
            worldId: w.tileset,
            x: BridgeCharacter.getX(),
            y: BridgeCharacter.getY(),
            facing: BridgeCharacter.getFacing()
          });
        }
        BridgeState.transition('starmap');
        break;
    }
  }

  function showMenuDialog(inter) {
    dialogVisible = true;
    if (typeof BridgeControls !== 'undefined' && BridgeControls.disable) {
      BridgeControls.disable();
    }
    var promptEl = document.getElementById('interact-prompt');
    if (promptEl) promptEl.classList.remove('visible');

    var overlay = document.getElementById('world-overlay');
    var dialogEl = document.createElement('div');
    dialogEl.id = 'world-dialog';
    dialogEl.style.cssText =
      'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:rgba(10,10,20,0.95);border:1px solid #2a2a3e;border-radius:4px;' +
      'padding:24px 28px;min-width:280px;max-width:340px;z-index:30;' +
      'font-family:"Courier New",Consolas,monospace;text-align:center;';

    var html = '<h3 style="font-size:13px;letter-spacing:3px;color:#40b060;margin-bottom:8px;">' +
               inter.label + '</h3>';
    if (inter.dialog) {
      html += '<pre style="font-size:11px;color:#888;line-height:1.5;white-space:pre-wrap;margin-bottom:14px;">' +
              inter.dialog.replace(/\\n/g, '\n') + '</pre>';
    }
    html += '<div id="menu-options" style="display:flex;flex-direction:column;gap:6px;margin:8px 0;">';
    for (var i = 0; i < inter.options.length; i++) {
      var opt = inter.options[i];
      html += '<button data-opt="' + i + '" class="menu-opt" style="' +
              'padding:8px 12px;background:rgba(40,40,60,0.6);' +
              'border:1px solid #2a2a3e;color:#ddd;font-family:inherit;' +
              'font-size:11px;letter-spacing:2px;cursor:pointer;text-align:left;' +
              'transition:background 0.15s, border-color 0.15s;">' +
              '&#9656; ' + opt.label + '</button>';
    }
    html += '</div>';
    html += '<p style="font-size:10px;color:#555;letter-spacing:2px;margin-top:6px;">CLICK · ESC TO CANCEL</p>';

    dialogEl.innerHTML = html;
    overlay.appendChild(dialogEl);

    // Hover styling
    var btns = dialogEl.querySelectorAll('.menu-opt');
    for (var b = 0; b < btns.length; b++) {
      (function (btn, idx) {
        btn.addEventListener('mouseenter', function () {
          btn.style.background = 'rgba(64,160,104,0.25)';
          btn.style.borderColor = '#40b060';
        });
        btn.addEventListener('mouseleave', function () {
          btn.style.background = 'rgba(40,40,60,0.6)';
          btn.style.borderColor = '#2a2a3e';
        });
        btn.addEventListener('click', function () {
          handleMenuOption(inter.options[idx]);
        });
      })(btns[b], b);
    }

    function handleEsc(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup();
      }
    }
    document.addEventListener('keydown', handleEsc);

    function cleanup() {
      document.removeEventListener('keydown', handleEsc);
      hideDialog();
      if (typeof BridgeControls !== 'undefined' && BridgeControls.enable) {
        BridgeControls.enable();
      }
    }

    function handleMenuOption(opt) {
      cleanup();
      switch (opt.action) {
        case 'sail_to':
          BridgeWorld.sailTo(opt.destination, opt.destinationName || opt.label);
          break;
        case 'enter_world':
          BridgeWorld.enterWorld(opt.target, opt.spawn);
          break;
        case 'password_gate':
          showPasswordDialog(opt);
          break;
        case 'leave_world':
          if (opt.leaveTo) {
            BridgeWorld.enterWorld(opt.leaveTo, opt.leaveSpawn);
          } else {
            BridgeWorld.leave();
          }
          break;
        case 'close':
        default:
          break;
      }
    }
  }

  function showDialog(title, text) {
    dialogVisible = true;
    var promptEl = document.getElementById('interact-prompt');
    if (promptEl) promptEl.classList.remove('visible');

    // Create dialog overlay
    var overlay = document.getElementById('world-overlay');
    var dialogEl = document.createElement('div');
    dialogEl.id = 'world-dialog';
    dialogEl.style.cssText =
      'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:rgba(10,10,20,0.95);border:1px solid #2a2a3e;border-radius:4px;' +
      'padding:24px 32px;max-width:320px;width:90%;z-index:30;' +
      'font-family:"Courier New",Consolas,monospace;text-align:center;';

    dialogEl.innerHTML =
      '<h3 style="font-size:13px;letter-spacing:3px;color:#40b060;margin-bottom:12px;">' + title + '</h3>' +
      '<pre style="font-size:11px;color:#888;line-height:1.6;white-space:pre-wrap;margin-bottom:16px;">' +
        text.replace(/\\n/g, '\n') +
      '</pre>' +
      '<p style="font-size:10px;color:#555;letter-spacing:2px;animation:blink 1.2s ease-in-out infinite;">PRESS E TO CLOSE</p>';

    overlay.appendChild(dialogEl);
  }

  function hideDialog() {
    dialogVisible = false;
    var dialogEl = document.getElementById('world-dialog');
    if (dialogEl) dialogEl.remove();
  }

  function showPasswordDialog(inter) {
    dialogVisible = true;
    // Disable game controls so the Enter key only reaches the password input,
    // not BridgeInteractions.update() (which would auto-close the dialog).
    if (typeof BridgeControls !== 'undefined' && BridgeControls.disable) {
      BridgeControls.disable();
    }
    var promptEl = document.getElementById('interact-prompt');
    if (promptEl) promptEl.classList.remove('visible');

    var overlay = document.getElementById('world-overlay');
    var dialogEl = document.createElement('div');
    dialogEl.id = 'world-dialog';
    dialogEl.style.cssText =
      'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:rgba(10,10,20,0.95);border:1px solid #2a2a3e;border-radius:4px;' +
      'padding:24px 32px;max-width:320px;width:90%;z-index:30;' +
      'font-family:"Courier New",Consolas,monospace;text-align:center;';

    dialogEl.innerHTML =
      '<h3 style="font-size:13px;letter-spacing:3px;color:#40b060;margin-bottom:12px;">' + inter.label + '</h3>' +
      '<pre style="font-size:11px;color:#888;line-height:1.6;white-space:pre-wrap;margin-bottom:16px;">' +
        (inter.dialog || '').replace(/\\n/g, '\n') +
      '</pre>' +
      '<input id="pw-input" type="text" autocomplete="off" style="' +
        'width:80%;padding:8px 12px;background:#111;border:1px solid #2a2a3e;' +
        'color:#ddd;font-family:inherit;font-size:14px;letter-spacing:4px;' +
        'text-align:center;text-transform:uppercase;outline:none;margin-bottom:12px;' +
      '" placeholder="..." />' +
      '<div id="pw-error" style="font-size:10px;color:#c44;min-height:16px;margin-bottom:8px;"></div>' +
      '<p style="font-size:10px;color:#555;letter-spacing:2px;">PRESS ENTER TO SUBMIT &middot; ESC TO CANCEL</p>';

    overlay.appendChild(dialogEl);

    var input = document.getElementById('pw-input');
    setTimeout(function () { input.focus(); }, 50);

    function handleKey(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var val = input.value.trim();
        if (val === inter.password) {
          // Correct — navigate to target
          cleanup();
          BridgeState.setWorldPos({
            worldId: BridgeWorld.getWorld().tileset,
            x: BridgeCharacter.getX(),
            y: BridgeCharacter.getY(),
            facing: BridgeCharacter.getFacing()
          });
          BridgeState.transition('redirect', { url: inter.target });
        } else {
          // Wrong password
          var err = document.getElementById('pw-error');
          if (err) err.textContent = inter.failMessage || 'ACCESS DENIED.';
          input.value = '';
          input.focus();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cleanup();
      }
    }

    function cleanup() {
      document.removeEventListener('keydown', handleKey);
      hideDialog();
      // Re-enable controls when leaving the password input.
      if (typeof BridgeControls !== 'undefined' && BridgeControls.enable) {
        BridgeControls.enable();
      }
    }

    document.addEventListener('keydown', handleKey);
  }

  return { update: update };
})();
