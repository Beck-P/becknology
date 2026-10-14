/**
 * BridgeWorld — Tile renderer + camera.
 *
 * Loads a world JSON, renders tiles via tileset registry (per-type draw functions).
 * Data-driven glow system reads tileGlow/ambientGlow from world JSON.
 * Camera follows the player with smooth lerp, clamped to map edges.
 */
var BridgeWorld = (function () {
  var world = null;
  var currentWorldId = null;
  var camera = { x: 0, y: 0 };
  var tileSize = 16;
  var scale = 3;            // legacy: CSS px per world unit (tileSize) on screen
  var active = false;
  var overlay = null;

  // ---- Native pixel grid ----
  // The world is painted into a small offscreen canvas at NATIVE_TS pixels
  // per tile, then blown up to the screen by a whole number (`zoom` device
  // pixels per native pixel). Every sprite, tile, light and particle lands
  // on the same pixel grid, so nothing renders at a mismatched pixel size.
  var NATIVE_TS = 32;
  var zoom = 2;
  var buf = document.createElement('canvas');
  var bctx = buf.getContext('2d');
  // Native-space view of the frame being drawn ({offX, offY, ts, w, h}),
  // and the same view mapped to CSS pixels on screen.
  var view = { offX: 0, offY: 0, ts: NATIVE_TS, w: 0, h: 0 };
  var screenView = { offX: 0, offY: 0, ts: 64 };
  var lastUpdate = 0;

  // ---- Ambient Particles ----
  var particles = [];
  var PARTICLE_COUNT = 25;

  // ---- Tileset Registry ----
  // World modules register tilesets via registerTileset(name, { tileId: drawFn })
  // Each draw function signature: fn(ctx, x, y, ts)

  var TILESETS = {};
  var BACKGROUNDS = {};
  var OVERLAYS = {};

  function registerTileset(name, drawFns) {
    TILESETS[name] = drawFns;
  }

  function registerBackground(name, drawFn) {
    BACKGROUNDS[name] = drawFn;
  }

  // Per-tileset overlay drawn between game markers and the character.
  // Use for moving entities (drones, NPCs), animated screen elements
  // (viewports), or any content not anchored to a single tile.
  // Signature: fn(ctx, world, offX, offY, ts, time)
  function registerOverlay(name, drawFn) {
    OVERLAYS[name] = drawFn;
  }

  // ---- Glow Helpers ----

  function drawGlow(ctx, cx, cy, radius, r, g, b, alpha) {
    var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  }

  // Floating gold banner over an "app" interaction cluster — the universal
  // "playable game" indicator. Visible from across the map so players can
  // immediately tell which cabinets/terminals are games vs decoration.
  function drawGameMarker(ctx, cx, topY, ts, label, beat) {
    ctx.save();
    // Halo pulsing under the cluster
    ctx.globalCompositeOperation = 'screen';
    var haloCy = topY + ts * 0.4;
    var halo = ctx.createRadialGradient(cx, haloCy, 0, cx, haloCy, ts * 1.7);
    halo.addColorStop(0, 'rgba(255, 200, 80, ' + (0.28 + beat * 0.25).toFixed(2) + ')');
    halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo;
    ctx.fillRect(cx - ts * 1.7, topY - ts * 1.5, ts * 3.4, ts * 3.5);
    ctx.globalCompositeOperation = 'source-over';

    // Floating banner above the cluster — bob in sync with EXIT arrows
    var floatY = topY - ts * 0.55 - beat * (ts * 0.15);
    var fontSize = Math.max(10, Math.floor(ts * 0.22));
    ctx.font = 'bold ' + fontSize + 'px "Courier New", Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var displayLabel = '▶ ' + label;
    var labelW = ctx.measureText(displayLabel).width;
    var bannerH = Math.max(18, Math.floor(ts * 0.36));
    var padX = Math.max(10, Math.floor(ts * 0.18));
    var bx = cx - labelW / 2 - padX;
    var by = floatY - bannerH / 2;
    var bw = labelW + padX * 2;

    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(bx + 2, by + 2, bw, bannerH);
    // Banner background
    ctx.fillStyle = 'rgba(28, 18, 6, 0.94)';
    ctx.fillRect(bx, by, bw, bannerH);
    // Top highlight stripe (gives the banner depth, suggests an arcade marquee)
    ctx.fillStyle = 'rgba(255, 220, 140, 0.20)';
    ctx.fillRect(bx, by, bw, Math.max(1, Math.floor(bannerH * 0.28)));
    // Gold border, pulsing alpha
    ctx.strokeStyle = 'rgba(255, 200, 80, ' + (0.65 + beat * 0.35).toFixed(2) + ')';
    ctx.lineWidth = Math.max(1, Math.floor(ts / 24));
    ctx.strokeRect(bx, by, bw, bannerH);
    // Label text — shadow then fill for legibility on any background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillText(displayLabel, cx + 1, floatY + 1);
    ctx.fillStyle = '#ffe890';
    ctx.fillText(displayLabel, cx, floatY);
    // Downward chevron pointing at the cluster
    var triY = by + bannerH + 2;
    var triSize = Math.max(5, Math.floor(ts * 0.13));
    ctx.fillStyle = 'rgba(255, 200, 80, ' + (0.85 + beat * 0.15).toFixed(2) + ')';
    ctx.beginPath();
    ctx.moveTo(cx, triY + triSize);
    ctx.lineTo(cx - triSize, triY);
    ctx.lineTo(cx + triSize, triY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Find connected-component clusters of "app" interactions sharing the same target.
  // Two adjacent runouts cabinets become one cluster; two physically separate
  // RUNOUTS cabinets across the room stay as separate clusters.
  function findAppClusters(interactions) {
    var byCoord = {};
    for (var i = 0; i < interactions.length; i++) {
      var inter = interactions[i];
      if (inter.type !== 'app') continue;
      byCoord[inter.x + ',' + inter.y] = inter;
    }
    var visited = {};
    var clusters = [];
    var keys = Object.keys(byCoord);
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      if (visited[key]) continue;
      var seed = byCoord[key];
      var cluster = { minX: seed.x, maxX: seed.x, minY: seed.y, maxY: seed.y, label: seed.label };
      var queue = [[seed.x, seed.y]];
      visited[key] = true;
      while (queue.length) {
        var pt = queue.shift();
        var px = pt[0], py = pt[1];
        if (px < cluster.minX) cluster.minX = px;
        if (px > cluster.maxX) cluster.maxX = px;
        if (py < cluster.minY) cluster.minY = py;
        if (py > cluster.maxY) cluster.maxY = py;
        var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (var d = 0; d < 4; d++) {
          var nx = px + dirs[d][0], ny = py + dirs[d][1];
          var nkey = nx + ',' + ny;
          if (visited[nkey]) continue;
          var neighbor = byCoord[nkey];
          if (neighbor && neighbor.target === seed.target) {
            visited[nkey] = true;
            queue.push([nx, ny]);
          }
        }
      }
      clusters.push(cluster);
    }
    return clusters;
  }

  function initParticles() {
    particles = [];
    if (!world || !world.tileGlow) return;
    var glowTiles = [];
    for (var row = 0; row < world.height; row++) {
      for (var col = 0; col < world.width; col++) {
        var tid = world.tiles[row][col];
        if (world.tileGlow[String(tid)]) {
          glowTiles.push({ x: col, y: row, glow: world.tileGlow[String(tid)] });
        }
      }
    }
    if (glowTiles.length === 0) return;
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      var src = glowTiles[Math.floor(Math.random() * glowTiles.length)];
      particles.push(spawnParticle(src));
    }
  }

  function spawnParticle(src) {
    return {
      x: src.x + (Math.random() - 0.5) * 3,
      y: src.y + (Math.random() - 0.5) * 3,
      vx: (Math.random() - 0.5) * 0.005,
      vy: -Math.random() * 0.008 - 0.002,
      life: Math.random(),
      maxLife: 0.8 + Math.random() * 0.4,
      r: src.glow.color[0],
      g: src.glow.color[1],
      b: src.glow.color[2],
      srcX: src.x,
      srcY: src.y
    };
  }

  // f = elapsed time in 60 Hz frames, so motion is the same at any refresh rate.
  function updateParticles(f) {
    if (!world || !world.tileGlow || particles.length === 0) return;
    var glowTiles = [];
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx * f;
      p.y += p.vy * f;
      p.life += 0.008 * f;
      var dx = p.x - p.srcX;
      var dy = p.y - p.srcY;
      if (p.life >= p.maxLife || (dx*dx + dy*dy) > 9) {
        if (glowTiles.length === 0) {
          for (var row = 0; row < world.height; row++) {
            for (var col = 0; col < world.width; col++) {
              var tid = world.tiles[row][col];
              if (world.tileGlow[String(tid)]) {
                glowTiles.push({ x: col, y: row, glow: world.tileGlow[String(tid)] });
              }
            }
          }
        }
        if (glowTiles.length > 0) {
          var src = glowTiles[Math.floor(Math.random() * glowTiles.length)];
          particles[i] = spawnParticle(src);
        }
      }
    }
  }

  function drawParticles(ctx, offX, offY, ts) {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var alpha = p.life < 0.2
        ? p.life / 0.2
        : Math.max(0, 1 - (p.life - 0.2) / (p.maxLife - 0.2));
      alpha *= 0.6;
      if (alpha <= 0) continue;
      var sx = offX + p.x * ts;
      var sy = offY + p.y * ts;
      ctx.fillStyle = 'rgba(' + p.r + ',' + p.g + ',' + p.b + ',' + alpha.toFixed(2) + ')';
      ctx.fillRect(sx, sy, Math.max(1, ts * 0.06), Math.max(1, ts * 0.06));
    }
  }

  // ---- Static tile cache ----
  // Most tiles never change, so they're painted once into a world-sized
  // canvas. Tiles that animate (their pixels differ across sample times) or
  // that paint outside their own cell (multi-tile sprites) are still drawn
  // every frame, in the original row-major order. A few cached rows are
  // re-rendered each frame in rotation so state-driven drawers (owned decor,
  // etc.) never go stale for more than a fraction of a second.
  var CACHE_MX = 5, CACHE_MY = 8;   // overflow margins (tiles) for scratch/cache
  var tileClass = {};               // worldId -> { tileId: { dyn, over } }
  var tcache = { canvas: null, ctx: null, rows: 0, cursor: 0, snap: null, perFrame: [] };
  var scratch = null;

  function sameTiles(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (var r = 0; r < a.length; r++) {
      var ra = a[r], rb = b[r];
      for (var c = 0; c < ra.length; c++) if (ra[c] !== rb[c]) return false;
    }
    return true;
  }

  function classifyTiles() {
    var tileset = TILESETS[world.tileset] || {};
    var known = tileClass[currentWorldId] || (tileClass[currentWorldId] = {});
    var ts = NATIVE_TS;
    var sw = (CACHE_MX * 2 + 1) * ts, sh = (CACHE_MY + 2) * ts;
    var cx0 = CACHE_MX * ts, cy0 = CACHE_MY * ts;
    if (!scratch) {
      scratch = document.createElement('canvas');
    }
    scratch.width = sw; scratch.height = sh;
    var sctx = scratch.getContext('2d', { willReadFrequently: true });
    sctx.imageSmoothingEnabled = false;
    var T = [0, 1000, 2600, 4100, 7300];
    for (var row = 0; row < world.height; row++) {
      for (var col = 0; col < world.width; col++) {
        var id = world.tiles[row][col];
        if (!id || known[id]) continue;
        var fn = tileset[id];
        if (!fn) { known[id] = { dyn: false, over: false, opaque: false }; continue; }
        var first = null, dyn = false, over = false, opaque = true;
        try {
          for (var k = 0; k < T.length && !dyn; k++) {
            sctx.setTransform(1, 0, 0, 1, 0, 0);
            sctx.globalAlpha = 1;
            sctx.globalCompositeOperation = 'source-over';
            sctx.clearRect(0, 0, sw, sh);
            fn(sctx, cx0, cy0, ts, T[k], col, row);
            var px = new Uint32Array(sctx.getImageData(0, 0, sw, sh).data.buffer);
            if (!first) {
              first = px;
              for (var i = 0; i < px.length; i++) {
                var x = i % sw, y = (i / sw) | 0;
                var inCell = x >= cx0 && x < cx0 + ts && y >= cy0 && y < cy0 + ts;
                if (inCell) {
                  if ((px[i] >>> 24) !== 255) opaque = false;
                } else if (px[i]) {
                  over = true;
                }
              }
            } else {
              for (var j = 0; j < px.length; j++) {
                if (px[j] !== first[j]) { dyn = true; break; }
              }
            }
          }
        } catch (e) {
          dyn = true;   // anything odd: just draw it live
          opaque = false;
        }
        known[id] = { dyn: dyn, over: over, opaque: opaque };
      }
    }
    return known;
  }

  function cacheRow(row, cls, now) {
    var tileset = TILESETS[world.tileset] || {};
    var ts = NATIVE_TS;
    var c = tcache.ctx;
    var y = (CACHE_MY + row) * ts;
    c.clearRect(0, y, tcache.canvas.width, ts);
    for (var col = 0; col < world.width; col++) {
      var id = world.tiles[row][col];
      if (!id) continue;
      var k = cls[id];
      if (k && (k.dyn || k.over)) continue;
      var x = (CACHE_MX + col) * ts;
      var fn = tileset[id];
      if (fn) {
        fn(c, x, y, ts, now, col, row);
      } else {
        var color = world.tileColors && world.tileColors[String(id)];
        if (color) { c.fillStyle = color; c.fillRect(x, y, ts, ts); }
      }
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
    }
  }

  function buildTileCache() {
    if (!world || world.tileCache === false) { tcache.canvas = null; return; }
    var cls = classifyTiles();
    var ts = NATIVE_TS;
    if (!tcache.canvas) {
      tcache.canvas = document.createElement('canvas');
    }
    tcache.canvas.width = (world.width + CACHE_MX * 2) * ts;
    tcache.canvas.height = (world.height + CACHE_MY + 1) * ts;
    tcache.ctx = tcache.canvas.getContext('2d');
    tcache.ctx.imageSmoothingEnabled = false;
    tcache.rows = world.height;
    tcache.cursor = 0;
    tcache.snap = world.tiles.map(function (r) { return r.slice(); });
    var now = Date.now();
    for (var row = 0; row < world.height; row++) cacheRow(row, cls, now);

    // Sprites still downloading draw nothing yet, which would misclassify
    // them as empty static tiles — redo the classification once they land.
    if (typeof BridgeSprites !== 'undefined' && BridgeSprites.pendingCount() > 0) {
      var wid = currentWorldId;
      BridgeSprites.whenReady(function () {
        if (currentWorldId !== wid || !world) return;
        delete tileClass[wid];
        buildTileCache();
      });
    }
  }

  // True when the in-map tile at (col,row) fully covers its cell, so a
  // background never needs to paint under it.
  function isOpaqueCell(col, row) {
    if (!world || row < 0 || col < 0 || row >= world.height || col >= world.width) return false;
    var id = world.tiles[row][col];
    if (!id) return false;
    var cls = tileClass[currentWorldId];
    var k = cls && cls[id];
    return !!(k && k.opaque);
  }

  // Exposed so code that changes what a static tile looks like (decor
  // purchases, etc.) can force an immediate refresh.
  function invalidateTiles() {
    if (world) buildTileCache();
  }

  function load(worldId, callback) {
    var xhr = new XMLHttpRequest();
    // Cache-bust so JSON edits land without a hard reload (cheap — JSONs are tiny).
    xhr.open('GET', '/bridge/assets/worlds/' + worldId + '.json?v=' + Date.now());
    xhr.onload = function () {
      if (xhr.status === 200) {
        world = JSON.parse(xhr.responseText);
        currentWorldId = worldId;
        tileSize = world.tileSize || 16;
        // Drops are scoped to the current world — abandoning a zone wipes
        // whatever you left on the ground, same as Stardew leaving a day.
        if (typeof BridgeLoot !== 'undefined' && BridgeLoot.clear) BridgeLoot.clear();
        callback(world);
      }
    };
    xhr.send();
  }

  function getWorld() { return world; }
  function isActive() { return active; }

  function show(spawnOverride) {
    if (!world) return;
    active = true;

    overlay = document.getElementById('world-overlay');
    overlay.style.display = 'block';
    overlay.classList.add('active');

    // Always render an always-visible exit affordance — players should never
    // get stranded inside a world. The "LEAVE" link is the universal escape
    // hatch even for worlds that have a ship-tile exit. Worlds can override
    // its label via `leaveLabel` (e.g. quarters → "← COCKPIT").
    var leaveLabel = world.leaveLabel || '&#9210; LEAVE WORLD';
    var zoneTitle = world.name || (world.tileset ? world.tileset.toUpperCase() : 'SECTOR');
    overlay.innerHTML =
      '<div class="world-hud">' +
        '<a class="world-back" id="world-back" title="Esc">' + leaveLabel + '</a>' +
        '<div class="world-location-badge" id="world-location-badge">' +
          '<span class="world-location-dot"></span>' +
          '<span class="world-location-text">' + zoneTitle + '</span>' +
        '</div>' +
        '<div class="interact-prompt" id="interact-prompt"></div>' +
      '</div>';

    document.getElementById('world-back').addEventListener('click', function (e) {
      e.preventDefault();
      leave();
    });

    // Esc as a global hotkey while in a world.
    if (!window.__bridgeEscBound) {
      window.__bridgeEscBound = true;
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && BridgeState.getState() === 'world' && active) {
          // If a dialog is open, let the dialog handler take it.
          if (document.getElementById('world-dialog')) return;
          e.preventDefault();
          leave();
        }
      });
    }

    // Init camera and character at spawn or restored position
    var sx = spawnOverride ? spawnOverride.x : world.spawns.player[0];
    var sy = spawnOverride ? spawnOverride.y : world.spawns.player[1];
    camera.x = sx;
    camera.y = sy;
    BridgeCharacter.init(sx, sy);
    initParticles();
    buildTileCache();

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
    // Aim for ~20 tiles across, with tiles between 32 and 96 CSS px, then
    // snap to a whole number of device pixels per native pixel.
    var dpr = window.devicePixelRatio || 1;
    var cssTile = Math.max(32, Math.min(96, window.innerWidth / 20));
    zoom = Math.max(1, Math.floor(cssTile * dpr / NATIVE_TS));
    scale = (NATIVE_TS * zoom / dpr) / tileSize;
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

    // Clear world position — player chose to leave
    BridgeState.clearWorldPos();
    // Default leave destination is the bridge (the navigation hub).
    // Worlds may override via world.leaveTo (e.g., bridge → quarters).
    var dest = (world && world.leaveTo) || 'bridge';
    active = false;
    load(dest, function () {
      BridgeState.transition('world', { worldId: dest });
    });
  }

  // Step into another world (a building interior, a parent area on exit).
  // Quick fade-to-black, swap world JSON, fade back in.
  function enterWorld(worldId, spawn) {
    if (!worldId) return;
    BridgeControls.disable();

    var fade = document.getElementById('landing-overlay');
    fade.style.display = 'block';
    fade.classList.add('active');
    fade.style.background = '#000';
    fade.style.transition = 'opacity 0.22s ease-in';
    fade.style.opacity = '0';
    fade.innerHTML = '';
    // Force reflow so the transition kicks in
    void fade.offsetHeight;
    fade.style.opacity = '1';

    setTimeout(function () {
      load(worldId, function () {
        // Hide existing world overlay before re-showing with new data
        if (overlay) {
          overlay.style.display = 'none';
          overlay.classList.remove('active');
        }
        var spawnOverride = null;
        if (spawn) spawnOverride = { x: spawn[0], y: spawn[1] };
        show(spawnOverride);
        // Pass the spawn through the transition context. The state listener
        // (main.js) re-invokes BridgeWorld.show with context.spawn — without
        // this, it would call show(undefined) and clobber the override.
        BridgeState.transition('world', { worldId: worldId, spawn: spawnOverride });
        // Fade back in
        fade.style.transition = 'opacity 0.30s ease-out';
        fade.style.opacity = '0';
        setTimeout(function () {
          fade.style.display = 'none';
          fade.classList.remove('active');
          BridgeControls.enable();
        }, 300);
      });
    }, 230);
  }

  function sailTo(destination, destinationName) {
    if (!active) return;
    BridgeControls.disable();

    var fromId = (world && world.tileset) ? null : null;
    // Resolve the source world id from the current world's loaded source.
    // We stash it during load() in `currentWorldId`; fall back to tileset.
    fromId = currentWorldId || (world && world.tileset);

    var canUseMap = (typeof BridgeSailAnim !== 'undefined') &&
                    BridgeSailAnim.isKnown(fromId) &&
                    BridgeSailAnim.isKnown(destination);

    var sailOverlay = document.getElementById('landing-overlay');

    // Path 1 — rich map animation when both endpoints are registered.
    if (canUseMap) {
      // Start loading the destination world in parallel with the anim.
      var loaded = false;
      load(destination, function () { loaded = true; });
      BridgeSailAnim.play(fromId, destination).then(function () {
        // If the world load is still pending (slow network), poll briefly.
        var startPoll = Date.now();
        (function waitLoad() {
          if (loaded || Date.now() - startPoll > 2000) {
            if (overlay) {
              overlay.style.display = 'none';
              overlay.classList.remove('active');
            }
            show();
            BridgeControls.enable();
          } else {
            setTimeout(waitLoad, 60);
          }
        })();
      });
      return;
    }

    // Path 2 — legacy plain overlay for unmapped destinations (Dragon's
    // Cave etc. that aren't on the archipelago map).
    sailOverlay.style.display = 'flex';
    sailOverlay.style.flexDirection = 'column';
    sailOverlay.style.alignItems = 'center';
    sailOverlay.style.justifyContent = 'center';
    sailOverlay.classList.add('active');
    sailOverlay.style.opacity = '1';
    sailOverlay.style.background = 'rgba(0, 0, 0, 0.85)';
    sailOverlay.style.transition = 'opacity 1s';

    sailOverlay.innerHTML =
      '<div class="sail-anim" style="position:relative;width:280px;height:32px;margin-bottom:18px;overflow:hidden;">' +
        '<div class="sail-ship" style="position:absolute;top:8px;left:-40px;font-family:\'Courier New\',monospace;font-size:18px;color:#cfcfd8;letter-spacing:2px;animation:sail-glide 2.6s ease-in forwards;">⛵</div>' +
        '<div class="sail-wake" style="position:absolute;top:18px;left:0;right:0;height:2px;background:repeating-linear-gradient(90deg,rgba(120,160,200,0.35) 0,rgba(120,160,200,0.35) 8px,transparent 8px,transparent 14px);opacity:0.7;"></div>' +
      '</div>' +
      '<style>@keyframes sail-glide { from { left: -40px; } to { left: calc(100% + 20px); } }</style>' +
      '<div class="landing-text">SAILING...</div>' +
      '<div class="landing-subtitle" style="margin-top:12px;">' + (destinationName || destination).toUpperCase() + '</div>';

    load(destination, function () {
      setTimeout(function () {
        sailOverlay.style.opacity = '0';
        setTimeout(function () {
          sailOverlay.style.display = 'none';
          sailOverlay.classList.remove('active');
          if (overlay) {
            overlay.style.display = 'none';
            overlay.classList.remove('active');
          }
          show();
          BridgeControls.enable();
        }, 1000);
      }, 1500);
    });
  }

  function update() {
    if (!active || !world) return;

    // Real elapsed time (seconds), clamped so a backgrounded tab doesn't
    // teleport everything on return.
    var nowT = performance.now();
    var dt = lastUpdate ? Math.min(0.05, (nowT - lastUpdate) / 1000) : 1 / 60;
    lastUpdate = nowT;

    // Poll controls → move character
    var dir = BridgeControls.getDir();
    if (dir.dx !== 0 || dir.dy !== 0) {
      BridgeCharacter.tryMove(dir.dx, dir.dy, world.collisions, world.width, world.height);
    }

    // Update character animation
    BridgeCharacter.update(dt);

    // Loot drops — animate the bounce/bob and auto-pick when the player
    // walks over a settled drop.
    if (typeof BridgeLoot !== 'undefined' && BridgeLoot.update) {
      BridgeLoot.update(BridgeCharacter.getX(), BridgeCharacter.getY());
    }

    // Auto-fade the hotbar when the pilot is near the bottom of the
    // viewport, so it doesn't cover doors / boat decks / etc.
    if (typeof BridgeInventory !== 'undefined' && BridgeInventory.tick) {
      BridgeInventory.tick();
    }

    if (world.fixedCamera) {
      // Fixed camera: center on map
      camera.x = world.width / 2;
      camera.y = world.height / 2;
    } else {
      // Smooth camera follow
      // Exponential follow — same feel as the old 10%-per-frame lerp at
      // 60 Hz, but frame-rate independent.
      var pos = BridgeCharacter.getRenderPos();
      var follow = 1 - Math.exp(-dt * 6.3);
      camera.x += (pos.x - camera.x) * follow;
      camera.y += (pos.y - camera.y) * follow;

      // Clamp camera to map edges. When the map is smaller than the viewport
      // (interiors, etc.), the normal min/max clamp inverts and pins the camera
      // to a corner — instead, just center on the map so it sits in the middle
      // of the screen and the player walks around within the framed view.
      var screenW = window.innerWidth;
      var screenH = window.innerHeight;
      var halfW = screenW / (2 * tileSize * scale);
      var halfH = screenH / (2 * tileSize * scale);

      camera.x = world.width <= 2 * halfW
        ? world.width / 2
        : Math.max(halfW, Math.min(world.width - halfW, camera.x));
      camera.y = world.height <= 2 * halfH
        ? world.height / 2
        : Math.max(halfH, Math.min(world.height - halfH, camera.y));
    }

    // Check interactions
    if (typeof BridgeInteractions !== 'undefined') {
      BridgeInteractions.update(world, BridgeCharacter, BridgeControls);
    }

    updateParticles(dt * 60);
  }

  function draw(ctx, w, h) {
    if (!active || !world) return;

    var dpr = window.devicePixelRatio || 1;
    var dw = Math.round(w * dpr);
    var dh = Math.round(h * dpr);

    // ---- Native buffer (1 native px of margin each side for the
    // sub-pixel camera shift) ----
    var nw = Math.ceil(dw / zoom) + 2;
    var nh = Math.ceil(dh / zoom) + 2;
    if (buf.width !== nw || buf.height !== nh) {
      buf.width = nw;
      buf.height = nh;
    }
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.globalCompositeOperation = 'source-over';
    bctx.globalAlpha = 1;
    bctx.imageSmoothingEnabled = false;
    bctx.clearRect(0, 0, nw, nh);

    var ts = NATIVE_TS;
    var now = Date.now();
    // Snap the world to whole native pixels; the leftover fraction slides
    // the finished frame on screen so the camera still glides smoothly.
    var offXf = nw / 2 - camera.x * ts;
    var offYf = nh / 2 - camera.y * ts;
    var offX = Math.floor(offXf);
    var offY = Math.floor(offYf);
    view.offX = offX; view.offY = offY; view.ts = ts; view.w = nw; view.h = nh;

    drawWorldLayer(bctx, nw, nh, offX, offY, ts, now);

    // ---- Blit: integer upscale onto the device-pixel canvas ----
    var blitX = Math.round(dw / 2 - (nw * zoom) / 2 + (offXf - offX) * zoom);
    var blitY = Math.round(dh / 2 - (nh * zoom) / 2 + (offYf - offY) * zoom);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, blitX, blitY, nw * zoom, nh * zoom);
    ctx.restore();

    // ---- Screen-space pass (CSS px): text, markers, vignette ----
    var sts = ts * zoom / dpr;
    var soffX = (blitX + offX * zoom) / dpr;
    var soffY = (blitY + offY * zoom) / dpr;
    screenView.offX = soffX; screenView.offY = soffY; screenView.ts = sts;
    drawScreenLayer(ctx, w, h, soffX, soffY, sts, now);
  }

  // Everything that lives in the world: tiles, glow, entities, character,
  // effects. Drawn at native resolution.
  function drawWorldLayer(ctx, w, h, offX, offY, ts, now) {
    var tileset = TILESETS[world.tileset] || {};
    var lit = !!(world.lighting && typeof BridgeLighting !== 'undefined');

    // Determine visible tile range. Padded by TILE_PAD so multi-tile PNG
    // buildings whose anchor cell is just off-screen still get a draw call —
    // their footprint extends from the anchor by up to anchorOffsetX/Y, so
    // without padding the whole building pops in/out as the anchor crosses
    // the viewport edge. 7 tiles covers the tallest sprite (the 7-tall
    // lighthouse) and the widest (the 7-wide ship dock).
    var TILE_PAD = 7;
    var startCol = Math.max(0, Math.floor(-offX / ts) - TILE_PAD);
    var startRow = Math.max(0, Math.floor(-offY / ts) - 1);
    var endCol = Math.min(world.width, Math.ceil((w - offX) / ts) + TILE_PAD);
    var endRow = Math.min(world.height, Math.ceil((h - offY) / ts) + TILE_PAD);

    // Pass 0: Custom background (if world has one registered)
    var bgFn = BACKGROUNDS[world.tileset];
    if (bgFn) {
      bgFn(ctx, w, h, now);
    }

    // Pass 1: Draw tiles — static ones come from the cache, the rest live.
    var cls = null;
    if (tcache.canvas) {
      cls = tileClass[currentWorldId];
      if (!sameTiles(world.tiles, tcache.snap)) {
        buildTileCache();
        cls = tileClass[currentWorldId];
      } else {
        var perFrame = Math.max(1, Math.ceil(tcache.rows / 12));
        for (var rr = 0; rr < perFrame; rr++) {
          cacheRow(tcache.cursor, cls, now);
          tcache.cursor = (tcache.cursor + 1) % tcache.rows;
        }
      }
      ctx.drawImage(tcache.canvas, offX - CACHE_MX * ts, offY - CACHE_MY * ts);
    }
    // Tall sprites (buildings, towers) whose base is below the pilot are
    // held back and drawn after the pilot, so walking behind them works.
    var pilotY = BridgeCharacter.getRenderPos().y;
    var deferred = [];
    for (var row = startRow; row < endRow; row++) {
      for (var col = startCol; col < endCol; col++) {
        var tileId = world.tiles[row][col];
        if (tileId === 0) continue;
        if (cls) {
          var kc = cls[tileId];
          if (kc && !kc.dyn && !kc.over) continue;
          if (kc && kc.over && row > pilotY) {
            deferred.push(row, col, tileId);
            continue;
          }
        }

        var tx = offX + col * ts;
        var ty = offY + row * ts;
        var drawFn = tileset[tileId];

        if (drawFn) {
          drawFn(ctx, tx, ty, ts, now, col, row);
        } else {
          // Fallback to flat color
          var color = world.tileColors && world.tileColors[String(tileId)];
          if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(tx, ty, ts, ts);
          }
        }
      }
    }

    // Pass 1.5: Interactive tile highlights
    if (world.interactions) {
      var px = BridgeCharacter.getX();
      var py = BridgeCharacter.getY();
      var facing = BridgeCharacter.getFacing();
      var checkX = px + (facing === 'right' ? 1 : facing === 'left' ? -1 : 0);
      var checkY = py + (facing === 'down' ? 1 : facing === 'up' ? -1 : 0);

      for (var i = 0; i < world.interactions.length; i++) {
        var inter = world.interactions[i];
        // Hostiles read as threats, not "press E to interact" prompts —
        // skip the green focus box for them so they stay menacing.
        if (inter.type === 'hostile') continue;
        if (inter.x === checkX && inter.y === checkY && !BridgeCharacter.isMoving()) {
          var hx = Math.floor(offX + inter.x * ts);
          var hy = Math.floor(offY + inter.y * ts);
          var hPulse = 0.45 + Math.sin(now / 300) * 0.25;
          var bLen = Math.max(4, Math.floor(ts * 0.22));
          ctx.fillStyle = 'rgba(40, 220, 80, ' + (hPulse * 0.08).toFixed(2) + ')';
          ctx.fillRect(hx + 2, hy + 2, ts - 4, ts - 4);
          ctx.fillStyle = 'rgba(80, 255, 130, ' + hPulse.toFixed(2) + ')';
          // Top-left bracket
          ctx.fillRect(hx + 1, hy + 1, bLen, 1);
          ctx.fillRect(hx + 1, hy + 1, 1, bLen);
          // Top-right bracket
          ctx.fillRect(hx + ts - 1 - bLen, hy + 1, bLen, 1);
          ctx.fillRect(hx + ts - 2, hy + 1, 1, bLen);
          // Bottom-left bracket
          ctx.fillRect(hx + 1, hy + ts - 2, bLen, 1);
          ctx.fillRect(hx + 1, hy + ts - 1 - bLen, 1, bLen);
          // Bottom-right bracket
          ctx.fillRect(hx + ts - 1 - bLen, hy + ts - 2, bLen, 1);
          ctx.fillRect(hx + ts - 2, hy + ts - 1 - bLen, 1, bLen);
        }
      }
    }

    // Pass 2: Glow (data-driven from world JSON). Lit worlds draw it after
    // the lighting pass instead, as bloom on top of the darkened scene.
    if (!lit) drawGlowPass(ctx, w, h, offX, offY, ts, startCol, startRow, endCol, endRow);

    // Pass 2.9: Per-tileset overlay (drone, viewport content, NPCs, etc.)
    var overlayFn = OVERLAYS[world.tileset];
    if (overlayFn) {
      overlayFn(ctx, world, offX, offY, ts, now);
    }

    // Pass 2.95: Loot drops — bounce, bob, sparkle. Drawn under the
    // character so the pilot can stand visually in front of pickups.
    if (typeof BridgeLoot !== 'undefined' && BridgeLoot.draw) {
      BridgeLoot.draw(ctx, offX, offY, ts);
    }

    // Pass 3: Character (on top of glow), then anything standing in front
    BridgeCharacter.draw(ctx, offX, offY, ts);
    for (var di = 0; di < deferred.length; di += 3) {
      var dfn = tileset[deferred[di + 2]];
      if (dfn) dfn(ctx, offX + deferred[di + 1] * ts, offY + deferred[di] * ts, ts, now, deferred[di + 1], deferred[di]);
    }

    // Pass 3.2: Lighting — darken to the world's ambient light, let light
    // sources punch through, then bloom the glows on top.
    if (lit) {
      BridgeLighting.apply(ctx, world, offX, offY, ts, w, h, now);
      drawGlowPass(ctx, w, h, offX, offY, ts, startCol, startRow, endCol, endRow);
    }

    // Pass 3.5: Transient effects (swing arcs, hit flashes, damage numbers).
    // Drawn after the character so a swing sweeps in front of the pilot.
    if (typeof BridgeFX !== 'undefined' && BridgeFX.draw) {
      BridgeFX.draw(ctx, offX, offY, ts, now);
    }
  }

  function drawGlowPass(ctx, w, h, offX, offY, ts, startCol, startRow, endCol, endRow) {
    if (!world.tileGlow) return;
    ctx.globalCompositeOperation = 'screen';

    for (var row = startRow; row < endRow; row++) {
      for (var col = startCol; col < endCol; col++) {
        var tileId = world.tiles[row][col];
        var glow = world.tileGlow[String(tileId)];
        if (!glow) continue;

        var cx = offX + (col + 0.5) * ts;
        var cy = offY + (row + 0.5) * ts;
        var radius = ts * glow.radius;
        drawGlow(ctx, cx, cy, radius, glow.color[0], glow.color[1], glow.color[2], glow.alpha);
      }
    }

    // Ambient glow
    if (world.ambientGlow) {
      var ag = world.ambientGlow;
      drawGlow(ctx, w / 2, h / 2, w * ag.radius, ag.color[0], ag.color[1], ag.color[2], ag.alpha);
    }

    // Ambient particles
    drawParticles(ctx, offX, offY, ts);

    ctx.globalCompositeOperation = 'source-over';
  }

  // UI that should stay crisp at screen resolution. CSS-pixel coordinates.
  function drawScreenLayer(ctx, w, h, offX, offY, ts, now) {
    // Crisp floating combat numbers / pickup text in screen space
    if (typeof BridgeFX !== 'undefined' && BridgeFX.drawScreen) {
      BridgeFX.drawScreen(ctx, offX, offY, ts);
    }
    // Exit beacons — pulsing arrow over every leave_world tile so the way
    // back to the ship is impossible to miss.
    if (world.interactions) {
      var beat = (Math.sin(now / 350) + 1) * 0.5; // 0..1
      for (var bi = 0; bi < world.interactions.length; bi++) {
        var bint = world.interactions[bi];
        if (bint.type !== 'leave_world') continue;
        if (bint.noBeacon) continue;
        var bx = Math.floor(offX + bint.x * ts);
        var by = Math.floor(offY + bint.y * ts);
        // Soft halo
        ctx.globalCompositeOperation = 'screen';
        var bg = ctx.createRadialGradient(bx + ts/2, by + ts/2, 0, bx + ts/2, by + ts/2, ts * 1.4);
        bg.addColorStop(0, 'rgba(120, 220, 255, ' + (0.35 + beat * 0.35).toFixed(2) + ')');
        bg.addColorStop(1, 'transparent');
        ctx.fillStyle = bg;
        ctx.fillRect(bx - ts, by - ts, ts * 3, ts * 3);
        ctx.globalCompositeOperation = 'source-over';
        // Floating "↑ EXIT" arrow above the tile
        var floatY = by - ts * 0.6 - beat * (ts * 0.18);
        var arrowAlpha = 0.85 + beat * 0.15;
        ctx.fillStyle = 'rgba(180, 235, 255, ' + arrowAlpha.toFixed(2) + ')';
        var arrowW = ts * 0.5;
        var arrowCx = bx + ts/2;
        // Triangle head
        ctx.beginPath();
        ctx.moveTo(arrowCx, floatY);
        ctx.lineTo(arrowCx - arrowW/2, floatY + arrowW * 0.6);
        ctx.lineTo(arrowCx + arrowW/2, floatY + arrowW * 0.6);
        ctx.closePath();
        ctx.fill();
        // Arrow stem
        ctx.fillRect(arrowCx - arrowW * 0.18, floatY + arrowW * 0.55, arrowW * 0.36, arrowW * 0.55);
        // Beacon label — uses the interaction's label, falling back to "EXIT"
        ctx.font = 'bold ' + Math.max(8, Math.floor(ts * 0.18)) + 'px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(220, 245, 255, ' + arrowAlpha.toFixed(2) + ')';
        ctx.fillText(bint.label || 'EXIT', arrowCx, floatY - ts * 0.05);
        ctx.textAlign = 'start';
      }

      // Game markers — gold banner over each app-interaction cluster.
      var appClusters = findAppClusters(world.interactions);
      var gameBeat = (Math.sin(now / 600) + 1) * 0.5;
      for (var ci = 0; ci < appClusters.length; ci++) {
        var cl = appClusters[ci];
        var clusterCx = ((cl.minX + cl.maxX + 1) / 2) * ts + offX;
        var clusterTopY = cl.minY * ts + offY;
        drawGameMarker(ctx, clusterCx, clusterTopY, ts, cl.label, gameBeat);
      }
    }

    // Edge vignette — soften abrupt black map edges so out-of-bounds
    // areas read as a fade rather than a sharp render boundary.
    var vignetteW = Math.min(120, w * 0.12);
    var grad = ctx.createLinearGradient(0, 0, vignetteW, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0.7)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, vignetteW, h);
    var grad2 = ctx.createLinearGradient(w - vignetteW, 0, w, 0);
    grad2.addColorStop(0, 'transparent');
    grad2.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = grad2;
    ctx.fillRect(w - vignetteW, 0, vignetteW, h);
    var grad3 = ctx.createLinearGradient(0, 0, 0, vignetteW);
    grad3.addColorStop(0, 'rgba(0,0,0,0.7)');
    grad3.addColorStop(1, 'transparent');
    ctx.fillStyle = grad3;
    ctx.fillRect(0, 0, w, vignetteW);
    var grad4 = ctx.createLinearGradient(0, h - vignetteW, 0, h);
    grad4.addColorStop(0, 'transparent');
    grad4.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = grad4;
    ctx.fillRect(0, h - vignetteW, w, vignetteW);
  }

  return {
    load: load,
    getWorld: getWorld,
    isActive: isActive,
    show: show,
    leave: leave,
    enterWorld: enterWorld,
    update: update,
    draw: draw,
    sailTo: sailTo,
    registerTileset: registerTileset,
    registerBackground: registerBackground,
    registerOverlay: registerOverlay,
    getCamera: function () { return camera; },
    getScale: function () { return scale; },
    getTileSize: function () { return tileSize; },
    // Native-space view of the frame being drawn — use inside tileset
    // backgrounds/overlays instead of getScale()/getCamera().
    getView: function () { return view; },
    // The same view in CSS pixels on screen — for mouse picking and DOM.
    getScreenView: function () { return screenView; },
    getZoom: function () { return zoom; },
    invalidateTiles: invalidateTiles,
    isOpaqueCell: isOpaqueCell,
    NATIVE_TS: NATIVE_TS
  };
})();
