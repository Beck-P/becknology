/**
 * BridgeLighting — per-world light map.
 *
 * Opt-in via a `lighting` block in a world JSON:
 *
 *   "lighting": {
 *     "ambient": [96, 104, 152],              // light level where nothing shines
 *     "fromGlow": { "gain": 2.6, "radius": 2.0, "skip": [13] },
 *                                            // every tileGlow tile also casts
 *                                            // light (alpha × gain, radius × r),
 *                                            // except the tile ids in skip
 *     "tileLights": {                        // a light on every tile of a type
 *       "38": { "r": 3, "color": [255, 158, 72], "i": 0.7, "flicker": 0.1, "dy": -0.3 }
 *     },
 *     "lights": [                            // extra sources, in tile coords
 *       { "x": 5.0, "y": 3.3, "r": 2.6, "color": [255, 200, 120],
 *         "i": 0.6, "flicker": 0.08 }
 *     ],
 *     "pilot": { "r": 2.4, "color": [150, 170, 220], "i": 0.25 },
 *     "bloom": 0.3                           // lights screened back on top
 *   }
 *
 * The light map is painted at quarter native resolution (light is soft
 * anyway), starting from the ambient colour with each source added on top,
 * then multiplied over the finished scene: lit art keeps its painted colours,
 * everything else sinks toward the ambient tint. The lights alone are then
 * screened back over the top so pools of light glow, and the world's glow
 * pass runs last as a highlight.
 */
var BridgeLighting = (function () {
  var SCALE = 4;
  var lc = document.createElement('canvas');   // ambient + lights (multiply)
  var lcx = lc.getContext('2d');
  var gc = document.createElement('canvas');   // lights only (bloom)
  var lx = gc.getContext('2d');

  function rgba(c, a) {
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')';
  }

  // Two detuned sines — a lantern's slow breathing plus a faster flutter.
  function flicker(t, seed, amt) {
    if (!amt) return 1;
    return 1 + amt * (Math.sin(t / 173 + seed * 12.9) * 0.6 + Math.sin(t / 61 + seed * 4.1) * 0.4);
  }

  function addLight(cx, cy, r, color, intensity) {
    if (r <= 0 || intensity <= 0) return;
    var g = lx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, rgba(color, intensity));
    g.addColorStop(0.4, rgba(color, intensity * 0.55));
    g.addColorStop(0.75, rgba(color, intensity * 0.18));
    g.addColorStop(1, rgba(color, 0));
    lx.fillStyle = g;
    lx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  function apply(ctx, world, offX, offY, ts, w, h, now) {
    var L = world.lighting;
    var lw = Math.ceil(w / SCALE) + 1;
    var lh = Math.ceil(h / SCALE) + 1;
    if (lc.width !== lw || lc.height !== lh) {
      lc.width = gc.width = lw;
      lc.height = gc.height = lh;
    }
    var amb = L.ambient || [128, 128, 160];
    lx.globalCompositeOperation = 'source-over';
    lx.clearRect(0, 0, lw, lh);
    lx.globalCompositeOperation = 'lighter';

    var k = ts / SCALE;                 // light-map px per tile
    var ox = offX / SCALE, oy = offY / SCALE;
    var margin = 4;                     // tiles beyond the view that can still light it
    var c0 = Math.floor(-offX / ts) - margin, c1 = Math.ceil((w - offX) / ts) + margin;
    var r0 = Math.floor(-offY / ts) - margin, r1 = Math.ceil((h - offY) / ts) + margin;

    // Tile-based sources: glow tiles double as lights (fromGlow), and
    // tileLights gives specific tile types their own light.
    var fg = (L.fromGlow && world.tileGlow) ? L.fromGlow : null;
    var gain = fg && (fg.gain || 2.5);
    var rad = fg && (fg.radius || 2);
    var skip = {};
    if (fg && fg.skip) for (var si = 0; si < fg.skip.length; si++) skip[String(fg.skip[si])] = true;
    var tl = L.tileLights || null;
    if (fg || tl) {
      for (var row = Math.max(0, r0); row < Math.min(world.height, r1); row++) {
        for (var col = Math.max(0, c0); col < Math.min(world.width, c1); col++) {
          var id = String(world.tiles[row][col]);
          var seed = col * 7 + row * 13;
          var def = tl && tl[id];
          if (def) {
            addLight(ox + (col + 0.5 + (def.dx || 0)) * k, oy + (row + 0.5 + (def.dy || 0)) * k,
              def.r * k, def.color, def.i * flicker(now, seed, def.flicker));
            continue;
          }
          var glow = fg && !skip[id] && world.tileGlow[id];
          if (!glow) continue;
          var f = flicker(now, seed, glow.flicker !== undefined ? glow.flicker : 0.06);
          addLight(ox + (col + 0.5) * k, oy + (row + 0.5) * k, glow.radius * rad * k, glow.color, glow.alpha * gain * f);
        }
      }
    }

    // Hand-placed sources
    var lights = L.lights || [];
    for (var i = 0; i < lights.length; i++) {
      var s = lights[i];
      if (s.x < c0 || s.x > c1 || s.y < r0 || s.y > r1) continue;
      addLight(ox + s.x * k, oy + s.y * k, s.r * k, s.color, s.i * flicker(now, i + 1, s.flicker));
    }

    // A faint personal light keeps the pilot readable in the dark
    if (L.pilot && typeof BridgeCharacter !== 'undefined') {
      var p = BridgeCharacter.getRenderPos();
      addLight(ox + (p.x + 0.5) * k, oy + (p.y + 0.2) * k, L.pilot.r * k, L.pilot.color, L.pilot.i);
    }

    // Light map = ambient + lights, multiplied over the scene…
    lcx.globalCompositeOperation = 'source-over';
    lcx.fillStyle = 'rgb(' + amb[0] + ',' + amb[1] + ',' + amb[2] + ')';
    lcx.fillRect(0, 0, lw, lh);
    lcx.globalCompositeOperation = 'lighter';
    lcx.drawImage(gc, 0, 0);

    ctx.save();
    // Back empty (off-map) pixels with the page colour first — multiplying
    // onto transparent pixels would paint the light map itself there.
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(lc, 0, 0, lw, lh, 0, 0, lw * SCALE, lh * SCALE);
    // …then the lights alone are screened back on, so pools glow warm
    // instead of merely returning the art to its unlit colours.
    var bloom = L.bloom !== undefined ? L.bloom : 0.3;
    if (bloom > 0) {
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = bloom;
      ctx.drawImage(gc, 0, 0, lw, lh, 0, 0, lw * SCALE, lh * SCALE);
    }
    ctx.restore();
  }

  return { apply: apply };
})();
