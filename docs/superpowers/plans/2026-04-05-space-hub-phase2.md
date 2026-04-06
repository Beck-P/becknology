# Space Hub Phase 2 — Arcadia World & Tile Engine

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the tile engine and prove it out with Arcadia — a neon arcade building where the player walks around and interacts with arcade machines to launch apps.

**Architecture:** New JS modules for world rendering, character movement, controls, and interactions — all following the existing IIFE pattern. World data defined in JSON (tile grid, collisions, spawn, interactions). Placeholder colored rectangles for tiles/character, swappable for PNG sprite sheets later. Grid-based movement with smooth interpolation. Camera follows player with smooth lerp, clamped to map edges.

**Tech Stack:** Vanilla JS canvas, JSON world data, same zero-build static pattern as Phase 1

---

## File Structure

```
apps/bridge/
├── js/
│   ├── ... (existing Phase 1 modules)
│   ├── world.js            — BridgeWorld: tile renderer + camera
│   ├── character.js        — BridgeCharacter: player sprite, grid movement, animation
│   ├── controls.js         — BridgeControls: keyboard + d-pad input routing
│   ├── interactions.js     — BridgeInteractions: proximity detection, prompts, actions
│   └── landing.js          — BridgeLanding: arrival animation entering a world
├── assets/
│   ├── ... (existing)
│   └── worlds/
│       └── arcadia.json    — Arcadia map: tile grid, collisions, spawns, interactions
```

**Modifications to existing files:**
- `apps/bridge/index.html` — add world overlay div, new script tags, enable d-pad buttons
- `apps/bridge/js/state.js` — add `world` and `landing` states, persist world position
- `apps/bridge/js/main.js` — render world state in loop, handle world state transitions
- `apps/bridge/js/hyperspace.js` — route to landing/world instead of redirect for overworld-enabled worlds
- `apps/bridge/js/starmap.js` — mark which worlds have overworlds
- `apps/bridge/css/bridge.css` — world overlay styles, interaction prompts, landing screen

---

## Task 1: State Machine + HTML Scaffold

**Files:**
- Modify: `apps/bridge/js/state.js`
- Modify: `apps/bridge/index.html`
- Modify: `apps/bridge/css/bridge.css`

- [ ] **Step 1: Add world/landing states and world position persistence to state.js**

Add world position tracking and update the persistence to include it. In `apps/bridge/js/state.js`, add these variables after `var pilot = null;`:

```js
var worldPos = null;  // { worldId, x, y, facing }
```

Add these functions before the `return` block:

```js
function setWorldPos(data) {
  worldPos = data;
  if (data) {
    localStorage.setItem('bridge_world_pos', JSON.stringify(data));
  }
}

function getWorldPos() { return worldPos; }

function clearWorldPos() {
  worldPos = null;
  localStorage.removeItem('bridge_world_pos');
}

function loadWorldPos() {
  try {
    var raw = localStorage.getItem('bridge_world_pos');
    if (!raw) return null;
    worldPos = JSON.parse(raw);
    return worldPos;
  } catch (e) { return null; }
}
```

Add them to the return object:

```js
setWorldPos: setWorldPos,
getWorldPos: getWorldPos,
clearWorldPos: clearWorldPos,
loadWorldPos: loadWorldPos
```

Also update the `transition` function to persist `landing` and `world` states (they're not transient):

```js
if (newState !== 'travel' && newState !== 'redirect') {
```

This line already includes `landing` and `world` since they're not in the exclusion list — no change needed.

- [ ] **Step 2: Add world overlay and update script tags in index.html**

In `apps/bridge/index.html`, add a world overlay div after the selection-overlay:

```html
<div id="world-overlay" class="overlay" style="display:none;"></div>
<div id="landing-overlay" class="overlay" style="display:none;"></div>
```

Add new script tags before `main.js` (order matters — dependencies first):

```html
<script src="/bridge/js/controls.js"></script>
<script src="/bridge/js/character.js"></script>
<script src="/bridge/js/world.js"></script>
<script src="/bridge/js/interactions.js"></script>
<script src="/bridge/js/landing.js"></script>
```

Update the d-pad buttons to remove `disabled`:

```html
<div id="dpad" class="dpad" style="display:none;">
  <button class="dpad-btn dpad-up">&#9650;</button>
  <button class="dpad-btn dpad-left">&#9664;</button>
  <button class="dpad-btn dpad-right">&#9654;</button>
  <button class="dpad-btn dpad-down">&#9660;</button>
  <button class="dpad-btn dpad-action">A</button>
</div>
```

- [ ] **Step 3: Add world-related CSS to bridge.css**

Append to `apps/bridge/css/bridge.css`:

```css
/* ---- World Overlay ---- */
.world-hud {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
  z-index: 15;
}

.world-back {
  position: fixed;
  top: 12px;
  left: 16px;
  font-size: 11px;
  color: #444;
  cursor: pointer;
  z-index: 20;
  text-decoration: none;
  pointer-events: auto;
  transition: color 0.2s;
}
.world-back:hover { color: rgba(160, 120, 220, 0.5); }

/* ---- Interaction Prompt ---- */
.interact-prompt {
  position: fixed;
  bottom: 20%;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Courier New', Consolas, monospace;
  font-size: clamp(11px, 1.4vw, 15px);
  font-weight: bold;
  letter-spacing: 3px;
  color: rgba(40, 220, 80, 0.9);
  text-shadow: 0 0 8px rgba(40, 220, 80, 0.4);
  animation: blink 1.2s ease-in-out infinite;
  pointer-events: none;
  z-index: 20;
  display: none;
}

.interact-prompt.visible { display: block; }

@media (max-width: 768px) {
  .interact-prompt { bottom: 28%; font-size: 12px; }
}

/* ---- Landing Screen ---- */
.landing-text {
  font-family: 'Courier New', Consolas, monospace;
  font-size: clamp(14px, 2.5vw, 24px);
  letter-spacing: 6px;
  color: #ccc;
  text-shadow: 0 0 20px rgba(160, 120, 220, 0.2);
  text-align: center;
}

.landing-subtitle {
  font-size: clamp(10px, 1.2vw, 14px);
  letter-spacing: 4px;
  color: #555;
  margin-top: 16px;
  text-align: center;
}

/* ---- D-Pad active (in world mode) ---- */
.dpad-btn:active {
  background: rgba(60, 60, 80, 0.8);
  color: #888;
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/bridge/js/state.js apps/bridge/index.html apps/bridge/css/bridge.css
git commit -m "feat(bridge): scaffold Phase 2 — world/landing states, overlays, CSS"
```

---

## Task 2: Arcadia World Data

**Files:**
- Create: `apps/bridge/assets/worlds/arcadia.json`

The Arcadia map is 30 wide × 24 tall (tiles). Layout: outdoor street at top, arcade building entrance, arcade interior with rows of cabinets.

- [ ] **Step 1: Create arcadia.json**

Create `apps/bridge/assets/worlds/arcadia.json`:

```json
{
  "name": "Arcadia",
  "width": 30,
  "height": 24,
  "tileSize": 16,
  "tileset": "arcadia",
  "spawns": { "player": [15, 7] },
  "tileColors": {
    "0": null,
    "1": "#2a2a3e",
    "2": "#3d3552",
    "3": "#4a4268",
    "4": "#252040",
    "5": "#d06090",
    "6": "#40b060",
    "7": "#3d3552",
    "8": "#a040c0",
    "9": "#383050"
  },
  "tileNames": {
    "0": "void",
    "1": "wall",
    "2": "floor",
    "3": "floor_light",
    "4": "wall_dark",
    "5": "runouts_cabinet",
    "6": "highscore_board",
    "7": "entrance",
    "8": "neon_sign",
    "9": "cabinet"
  },
  "tiles": [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,0,0,0],
    [0,0,0,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,0,0,0],
    [0,0,0,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,0,0,0],
    [0,0,0,1,1,8,1,1,1,1,1,1,1,1,7,7,7,1,1,1,1,1,1,1,8,1,1,0,0,0],
    [0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0],
    [0,0,0,1,2,9,2,9,2,2,9,2,9,2,2,2,9,2,9,2,2,9,2,9,2,2,1,0,0,0],
    [0,0,0,1,2,9,2,9,2,2,9,2,9,2,2,2,9,2,9,2,2,9,2,9,2,2,1,0,0,0],
    [0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0],
    [0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0],
    [0,0,0,1,2,9,2,9,2,2,9,2,5,2,2,2,5,2,9,2,2,9,2,9,2,2,1,0,0,0],
    [0,0,0,1,2,9,2,9,2,2,9,2,5,2,2,2,5,2,9,2,2,9,2,9,2,2,1,0,0,0],
    [0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0],
    [0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0],
    [0,0,0,1,2,9,2,9,2,2,2,2,2,2,2,2,2,2,2,2,2,9,2,9,2,2,1,0,0,0],
    [0,0,0,1,2,9,2,9,2,2,2,2,2,2,2,2,2,2,2,2,2,9,2,9,2,2,1,0,0,0],
    [0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0],
    [0,0,0,1,2,2,2,2,2,6,2,2,2,2,2,2,2,2,2,6,2,2,2,2,2,2,1,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  ],
  "collisions": [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1],
    [1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1],
    [1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1],
    [1,1,1,1,0,1,0,1,0,0,1,0,1,0,0,0,1,0,1,0,0,1,0,1,0,0,1,1,1,1],
    [1,1,1,1,0,1,0,1,0,0,1,0,1,0,0,0,1,0,1,0,0,1,0,1,0,0,1,1,1,1],
    [1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1],
    [1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1],
    [1,1,1,1,0,1,0,1,0,0,1,0,1,0,0,0,1,0,1,0,0,1,0,1,0,0,1,1,1,1],
    [1,1,1,1,0,1,0,1,0,0,1,0,1,0,0,0,1,0,1,0,0,1,0,1,0,0,1,1,1,1],
    [1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1],
    [1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1],
    [1,1,1,1,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,1,1,1,1],
    [1,1,1,1,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,1,1,1,1],
    [1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1],
    [1,1,1,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
  ],
  "interactions": [
    { "x": 12, "y": 13, "type": "app", "target": "/runouts", "label": "RUNOUTS", "prompt": "PRESS E TO PLAY" },
    { "x": 16, "y": 13, "type": "app", "target": "/runouts", "label": "RUNOUTS", "prompt": "PRESS E TO PLAY" },
    { "x": 12, "y": 14, "type": "app", "target": "/runouts", "label": "RUNOUTS", "prompt": "PRESS E TO PLAY" },
    { "x": 16, "y": 14, "type": "app", "target": "/runouts", "label": "RUNOUTS", "prompt": "PRESS E TO PLAY" },
    { "x": 9, "y": 20, "type": "dialog", "label": "HIGH SCORES", "prompt": "PRESS E TO VIEW", "dialog": "TOP SCORES:\\n1. ACE — 9999\\n2. BEK — 8420\\n3. NOV — 7300\\n4. ZRO — 5100\\n5. ???  — ????" },
    { "x": 19, "y": 20, "type": "dialog", "label": "HIGH SCORES", "prompt": "PRESS E TO VIEW", "dialog": "TOP SCORES:\\n1. ACE — 9999\\n2. BEK — 8420\\n3. NOV — 7300\\n4. ZRO — 5100\\n5. ???  — ????" }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/bridge/assets/worlds/arcadia.json
git commit -m "feat(bridge): Arcadia world data — arcade building map with cabinets and high scores"
```

---

## Task 3: Controls Module

**Files:**
- Create: `apps/bridge/js/controls.js`

Captures keyboard and d-pad input. Exposes the currently pressed direction and action button state. Other modules poll this — no callbacks.

- [ ] **Step 1: Create controls.js**

Create `apps/bridge/js/controls.js`:

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/bridge/js/controls.js
git commit -m "feat(bridge): controls module — keyboard + d-pad input"
```

---

## Task 4: Character Module

**Files:**
- Create: `apps/bridge/js/character.js`

Grid-based movement with smooth interpolation between tiles. Placeholder sprite (colored square with direction indicator).

- [ ] **Step 1: Create character.js**

Create `apps/bridge/js/character.js`:

```js
/**
 * BridgeCharacter — Player character with grid-based movement.
 *
 * Moves tile-to-tile with smooth interpolation. Placeholder sprite
 * (colored square with direction dot) — swap for PNG sprite sheet later.
 *
 * Usage:
 *   BridgeCharacter.init(spawnX, spawnY)
 *   BridgeCharacter.update(collisionGrid)   — call each frame
 *   BridgeCharacter.draw(ctx, camX, camY, tileSize, scale)
 */
var BridgeCharacter = (function () {
  var player = {
    x: 0, y: 0,           // current tile position
    targetX: 0, targetY: 0, // destination tile
    moveProgress: 1,       // 0→1 interpolation (1 = arrived)
    facing: 'down',        // up/down/left/right
    walking: false,
    animFrame: 0,
    animTimer: 0,
    moveSpeed: 0.12,       // progress per frame
  };

  var SUIT_COLORS = {
    purple: '#a078dc',
    cyan:   '#5cc8d0',
    red:    '#d06060',
    green:  '#60b060',
    gold:   '#c8a840',
    white:  '#d0d0d0',
  };

  function init(spawnX, spawnY) {
    player.x = spawnX;
    player.y = spawnY;
    player.targetX = spawnX;
    player.targetY = spawnY;
    player.moveProgress = 1;
    player.facing = 'down';
    player.walking = false;
  }

  function getX() { return player.x; }
  function getY() { return player.y; }
  function getFacing() { return player.facing; }
  function isMoving() { return player.moveProgress < 1; }

  /** Get the interpolated render position (smooth between tiles). */
  function getRenderPos() {
    var p = Math.min(1, player.moveProgress);
    return {
      x: player.x + (player.targetX - player.x) * p,
      y: player.y + (player.targetY - player.y) * p
    };
  }

  /** Try to move in a direction. Returns true if movement started. */
  function tryMove(dx, dy, collisions, mapW, mapH) {
    // Update facing regardless of whether we can move
    if (dx < 0) player.facing = 'left';
    else if (dx > 0) player.facing = 'right';
    else if (dy < 0) player.facing = 'up';
    else if (dy > 0) player.facing = 'down';

    // Can't move if still interpolating
    if (player.moveProgress < 1) return false;

    var newX = player.x + dx;
    var newY = player.y + dy;

    // Bounds check
    if (newX < 0 || newX >= mapW || newY < 0 || newY >= mapH) return false;

    // Collision check
    if (collisions[newY] && collisions[newY][newX] === 1) return false;

    // Start movement
    player.targetX = newX;
    player.targetY = newY;
    player.moveProgress = 0;
    player.walking = true;
    return true;
  }

  /** Update movement interpolation. Call each frame. */
  function update() {
    if (player.moveProgress < 1) {
      player.moveProgress += player.moveSpeed;
      if (player.moveProgress >= 1) {
        player.moveProgress = 1;
        player.x = player.targetX;
        player.y = player.targetY;
        player.walking = false;
      }
      // Walk animation
      player.animTimer++;
      if (player.animTimer > 8) {
        player.animTimer = 0;
        player.animFrame = (player.animFrame + 1) % 4;
      }
    } else {
      player.animFrame = 0;
    }
  }

  /** Draw the character. Placeholder: colored square + direction dot. */
  function draw(ctx, camX, camY, tileSize, scale) {
    var pos = getRenderPos();
    var screenX = (pos.x - camX) * tileSize * scale + ctx.canvas.width / (2 * (window.devicePixelRatio || 1));
    var screenY = (pos.y - camY) * tileSize * scale + ctx.canvas.height / (2 * (window.devicePixelRatio || 1));
    var size = tileSize * scale;

    // Get suit color from pilot data
    var pilot = BridgeState.getPilot();
    var color = SUIT_COLORS[(pilot && pilot.suit_color) || 'purple'];

    // Body
    ctx.fillStyle = color;
    ctx.fillRect(screenX + size * 0.1, screenY + size * 0.1, size * 0.8, size * 0.8);

    // Outline
    ctx.strokeStyle = '#0a0a16';
    ctx.lineWidth = 1;
    ctx.strokeRect(screenX + size * 0.1, screenY + size * 0.1, size * 0.8, size * 0.8);

    // Direction indicator (small dot showing which way we're facing)
    ctx.fillStyle = '#fff';
    var dotX = screenX + size * 0.5;
    var dotY = screenY + size * 0.5;
    var dotOff = size * 0.25;
    if (player.facing === 'up') dotY -= dotOff;
    else if (player.facing === 'down') dotY += dotOff;
    else if (player.facing === 'left') dotX -= dotOff;
    else if (player.facing === 'right') dotX += dotOff;

    ctx.beginPath();
    ctx.arc(dotX, dotY, size * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Walk bob (subtle y offset when walking)
    if (player.walking && player.animFrame % 2 === 1) {
      // Already handled via animFrame, could add visual bob here
    }
  }

  return {
    init: init,
    getX: getX,
    getY: getY,
    getFacing: getFacing,
    isMoving: isMoving,
    getRenderPos: getRenderPos,
    tryMove: tryMove,
    update: update,
    draw: draw
  };
})();
```

- [ ] **Step 2: Commit**

```bash
git add apps/bridge/js/character.js
git commit -m "feat(bridge): character module — grid movement, placeholder sprite"
```

---

## Task 5: World Renderer + Camera

**Files:**
- Create: `apps/bridge/js/world.js`

Loads world JSON, renders the tile grid with placeholder colors, manages the camera.

- [ ] **Step 1: Create world.js**

Create `apps/bridge/js/world.js`:

```js
/**
 * BridgeWorld — Tile renderer + camera.
 *
 * Loads a world JSON, renders tiles as colored rectangles (placeholder).
 * Camera follows the player with smooth lerp, clamped to map edges.
 *
 * Usage:
 *   BridgeWorld.load('arcadia', callback)
 *   BridgeWorld.update()
 *   BridgeWorld.draw(ctx, w, h)
 */
var BridgeWorld = (function () {
  var world = null;    // loaded world data
  var camera = { x: 0, y: 0 };
  var tileSize = 16;
  var scale = 3;
  var active = false;
  var overlay = null;

  function load(worldId, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/bridge/assets/worlds/' + worldId + '.json');
    xhr.onload = function () {
      if (xhr.status === 200) {
        world = JSON.parse(xhr.responseText);
        tileSize = world.tileSize || 16;
        callback(world);
      }
    };
    xhr.send();
  }

  function getWorld() { return world; }
  function isActive() { return active; }

  function show() {
    if (!world) return;
    active = true;

    overlay = document.getElementById('world-overlay');
    overlay.style.display = 'block';
    overlay.classList.add('active');

    overlay.innerHTML =
      '<div class="world-hud">' +
        '<a class="world-back" id="world-back">&larr; LEAVE WORLD</a>' +
        '<div class="interact-prompt" id="interact-prompt"></div>' +
      '</div>';

    document.getElementById('world-back').addEventListener('click', function (e) {
      e.preventDefault();
      leave();
    });

    // Init camera at player spawn
    var spawn = world.spawns.player;
    camera.x = spawn[0];
    camera.y = spawn[1];

    // Init character
    BridgeCharacter.init(spawn[0], spawn[1]);

    // Enable controls
    BridgeControls.enable();

    // Show d-pad on mobile
    if (window.innerWidth <= 768) {
      document.getElementById('dpad').style.display = 'grid';
    }

    // Calculate scale based on screen size
    recalcScale();
    window.addEventListener('resize', recalcScale);
  }

  function recalcScale() {
    // Aim for ~18-22 tiles visible horizontally
    var targetTilesX = 20;
    scale = Math.max(2, Math.floor(window.innerWidth / (tileSize * targetTilesX)));
  }

  function leave() {
    active = false;
    BridgeControls.disable();
    window.removeEventListener('resize', recalcScale);

    if (overlay) {
      overlay.style.display = 'none';
      overlay.classList.remove('active');
    }

    var dpad = document.getElementById('dpad');
    if (dpad) dpad.style.display = 'none';

    // Save position
    BridgeState.setWorldPos({
      worldId: world.name.toLowerCase(),
      x: BridgeCharacter.getX(),
      y: BridgeCharacter.getY(),
      facing: BridgeCharacter.getFacing()
    });

    BridgeState.transition('cockpit');
  }

  function update() {
    if (!active || !world) return;

    // Poll controls → move character
    var dir = BridgeControls.getDir();
    if (dir.dx !== 0 || dir.dy !== 0) {
      BridgeCharacter.tryMove(dir.dx, dir.dy, world.collisions, world.width, world.height);
    }

    // Update character animation
    BridgeCharacter.update();

    // Smooth camera follow
    var pos = BridgeCharacter.getRenderPos();
    camera.x += (pos.x - camera.x) * 0.1;
    camera.y += (pos.y - camera.y) * 0.1;

    // Clamp camera to map edges
    var screenW = window.innerWidth;
    var screenH = window.innerHeight;
    var halfW = screenW / (2 * tileSize * scale);
    var halfH = screenH / (2 * tileSize * scale);

    camera.x = Math.max(halfW, Math.min(world.width - halfW, camera.x));
    camera.y = Math.max(halfH, Math.min(world.height - halfH, camera.y));

    // Check interactions
    if (typeof BridgeInteractions !== 'undefined') {
      BridgeInteractions.update(world, BridgeCharacter, BridgeControls);
    }
  }

  function draw(ctx, w, h) {
    if (!active || !world) return;

    var ts = tileSize * scale;

    // Viewport offset (camera centered on screen)
    var offX = w / 2 - camera.x * ts;
    var offY = h / 2 - camera.y * ts;

    // Determine visible tile range
    var startCol = Math.max(0, Math.floor(-offX / ts));
    var startRow = Math.max(0, Math.floor(-offY / ts));
    var endCol = Math.min(world.width, Math.ceil((w - offX) / ts));
    var endRow = Math.min(world.height, Math.ceil((h - offY) / ts));

    // Draw tiles
    for (var row = startRow; row < endRow; row++) {
      for (var col = startCol; col < endCol; col++) {
        var tileId = world.tiles[row][col];
        var color = world.tileColors[String(tileId)];
        if (!color) continue; // transparent/void

        ctx.fillStyle = color;
        ctx.fillRect(
          Math.floor(offX + col * ts),
          Math.floor(offY + row * ts),
          Math.ceil(ts),
          Math.ceil(ts)
        );

        // Tile grid lines (subtle, for placeholder tiles)
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(
          Math.floor(offX + col * ts),
          Math.floor(offY + row * ts),
          Math.ceil(ts),
          Math.ceil(ts)
        );
      }
    }

    // Draw character
    BridgeCharacter.draw(ctx, camera.x, camera.y, tileSize, scale);
  }

  return {
    load: load,
    getWorld: getWorld,
    isActive: isActive,
    show: show,
    leave: leave,
    update: update,
    draw: draw,
    getCamera: function () { return camera; },
    getScale: function () { return scale; },
    getTileSize: function () { return tileSize; }
  };
})();
```

- [ ] **Step 2: Commit**

```bash
git add apps/bridge/js/world.js
git commit -m "feat(bridge): world renderer — tile grid, camera follow, viewport culling"
```

---

## Task 6: Interactions Module

**Files:**
- Create: `apps/bridge/js/interactions.js`

- [ ] **Step 1: Create interactions.js**

Create `apps/bridge/js/interactions.js`:

```js
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
          worldId: BridgeWorld.getWorld().name.toLowerCase(),
          x: BridgeCharacter.getX(),
          y: BridgeCharacter.getY(),
          facing: BridgeCharacter.getFacing()
        });
        BridgeState.transition('redirect', { url: inter.target });
        break;

      case 'dialog':
        showDialog(inter.label, inter.dialog);
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/bridge/js/interactions.js
git commit -m "feat(bridge): interactions — proximity prompts, app navigation, dialogs"
```

---

## Task 7: Landing Animation

**Files:**
- Create: `apps/bridge/js/landing.js`

Brief arrival screen when entering a world from hyperspace.

- [ ] **Step 1: Create landing.js**

Create `apps/bridge/js/landing.js`:

```js
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
      // After 2s, fade out landing and show world
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/bridge/js/landing.js
git commit -m "feat(bridge): landing animation — world name reveal + fade to world"
```

---

## Task 8: Wire Everything — Main Loop + Hyperspace + Starmap

**Files:**
- Modify: `apps/bridge/js/main.js`
- Modify: `apps/bridge/js/hyperspace.js`
- Modify: `apps/bridge/js/starmap.js`

- [ ] **Step 1: Update main.js — add world rendering and state handling**

In `apps/bridge/js/main.js`, update the `loop` function to handle world state:

```js
function loop() {
  var w = window.innerWidth;
  var h = window.innerHeight;

  ctx.clearRect(0, 0, w, h);

  var state = BridgeState.getState();

  // Background: starfield for non-world states, world tiles for world state
  if (state === 'world' && typeof BridgeWorld !== 'undefined') {
    BridgeWorld.update();
    BridgeWorld.draw(ctx, w, h);
  } else if (state !== 'redirect') {
    BridgeStarfield.draw(ctx, w, h);
  }

  // State-specific rendering
  if (state === 'intro' && typeof BridgeIntro !== 'undefined') {
    BridgeIntro.draw(ctx, w, h);
  } else if (state === 'cockpit' && typeof BridgeCockpit !== 'undefined') {
    BridgeCockpit.draw(ctx, w, h);
  } else if (state === 'starmap' && typeof BridgeStarmap !== 'undefined') {
    BridgeStarmap.draw(ctx, w, h);
  }

  requestAnimationFrame(loop);
}
```

Update `onStateChange` to handle `landing` and `world`:

```js
case 'landing':
  if (typeof BridgeLanding !== 'undefined') BridgeLanding.show(context);
  break;
case 'world':
  if (typeof BridgeWorld !== 'undefined') BridgeWorld.show();
  break;
```

- [ ] **Step 2: Update hyperspace.js — route to landing for overworld worlds**

In `apps/bridge/js/hyperspace.js`, update the `start` function. After the flash, instead of always redirecting, check if the world has an overworld:

Replace the flash callback logic:

```js
flash(function () {
  BridgeStarfield.setMode('drift');

  if (world.hasOverworld) {
    // World has a walkable overworld — go through landing animation
    BridgeState.transition('landing', { id: world.id, name: world.name });
  } else if (world.apps.length === 1) {
    BridgeState.transition('redirect', { url: world.apps[0].url });
  } else {
    showSelection(world);
  }
});
```

- [ ] **Step 3: Update starmap.js — add hasOverworld flag and world IDs**

In `apps/bridge/js/starmap.js`, update the WORLDS array to include `id` and `hasOverworld`:

```js
var WORLDS = [
  {
    id: 'arcadia',
    name: 'ARCADIA',
    blurb: 'A retro arcade planet bathed in neon light. Cabinets line the streets, high scores flicker on the walls.',
    apps: [{ name: 'Runouts', url: '/runouts' }],
    color: '#d06090',
    glow: 'rgba(208, 96, 144, 0.3)',
    px: 0.25,
    py: 0.35,
    hasOverworld: true
  },
  {
    id: 'singularity',
    name: 'THE SINGULARITY',
    blurb: 'A cosmic anomaly at the edge of known space. Reality warps and fractures around its event horizon.',
    apps: [{ name: 'Genart', url: '/genart' }],
    color: '#a078dc',
    glow: 'rgba(160, 120, 220, 0.3)',
    px: 0.45,
    py: 0.55,
    hasOverworld: false
  },
  {
    id: 'enigma',
    name: 'ENIGMA STATION',
    blurb: 'An abandoned intelligence outpost drifting in deep space. Terminals still flicker with encrypted transmissions.',
    apps: [
      { name: 'Cipher Room', url: '/cipher-room', desc: 'Daily crossword dispatches' },
      { name: 'Typist', url: '/typist', desc: 'Signal relay — decode transmissions' }
    ],
    color: '#5cc8d0',
    glow: 'rgba(92, 200, 208, 0.3)',
    px: 0.70,
    py: 0.30,
    hasOverworld: false
  }
];
```

- [ ] **Step 4: Commit**

```bash
git add apps/bridge/js/main.js apps/bridge/js/hyperspace.js apps/bridge/js/starmap.js
git commit -m "feat(bridge): wire world engine — main loop, hyperspace→landing→world flow"
```

---

## Task 9: State Restore — Return to World from App

**Files:**
- Modify: `apps/bridge/js/main.js`

When a player returns from an app (e.g., `/runouts` back to `/bridge`), restore them to their world position instead of the cockpit.

- [ ] **Step 1: Update init in main.js**

Replace the init startup logic to check for saved world position:

```js
// Always start with the intro (ship flythrough)
// Cached pilots skip identity after the zoom — handled in intro.js
var savedWorldPos = BridgeState.loadWorldPos();
if (savedWorldPos && BridgeState.getCachedPilotName()) {
  // Returning from an app — restore world position
  var cached = BridgeState.getCachedPilotName();
  BridgeDB.lookupPilot(cached).then(function (result) {
    if (result && !result.error) {
      BridgeState.setPilot(result);
      BridgeDB.updateLastSeen(result.id);
      // Load world and restore position
      BridgeWorld.load(savedWorldPos.worldId, function (worldData) {
        BridgeCharacter.init(savedWorldPos.x, savedWorldPos.y);
        BridgeState.transition('world', { worldId: savedWorldPos.worldId });
      });
    } else {
      BridgeState.clearPilot();
      BridgeState.transition('intro');
    }
  });
} else {
  BridgeState.transition('intro');
}
```

- [ ] **Step 2: Clear world position when leaving world normally**

In `apps/bridge/js/world.js`, in the `leave` function, after saving position for the return-from-app case, clear it when going back to cockpit voluntarily:

The current `leave()` already saves world position then transitions to cockpit. When the player navigates to cockpit via "LEAVE WORLD", we should clear the saved position so they don't get dropped back into the world on next visit:

Update `leave()` in world.js — remove the `setWorldPos` call (we only save position when navigating to an app, not when leaving to cockpit):

```js
function leave() {
  active = false;
  BridgeControls.disable();
  window.removeEventListener('resize', recalcScale);

  if (overlay) {
    overlay.style.display = 'none';
    overlay.classList.remove('active');
  }

  var dpad = document.getElementById('dpad');
  if (dpad) dpad.style.display = 'none';

  // Clear world position — player chose to leave
  BridgeState.clearWorldPos();
  BridgeState.transition('cockpit');
}
```

The position is saved only in `interactions.js` `executeInteraction` when navigating to an app — that's already correct.

- [ ] **Step 3: Commit**

```bash
git add apps/bridge/js/main.js apps/bridge/js/world.js
git commit -m "feat(bridge): restore world position when returning from app"
```

---

## Task 10: End-to-End Verification

- [ ] **Step 1: Test full flow**

1. Visit `/bridge` — intro → identity/cockpit
2. Open star map → select Arcadia → JUMP HERE
3. Hyperspace animation → "ARRIVING... ARCADIA" landing screen
4. Fades to Arcadia world — player standing in front of arcade
5. WASD/arrows to walk around — grid movement with smooth slide
6. Walk to an arcade cabinet → "PRESS E TO PLAY" prompt appears
7. Press E on Runouts machine → navigates to `/runouts`
8. Click "Return to Bridge" on Runouts → restores to world position
9. Walk to high score board → "PRESS E TO VIEW" → dialog with scores
10. Press E to dismiss dialog
11. Click "LEAVE WORLD" → returns to cockpit
12. Mobile: d-pad appears in world, touch controls work
13. Singularity/Enigma Station still work as before (direct redirect / selection)

- [ ] **Step 2: Fix any issues found**

```bash
git add -A
git commit -m "fix(bridge): end-to-end flow fixes for Phase 2"
```
