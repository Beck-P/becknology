/**
 * BridgeSailAnim — stylized Lumar archipelago map overlay for sail trips.
 *
 * Replaces the plain emoji-glide animation with a canvas-rendered map:
 * five islands at fixed coordinates, themed sea colors, a pixel-art
 * boat that travels along a curved path from source to destination
 * with a foam wake. The sea color shifts from the source's palette to
 * the destination's during the journey.
 *
 * Usage:
 *   BridgeSailAnim.play('lumar', 'lumar-midnight').then(function () {
 *     // continue the world transition
 *   });
 *
 * Public API:
 *   .play(fromWorldId, toWorldId, opts) → Promise (resolves at landing)
 *   .isKnown(worldId)                   → boolean (do we have it on the map?)
 */
var BridgeSailAnim = (function () {

  // Island registry — mapX/mapY are 0..1 ratios within the map area.
  // sea is the deep-water color, shore is the highlight rim.
  var ISLANDS = {
    'lumar': {
      name: "DIGGEN'S POINT",
      mapX: 0.50, mapY: 0.50,
      sea: '#1a4030', shore: '#90e0a8',
      shape: 'main'
    },
    'lumar-midnight': {
      name: 'MIDNIGHT ISLE',
      mapX: 0.18, mapY: 0.22,
      sea: '#080814', shore: '#8060c0',
      shape: 'spire'
    },
    'lumar-rose': {
      name: 'ROSE COVE',
      mapX: 0.82, mapY: 0.22,
      sea: '#401a30', shore: '#e070a0',
      shape: 'crescent'
    },
    'lumar-sapphire': {
      name: 'SAPPHIRE PORT',
      mapX: 0.82, mapY: 0.78,
      sea: '#1a2a40', shore: '#5080c0',
      shape: 'angular'
    },
    'lumar-crimson': {
      name: 'CRIMSON REACH',
      mapX: 0.18, mapY: 0.78,
      sea: '#401a1a', shore: '#c04040',
      shape: 'jagged'
    }
  };

  var DURATION = 3000;
  var FADE_IN  = 220;
  var FADE_OUT = 280;

  function isKnown(worldId) { return !!ISLANDS[worldId]; }

  function play(fromId, toId, opts) {
    opts = opts || {};
    var from = ISLANDS[fromId];
    var to   = ISLANDS[toId];
    if (!from || !to) return Promise.resolve(false);

    return new Promise(function (resolve) {
      var overlay = document.getElementById('landing-overlay');
      if (!overlay) return resolve(false);
      overlay.innerHTML = '';
      overlay.style.cssText =
        'position:fixed;inset:0;z-index:300;display:flex;' +
        'align-items:center;justify-content:center;' +
        'background:#020308;' +
        'opacity:0;transition:opacity ' + FADE_IN + 'ms ease;';
      overlay.style.display = 'flex';
      overlay.classList.add('active');

      var canvas = document.createElement('canvas');
      canvas.id = 'sail-anim-canvas';
      var dpr = window.devicePixelRatio || 1;
      var w = Math.min(window.innerWidth - 32, 720);
      var h = Math.min(window.innerHeight - 96, 480);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.cssText = 'width:' + w + 'px;height:' + h + 'px;image-rendering:pixelated;display:block;';
      overlay.appendChild(canvas);

      var label = document.createElement('div');
      label.style.cssText =
        'position:absolute;top:8%;left:0;right:0;text-align:center;' +
        'font-family:"Courier New",Consolas,monospace;letter-spacing:3px;' +
        'color:#cfd6e0;text-shadow:0 1px 0 #000;';
      label.innerHTML =
        '<div style="font-size:10px;color:rgba(180,200,220,0.55);margin-bottom:4px;">SAILING</div>' +
        '<div style="font-size:16px;color:' + to.shore + ';">' + from.name + '  →  ' + to.name + '</div>';
      overlay.appendChild(label);

      var ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;

      // Force reflow then trigger fade-in
      void overlay.offsetHeight;
      overlay.style.opacity = '1';

      var startedAt = performance.now();
      var raf = null;

      function tick(now) {
        var elapsed = now - startedAt;
        var t = Math.max(0, Math.min(1, elapsed / DURATION));
        drawFrame(ctx, w, h, from, to, t);
        if (elapsed < DURATION) {
          raf = requestAnimationFrame(tick);
        } else {
          // Fade out then resolve
          overlay.style.transition = 'opacity ' + FADE_OUT + 'ms ease';
          overlay.style.opacity = '0';
          setTimeout(function () {
            overlay.innerHTML = '';
            overlay.classList.remove('active');
            overlay.style.display = 'none';
            resolve(true);
          }, FADE_OUT);
        }
      }
      raf = requestAnimationFrame(tick);
    });
  }

  function drawFrame(ctx, w, h, from, to, t) {
    // Map area: full canvas with some padding
    var pad = 28;
    var mapW = w - 2 * pad;
    var mapH = h - 2 * pad;
    var mapX = pad, mapY = pad;

    // Background sea: gradient that shifts from source to destination
    var seaBlend = blendColor(from.sea, to.sea, smoothstep(t));
    ctx.fillStyle = seaBlend;
    ctx.fillRect(0, 0, w, h);
    // Subtle radial vignette toward the destination
    var dest = mapAreaXY(to, mapX, mapY, mapW, mapH);
    var grad = ctx.createRadialGradient(dest.x, dest.y, 0, dest.x, dest.y, Math.max(mapW, mapH) * 0.6);
    grad.addColorStop(0, hexToRgba(to.shore, 0.10 + 0.10 * t));
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Animated sea bands
    var time = performance.now();
    drawSeaBands(ctx, w, h, time, seaBlend, blendColor(from.shore, to.shore, smoothstep(t)));

    // Compass rose in the corner
    drawCompass(ctx, w - 60, h - 60, 22, time);

    // Islands
    var islandIds = Object.keys(ISLANDS);
    for (var i = 0; i < islandIds.length; i++) {
      var isl = ISLANDS[islandIds[i]];
      var p = mapAreaXY(isl, mapX, mapY, mapW, mapH);
      drawIsland(ctx, p.x, p.y, isl, isl === from || isl === to, time);
    }

    // Boat with wake
    var src  = mapAreaXY(from, mapX, mapY, mapW, mapH);
    var dst  = mapAreaXY(to,   mapX, mapY, mapW, mapH);
    var bezier = pathPoint(src, dst, smoothstep(t));
    drawWake(ctx, src, dst, smoothstep(t), to.shore);
    drawBoat(ctx, bezier.x, bezier.y, bezier.angle, time);

    // Island labels — drawn last so they sit above other layers
    for (var j = 0; j < islandIds.length; j++) {
      var il = ISLANDS[islandIds[j]];
      var pp = mapAreaXY(il, mapX, mapY, mapW, mapH);
      ctx.font = 'bold 9px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = (il === from || il === to) ? il.shore : 'rgba(200,210,225,0.45)';
      ctx.fillText(il.name, pp.x, pp.y + 28);
    }
    ctx.textAlign = 'start';
  }

  function mapAreaXY(island, x, y, w, h) {
    return { x: x + island.mapX * w, y: y + island.mapY * h };
  }

  // Quadratic bezier between source and destination with a curved control
  // offset perpendicular to the line, so the boat sails an arc rather than
  // a straight line. Returns position + heading angle.
  function pathPoint(src, dst, t) {
    var mx = (src.x + dst.x) / 2;
    var my = (src.y + dst.y) / 2;
    var dx = dst.x - src.x, dy = dst.y - src.y;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    // Perpendicular offset, magnitude ~25% of path length
    var ox = -dy / len * len * 0.18;
    var oy =  dx / len * len * 0.18;
    var cx = mx + ox, cy = my + oy;
    // Bezier
    var u = 1 - t;
    var x = u * u * src.x + 2 * u * t * cx + t * t * dst.x;
    var y = u * u * src.y + 2 * u * t * cy + t * t * dst.y;
    // Tangent for heading
    var tx = 2 * u * (cx - src.x) + 2 * t * (dst.x - cx);
    var ty = 2 * u * (cy - src.y) + 2 * t * (dst.y - cy);
    return { x: x, y: y, angle: Math.atan2(ty, tx) };
  }

  function drawIsland(ctx, cx, cy, island, highlighted, time) {
    var size = 14;
    // Halo for highlighted (source/dest)
    if (highlighted) {
      var pulse = 0.55 + 0.25 * Math.sin(time / 360);
      var halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 2.2);
      halo.addColorStop(0, hexToRgba(island.shore, 0.5 * pulse));
      halo.addColorStop(1, 'transparent');
      ctx.fillStyle = halo;
      ctx.fillRect(cx - size * 2.5, cy - size * 2.5, size * 5, size * 5);
    }
    // Body — dark outline + base color
    ctx.fillStyle = '#080810';
    ctx.fillRect(Math.floor(cx - size / 2) - 1, Math.floor(cy - size / 2) - 1, size + 2, size + 2);
    ctx.fillStyle = island.sea;
    ctx.fillRect(Math.floor(cx - size / 2), Math.floor(cy - size / 2), size, size);
    // Shore rim
    ctx.fillStyle = island.shore;
    ctx.fillRect(Math.floor(cx - size / 2), Math.floor(cy - size / 2), size, 2);
    ctx.fillRect(Math.floor(cx - size / 2), Math.floor(cy + size / 2 - 2), size, 2);
    // Shape detail
    if (island.shape === 'spire') {
      // Tower silhouette in island accent color
      ctx.fillStyle = island.shore;
      ctx.fillRect(Math.floor(cx) - 1, Math.floor(cy) - 5, 2, 6);
      ctx.fillRect(Math.floor(cx), Math.floor(cy) - 7, 1, 2);
    } else if (island.shape === 'main') {
      // Bigger island with a lighthouse
      ctx.fillStyle = '#3a2410';
      ctx.fillRect(Math.floor(cx - 4), Math.floor(cy - 1), 8, 4);
      ctx.fillStyle = '#ffe080';
      ctx.fillRect(Math.floor(cx + 4), Math.floor(cy - 3), 2, 2);
    } else if (island.shape === 'crescent') {
      ctx.fillStyle = island.shore;
      ctx.fillRect(Math.floor(cx - 4), Math.floor(cy), 8, 1);
      ctx.fillRect(Math.floor(cx - 3), Math.floor(cy + 1), 6, 1);
    } else if (island.shape === 'angular') {
      ctx.fillStyle = island.shore;
      ctx.fillRect(Math.floor(cx - 3), Math.floor(cy - 1), 2, 2);
      ctx.fillRect(Math.floor(cx + 1), Math.floor(cy - 1), 2, 2);
      ctx.fillRect(Math.floor(cx - 1), Math.floor(cy + 1), 2, 2);
    } else if (island.shape === 'jagged') {
      ctx.fillStyle = island.shore;
      ctx.fillRect(Math.floor(cx - 4), Math.floor(cy + 1), 2, 2);
      ctx.fillRect(Math.floor(cx - 1), Math.floor(cy - 2), 3, 4);
      ctx.fillRect(Math.floor(cx + 2), Math.floor(cy + 1), 2, 2);
    }
  }

  function drawBoat(ctx, cx, cy, angle, time) {
    // Pixel-art boat — drawn aligned to the heading. Two-tone hull + tiny
    // square sail.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    // Subtle bob
    var bob = Math.sin(time / 200) * 0.8;
    ctx.translate(0, bob);
    // Hull
    ctx.fillStyle = '#2a1810';
    ctx.fillRect(-6, -2, 12, 4);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(-5, -2, 10, 3);
    ctx.fillStyle = '#7a4e22';
    ctx.fillRect(-5, -2, 10, 1);
    // Mast
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(0, -8, 1, 6);
    // Sail
    ctx.fillStyle = '#f0f0e0';
    ctx.fillRect(-3, -7, 6, 4);
    ctx.fillStyle = '#a8a8a0';
    ctx.fillRect(-3, -4, 6, 1);
    ctx.restore();
  }

  function drawWake(ctx, src, dst, t, color) {
    // Trail of foam dots tracing the path behind the boat
    var dots = 14;
    for (var i = 0; i < dots; i++) {
      var dotT = t - (i / dots) * 0.35;
      if (dotT < 0 || dotT > 1) continue;
      var p = pathPoint(src, dst, dotT);
      var alpha = (1 - (i / dots)) * 0.55;
      var size = Math.max(1, 4 - i * 0.2);
      ctx.fillStyle = hexToRgba(color, alpha);
      ctx.fillRect(Math.floor(p.x - size / 2), Math.floor(p.y - size / 2),
                   Math.ceil(size), Math.ceil(size));
    }
  }

  function drawSeaBands(ctx, w, h, time, baseColor, accent) {
    // Faint diagonal foam bands that drift slowly — gives the sea
    // motion without competing with the boat.
    ctx.save();
    ctx.globalAlpha = 0.06;
    for (var i = 0; i < 4; i++) {
      var y = ((time / 80 + i * 90) % (h + 60)) - 30;
      ctx.fillStyle = accent;
      ctx.fillRect(0, Math.floor(y), w, 1);
    }
    ctx.restore();
  }

  function drawCompass(ctx, cx, cy, r, time) {
    // Cardinal compass — N points up. Faint, just for atmosphere.
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#0a0e1a';
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(180,200,220,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    // N arrow
    ctx.fillStyle = '#ffe080';
    ctx.beginPath();
    ctx.moveTo(cx, cy - r + 3);
    ctx.lineTo(cx - 3, cy);
    ctx.lineTo(cx + 3, cy);
    ctx.closePath();
    ctx.fill();
    // Other cardinals
    ctx.fillStyle = 'rgba(180,200,220,0.7)';
    ctx.beginPath();
    ctx.moveTo(cx, cy + r - 3);
    ctx.lineTo(cx - 2, cy);
    ctx.lineTo(cx + 2, cy);
    ctx.closePath();
    ctx.fill();
    ctx.font = 'bold 8px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe080';
    ctx.fillText('N', cx, cy - r - 2);
    ctx.textAlign = 'start';
    ctx.restore();
  }

  // ---- Color helpers ------------------------------------------------
  function smoothstep(t) { return t * t * (3 - 2 * t); }
  function hexToRgb(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    return {
      r: parseInt(h.slice(0,2), 16),
      g: parseInt(h.slice(2,4), 16),
      b: parseInt(h.slice(4,6), 16)
    };
  }
  function hexToRgba(hex, a) {
    var c = hexToRgb(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  }
  function blendColor(a, b, t) {
    var ca = hexToRgb(a), cb = hexToRgb(b);
    var r = Math.round(ca.r * (1 - t) + cb.r * t);
    var g = Math.round(ca.g * (1 - t) + cb.g * t);
    var bb = Math.round(ca.b * (1 - t) + cb.b * t);
    return 'rgb(' + r + ',' + g + ',' + bb + ')';
  }

  return { play: play, isKnown: isKnown };
})();
