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
      // Hostiles don't get a press-E prompt — they're a threat, not an
      // invitation. F / right-click / click-at-distance still attack.
      if (promptEl) {
        if (found.type === 'hostile') {
          promptEl.classList.remove('visible');
        } else {
          promptEl.textContent = found.prompt || 'PRESS E';
          promptEl.classList.add('visible');
        }
      }
    } else {
      currentInteraction = null;
      if (promptEl) promptEl.classList.remove('visible');
    }

    // Handle action press
    if (currentInteraction && controls.consumeAction()) {
      executeInteraction(currentInteraction);
    }

    // Hostiles run an attack state machine each frame: idle → winding
    // (telegraph) → striking (visual streak fires at the locked target
    // tile) → recovering. Damage only lands if the player is still on
    // the target tile at impact, so a wind-up gives the player time to
    // step away. Movement (pathfinding) only happens in the idle phase.
    updateHostiles(world, character);
  }

  // Walk each hostile one tile toward the player (greedy on the larger
  // axis, fall back to the other axis if blocked). Updates the world's
  // tile + collision grids so the engine renders/blocks at the new spot.
  // Pauses while a dialog / inventory menu is open or the player is
  // dead, so the player isn't ground down while reading text.
  function updateHostiles(world, character) {
    if (!world || !world.interactions || !character) return;
    var menuOpen = (typeof BridgeInventory !== 'undefined') &&
                   BridgeInventory.isMenuOpen && BridgeInventory.isMenuOpen();
    if (dialogVisible || menuOpen) return;
    if (typeof BridgeInventory !== 'undefined' && BridgeInventory.getStats) {
      var stats = BridgeInventory.getStats();
      if (stats && stats.hp <= 0) return;
    }

    var px = character.getX(), py = character.getY();
    var now = performance.now();
    // Build occupancy map so two hostiles can't step onto the same cell.
    var occupied = {};
    occupied[px + ',' + py] = true;
    for (var i = 0; i < world.interactions.length; i++) {
      var h = world.interactions[i];
      if (h.type === 'hostile') occupied[h.x + ',' + h.y] = true;
    }

    for (var j = 0; j < world.interactions.length; j++) {
      var hh = world.interactions[j];
      if (hh.type !== 'hostile') continue;
      var dx = px - hh.x, dy = py - hh.y;
      var manhattan = Math.abs(dx) + Math.abs(dy);

      // Run the attack state machine first. While the statue is in
      // anything but 'idle' it stays planted (no pathing), and damage
      // only lands on impact if the player is still on the target tile.
      updateHostileAttack(hh, character, now, manhattan);

      if (hh._attackPhase && hh._attackPhase !== 'idle') continue;
      if (manhattan <= 1) continue;                // adjacent — let the next attack cycle fire
      if (manhattan > (hh.aggroRange || 6)) continue; // out of aggro range — idle
      var cd = hh.moveCooldown || 1500;            // slower stalk so the player has thinking time
      if (hh._lastMove && (now - hh._lastMove) < cd) continue;

      // Try larger axis first.
      var stepX, stepY;
      if (Math.abs(dx) >= Math.abs(dy)) { stepX = sign(dx); stepY = 0; }
      else                              { stepX = 0;       stepY = sign(dy); }
      if (!tryStep(world, hh, stepX, stepY, occupied)) {
        // Fall back to the perpendicular axis.
        if (stepX !== 0) { stepX = 0; stepY = sign(dy); }
        else             { stepX = sign(dx); stepY = 0; }
        if (stepX === 0 && stepY === 0) continue;
        tryStep(world, hh, stepX, stepY, occupied);
      }
      hh._lastMove = now; // cooldown regardless of success — keeps the cadence steady
    }
  }

  // Per-hostile attack state machine. Phases:
  //   idle:       not attacking. Becomes 'winding' when player is in range
  //               (Manhattan distance <= 1).
  //   winding:    telegraph — eyes glow, no movement. Lasts windupMs (500).
  //               Strike target locks in at winding-start.
  //   striking:   the visible strike streak fires from the statue to the
  //               locked tile. Lasts strikeMs (200). Damage resolves at end.
  //   recovering: post-strike cooldown. No attack/move. Lasts recoverMs (700).
  function updateHostileAttack(hostile, character, now, manhattan) {
    var phase = hostile._attackPhase || 'idle';
    var elapsed = now - (hostile._attackStart || 0);
    var WIND     = hostile.windupMs  || 500;
    var STRIKE   = hostile.strikeMs  || 200;
    var RECOVER  = hostile.recoverMs || 700;

    if (phase === 'idle') {
      if (manhattan === 1) {
        hostile._attackPhase = 'winding';
        hostile._attackStart = now;
        hostile._attackTarget = { x: character.getX(), y: character.getY() };
      }
      return;
    }
    if (phase === 'winding') {
      if (elapsed < WIND) return;
      hostile._attackPhase = 'striking';
      hostile._attackStart = now;
      if (typeof BridgeFX !== 'undefined' && BridgeFX.spawnStrike) {
        BridgeFX.spawnStrike(hostile.x, hostile.y, hostile._attackTarget.x, hostile._attackTarget.y);
      }
      return;
    }
    if (phase === 'striking') {
      if (elapsed < STRIKE) return;
      // Resolve hit: damage only if the player stayed on the target tile.
      var t = hostile._attackTarget;
      var px = character.getX(), py = character.getY();
      if (t && px === t.x && py === t.y) {
        if (typeof BridgeInventory !== 'undefined' && BridgeInventory.takeDamage) {
          BridgeInventory.takeDamage(hostile.damage || 5);
        }
        if (typeof BridgeFX !== 'undefined' && BridgeFX.spawnDamageFlash) {
          BridgeFX.spawnDamageFlash(px, py);
        }
      }
      hostile._attackPhase = 'recovering';
      hostile._attackStart = now;
      return;
    }
    if (phase === 'recovering') {
      if (elapsed < RECOVER) return;
      hostile._attackPhase = 'idle';
      hostile._attackTarget = null;
    }
  }

  function sign(n) { return n > 0 ? 1 : n < 0 ? -1 : 0; }

  function tryStep(world, hostile, stepX, stepY, occupied) {
    var nx = hostile.x + stepX, ny = hostile.y + stepY;
    if (!world.collisions[ny] || world.collisions[ny][nx] !== 0) return false;
    var key = nx + ',' + ny;
    if (occupied[key]) return false;
    // Hostiles are entity-overlays — we only flip collision so the player
    // can't walk through them. world.tiles is left alone so movement
    // doesn't leave a trail of restored cells behind.
    world.collisions[hostile.y][hostile.x] = 0;
    delete occupied[hostile.x + ',' + hostile.y];
    hostile.x = nx; hostile.y = ny;
    world.collisions[ny][nx] = 1;
    occupied[key] = true;
    return true;
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

      case 'catalog':
      case 'shop':
        if (typeof BridgeCatalog !== 'undefined') BridgeCatalog.show(inter.shop);
        break;

      case 'cabinet':
        if (typeof BridgeCabinetModal !== 'undefined') {
          BridgeCabinetModal.show({ url: inter.target, title: inter.label, gameKey: inter.gameKey });
        }
        break;

      case 'locker':
        if (typeof BridgeLocker !== 'undefined') BridgeLocker.show();
        break;

      case 'stats_panel':
        if (typeof BridgeStatsPanel !== 'undefined') BridgeStatsPanel.show();
        break;

      case 'vendor':
        // Adventure-shop dialog — buys BridgeItems (food, potions, tools)
        // with server-side coins via BridgeProgression. Distinct from the
        // decor 'shop' / 'catalog' path which uses BridgeCatalog.
        showVendorDialog(inter);
        break;

      case 'rest':
        // Inn-style rest: spend coins via BridgeProgression, restore HP + energy.
        showRestDialog(inter);
        break;

      case 'hostile':
        // Stub: you can't strike back yet. The statue keeps draining
        // until you walk away. Real combat lands in a follow-up.
        showDialog(inter.label || 'HOSTILE',
          'STONE THAT REMEMBERS\\nHOW TO HURT.\\n\\nFISTS WON\\u2019T DENT IT.\\n\\nBACK AWAY.');
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

  // Vendor / shop dialog — buy BridgeItems with server-side coins via BridgeProgression.
  // inter.items: [{ id, price }, ...]
  // inter.label: shop name displayed at the top
  function showVendorDialog(inter) {
    if (typeof BridgeInventory === 'undefined' || typeof BridgeItems === 'undefined') {
      showDialog(inter.label || 'SHOP', 'NO INVENTORY SYSTEM\\nAVAILABLE.');
      return;
    }
    if (typeof BridgeProgression === 'undefined') {
      showDialog(inter.label || 'SHOP', 'CURRENCY SYSTEM\\nUNAVAILABLE.');
      return;
    }
    dialogVisible = true;
    if (typeof BridgeControls !== 'undefined' && BridgeControls.disable) BridgeControls.disable();
    var promptEl = document.getElementById('interact-prompt');
    if (promptEl) promptEl.classList.remove('visible');

    var overlay = document.getElementById('world-overlay');
    var dialogEl = document.createElement('div');
    dialogEl.id = 'world-dialog';
    dialogEl.style.cssText =
      'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:rgba(10,10,20,0.96);border:1px solid #3a3a4e;border-radius:4px;' +
      'padding:20px 24px;width:380px;max-width:90vw;z-index:30;' +
      'font-family:"Courier New",Consolas,monospace;color:#e0d8c0;';

    var html = '<h3 style="font-size:13px;letter-spacing:3px;color:#e0c060;margin:0 0 6px;text-align:center;">' +
               (inter.label || 'SHOP') + '</h3>' +
               '<div id="vendor-balance" style="font-size:11px;letter-spacing:2px;color:#a08040;text-align:center;margin-bottom:14px;">COINS: ...</div>' +
               '<div id="vendor-items" style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;"></div>' +
               '<p style="font-size:10px;color:#555;letter-spacing:2px;text-align:center;cursor:pointer;" id="vendor-close">[ ESC OR E TO CLOSE ]</p>';
    dialogEl.innerHTML = html;
    overlay.appendChild(dialogEl);

    var balanceLabel = document.getElementById('vendor-balance');
    var listEl = document.getElementById('vendor-items');
    var currentBalance = 0;
    var unsubCoin = null;

    function updateBalance(n) {
      currentBalance = (typeof n === 'number') ? n : currentBalance;
      balanceLabel.textContent = 'COINS: ' + currentBalance;
    }
    function renderItems() {
      listEl.innerHTML = '';
      (inter.items || []).forEach(function (entry) {
        var item = BridgeItems.get(entry.id);
        if (!item) return;
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:6px 8px;' +
          'background:rgba(0,0,0,0.4);border:1px solid #2a2a3e;';
        var cnv = document.createElement('canvas');
        cnv.width = cnv.height = 28;
        cnv.style.cssText = 'image-rendering:pixelated;width:28px;height:28px;flex:0 0 28px;';
        item.draw(cnv.getContext('2d'), 0, 0, 28);
        row.appendChild(cnv);
        var info = document.createElement('div');
        info.style.cssText = 'flex:1;min-width:0;';
        info.innerHTML = '<div style="font-size:11px;color:#e0d8c0;letter-spacing:1px;">' + item.name.toUpperCase() + '</div>' +
                         '<div style="font-size:9px;color:#888;line-height:1.4;">' + item.desc + '</div>';
        row.appendChild(info);
        var canAfford = currentBalance >= entry.price;
        var buyBtn = document.createElement('button');
        buyBtn.style.cssText = 'flex:0 0 auto;padding:6px 10px;font-family:inherit;font-size:11px;letter-spacing:1px;' +
          'background:' + (canAfford ? '#3a2a10' : '#1a1a26') + ';color:' + (canAfford ? '#ffe080' : '#555') + ';' +
          'border:1px solid ' + (canAfford ? '#a08040' : '#2a2a3e') + ';cursor:' + (canAfford ? 'pointer' : 'not-allowed') + ';';
        buyBtn.textContent = entry.price + '  BUY';
        buyBtn.disabled = !canAfford;
        buyBtn.addEventListener('click', function () {
          if (buyBtn.disabled) return;
          buyBtn.disabled = true;
          buyBtn.textContent = '...';
          BridgeProgression.wagerCoins(entry.price, 'vendor:' + entry.id).then(function (res) {
            if (res && res.ok) {
              BridgeInventory.addItem(entry.id, 1);
              updateBalance(res.balance);
            }
            renderItems();
          });
        });
        row.appendChild(buyBtn);
        listEl.appendChild(row);
      });
    }

    // Initial balance fetch + subscribe for live updates (e.g. CoinHUD ticker)
    BridgeProgression.getBalance().then(function (b) {
      updateBalance(b == null ? 0 : b);
      renderItems();
    });
    unsubCoin = BridgeProgression.onCoinChange(function (e) {
      updateBalance(e.balance);
      renderItems();
    });

    document.getElementById('vendor-close').addEventListener('click', closeVendor);
    function closeVendor() {
      var el = document.getElementById('world-dialog');
      if (el) el.remove();
      dialogVisible = false;
      if (typeof unsubCoin === 'function') unsubCoin();
      if (typeof BridgeControls !== 'undefined' && BridgeControls.enable) BridgeControls.enable();
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'e' || e.key === 'E') {
        e.preventDefault(); closeVendor();
      }
    }
    document.addEventListener('keydown', onKey);
  }

  // Rest at the inn: confirm, deduct coins, restore HP + energy to max.
  function showRestDialog(inter) {
    if (typeof BridgeInventory === 'undefined' || typeof BridgeProgression === 'undefined') return;
    dialogVisible = true;
    if (typeof BridgeControls !== 'undefined' && BridgeControls.disable) BridgeControls.disable();
    var promptEl = document.getElementById('interact-prompt');
    if (promptEl) promptEl.classList.remove('visible');

    var cost = inter.cost || 5;

    var overlay = document.getElementById('world-overlay');
    var dialogEl = document.createElement('div');
    dialogEl.id = 'world-dialog';
    dialogEl.style.cssText =
      'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:rgba(10,10,20,0.96);border:1px solid #3a3a4e;border-radius:4px;' +
      'padding:20px 28px;max-width:340px;z-index:30;' +
      'font-family:"Courier New",Consolas,monospace;color:#e0d8c0;text-align:center;';

    dialogEl.innerHTML =
      '<h3 style="font-size:13px;letter-spacing:3px;color:#e0c060;margin:0 0 12px;">' + (inter.label || 'REST') + '</h3>' +
      '<p style="font-size:11px;color:#a8a08c;line-height:1.5;margin-bottom:8px;">' +
        'A WARM ROOM, A FRESH PILLOW.<br>RESTORES HP AND ENERGY.</p>' +
      '<p id="rest-cost" style="font-size:11px;color:#a08040;margin-bottom:14px;">COST: ' + cost + ' COINS &middot; YOU HAVE: ...</p>' +
      '<button id="rest-yes" disabled style="padding:8px 14px;font-family:inherit;font-size:11px;letter-spacing:1px;' +
        'background:#1a1a26;color:#555;border:1px solid #2a2a3e;margin-right:8px;cursor:not-allowed;">CHECKING...</button>' +
      '<button id="rest-no" style="padding:8px 14px;font-family:inherit;font-size:11px;letter-spacing:1px;' +
        'background:#1a1a26;color:#888;border:1px solid #2a2a3e;cursor:pointer;">CANCEL</button>';

    overlay.appendChild(dialogEl);

    var costEl = document.getElementById('rest-cost');
    var yesBtn = document.getElementById('rest-yes');

    function setAffordState(balance) {
      var canRest = balance >= cost;
      costEl.textContent = 'COST: ' + cost + ' COINS · YOU HAVE: ' + balance;
      yesBtn.disabled = !canRest;
      yesBtn.textContent = canRest ? 'REST' : 'NOT ENOUGH COINS';
      yesBtn.style.background = canRest ? '#3a2a10' : '#1a1a26';
      yesBtn.style.color = canRest ? '#ffe080' : '#555';
      yesBtn.style.borderColor = canRest ? '#a08040' : '#2a2a3e';
      yesBtn.style.cursor = canRest ? 'pointer' : 'not-allowed';
    }

    BridgeProgression.getBalance().then(function (b) {
      setAffordState(b == null ? 0 : b);
    });

    function close() {
      var el = document.getElementById('world-dialog');
      if (el) el.remove();
      dialogVisible = false;
      if (typeof BridgeControls !== 'undefined' && BridgeControls.enable) BridgeControls.enable();
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape' || e.key === 'e' || e.key === 'E') { e.preventDefault(); close(); } }
    document.addEventListener('keydown', onKey);
    document.getElementById('rest-no').addEventListener('click', close);
    yesBtn.addEventListener('click', function () {
      if (yesBtn.disabled) return;
      yesBtn.disabled = true;
      yesBtn.textContent = '...';
      BridgeProgression.wagerCoins(cost, 'rest:inn').then(function (res) {
        if (res && res.ok) {
          BridgeInventory.restoreAll();
          close();
        } else {
          // Refresh state in case server says insufficient
          BridgeProgression.getBalance().then(function (b) {
            setAffordState(b == null ? 0 : b);
          });
        }
      });
    });
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

  // Click-to-interact for mouse / trackpad. Given a clicked world tile,
  // find an interaction at that tile and run it if the player is close
  // enough. Returns true if the click was handled.
  function tryClickAt(tx, ty) {
    if (typeof BridgeWorld === 'undefined') return false;
    var world = BridgeWorld.getWorld();
    if (!world || !world.interactions) return false;
    if (dialogVisible) return false;
    var inter = null;
    for (var i = 0; i < world.interactions.length; i++) {
      if (world.interactions[i].x === tx && world.interactions[i].y === ty) {
        inter = world.interactions[i]; break;
      }
    }
    if (!inter) return false;
    var px = BridgeCharacter.getX(), py = BridgeCharacter.getY();
    var dist = Math.max(Math.abs(tx - px), Math.abs(ty - py));
    if (dist > 4) return false; // too far — same as if you weren't there
    // Hostile tiles: clicking is an attack, not the stub dialog. Route
    // through useSelected so the equipped weapon (if any) handles it.
    if (inter.type === 'hostile') {
      faceTowards(px, py, tx, ty);
      if (typeof BridgeInventory !== 'undefined' && BridgeInventory.useSelected) {
        BridgeInventory.useSelected();
      }
      return true;
    }
    // For everything else, turn to face the target then run the interaction.
    faceTowards(px, py, tx, ty);
    executeInteraction(inter);
    return true;
  }

  function faceTowards(px, py, tx, ty) {
    if (typeof BridgeCharacter === 'undefined' || !BridgeCharacter.setFacing) return;
    var dx = tx - px, dy = ty - py;
    if (Math.abs(dx) >= Math.abs(dy)) {
      BridgeCharacter.setFacing(dx > 0 ? 'right' : 'left');
    } else {
      BridgeCharacter.setFacing(dy > 0 ? 'down' : 'up');
    }
  }

  // Kill a hostile interaction: replace its tile with rubble, drop it
  // from the world's interaction list, and reward the player.
  function killHostile(world, target) {
    if (!world || !target) return;
    if (world.tiles[target.y] && typeof target.x === 'number') {
      world.tiles[target.y][target.x] = target.deadTile || 61;
    }
    if (world.collisions[target.y] && typeof target.x === 'number') {
      world.collisions[target.y][target.x] = 0;
    }
    var idx = world.interactions.indexOf(target);
    if (idx >= 0) world.interactions.splice(idx, 1);
    if (typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins) {
      BridgeProgression.awardCoins(target.reward || 10, 'kill:' + (target.label || 'hostile'));
    }
  }

  return { update: update, tryClickAt: tryClickAt, killHostile: killHostile };
})();
