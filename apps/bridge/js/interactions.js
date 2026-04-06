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

    // Find interaction at the tile the player is facing
    var px = character.getX();
    var py = character.getY();
    var facing = character.getFacing();

    var checkX = px + (facing === 'right' ? 1 : facing === 'left' ? -1 : 0);
    var checkY = py + (facing === 'down' ? 1 : facing === 'up' ? -1 : 0);

    var found = null;
    for (var i = 0; i < world.interactions.length; i++) {
      var inter = world.interactions[i];
      if (inter.x === checkX && inter.y === checkY) {
        found = inter;
        break;
      }
    }

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
        BridgeWorld.leave();
        break;
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

  return { update: update };
})();
