/**
 * Shared PNG sprite loader for bridge worlds.
 *
 * Native sprites (preferred): tools/bridge-art/native_sprites.py converts the
 * big painted PNGs into sprites at exactly their on-grid size (32 native px
 * per tile, aspect kept) and lists them in assets/native/manifest.js. Those
 * draw 1:1 into the world's native buffer, bottom-aligned on the anchor tile
 * and centred on the footprint, over a soft contact shadow.
 *
 * Legacy path: a PNG with no native version is loaded full-size, stripped
 * of the cream/white halo image generators leave, chunkified, and stretched
 * across its footprint.
 */
(function () {
  var NATIVE_TS = 32;
  var NATIVE = window.BridgeNativeSprites || {};
  var spriteCache = {};
  var nativeCache = {};

  // ---- Load tracking, so the world can rebuild its tile cache once art
  // that arrived late is ready ----
  var pending = 0;
  var readyCallbacks = [];
  function track(img) {
    pending++;
    function done() {
      pending--;
      if (pending === 0) {
        var cbs = readyCallbacks;
        readyCallbacks = [];
        for (var i = 0; i < cbs.length; i++) cbs[i]();
      }
    }
    img.addEventListener('load', done);
    img.addEventListener('error', done);
  }
  function whenReady(cb) {
    if (pending === 0) cb();
    else readyCallbacks.push(cb);
  }

  function hasNative(key) { return !!NATIVE[key]; }

  function loadNative(key) {
    if (nativeCache[key]) return nativeCache[key];
    var entry = { img: null, ready: false };
    nativeCache[key] = entry;
    var img = new Image();
    track(img);
    img.onload = function () { entry.img = img; entry.ready = true; };
    img.src = '/bridge/assets/native/' + key + '.png';
    return entry;
  }

  // Soft ambient-occlusion pool where a sprite meets the ground.
  function drawContactShadow(ctx, cx, baseY, footW, ts) {
    var r = footW * 0.55;
    ctx.save();
    ctx.translate(cx, baseY - ts * 0.1);
    ctx.scale(1, 0.3);
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, 'rgba(0, 0, 0, 0.42)');
    g.addColorStop(0.65, 'rgba(0, 0, 0, 0.22)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }

  // The rectangle a sprite's whole image occupies when drawn at an anchor
  // tile: centred on the footprint, with the art's lowest row resting on
  // the anchor tile's bottom edge. Overlays (smoke, window glow, spray)
  // position themselves as fractions of this rect, so they stay glued to
  // the art whatever its size. Legacy sprites fill the footprint.
  function area(key, x, y, ts, tilesW, tilesH, anchorOffsetX) {
    var left = x - anchorOffsetX * ts;
    var footW = tilesW * ts;
    var meta = NATIVE[key];
    if (!meta) return { x: left, y: y + ts - tilesH * ts, w: footW, h: tilesH * ts };
    var k = ts / NATIVE_TS;
    var dw = meta.w * k;
    var dh = meta.h * k;
    return {
      x: Math.round(left + (footW - dw) / 2),
      y: Math.round(y + ts - dh + (meta.padB || 0) * k),
      w: dw,
      h: dh
    };
  }

  // Draw a native sprite. Returns false when `key` has no native version so
  // callers can fall back to their legacy path.
  // opts.shadow === false skips the contact shadow.
  function drawNative(ctx, x, y, ts, key, tilesW, tilesH, anchorOffsetX, opts) {
    var meta = NATIVE[key];
    if (!meta) return false;
    var e = loadNative(key);
    if (!e.ready) return true;
    var r = area(key, x, y, ts, tilesW, tilesH, anchorOffsetX);
    if (!opts || opts.shadow !== false) {
      var left = x - anchorOffsetX * ts;
      drawContactShadow(ctx, left + tilesW * ts / 2, y + ts, Math.min(tilesW * ts, r.w), ts);
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(e.img, r.x, r.y, r.w, r.h);
    return true;
  }

  // Native sprite centred in an arbitrary box (used for the docked ship).
  function drawNativeCentered(ctx, key, cx, cy, ts) {
    var meta = NATIVE[key];
    if (!meta) return false;
    var e = loadNative(key);
    if (!e.ready) return true;
    var k = ts / NATIVE_TS;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(e.img, Math.round(cx - meta.w * k / 2), Math.round(cy - meta.h * k / 2), meta.w * k, meta.h * k);
    return true;
  }

  function load(key, path, chunkWidth) {
    if (NATIVE[key]) return loadNative(key);
    if (spriteCache[key]) return spriteCache[key];
    var entry = { canvas: null, ready: false };
    spriteCache[key] = entry;
    var img = new Image();
    track(img);
    img.onload = function () {
      var src = document.createElement('canvas');
      src.width = img.width;
      src.height = img.height;
      var sCtx = src.getContext('2d');
      sCtx.drawImage(img, 0, 0);
      try {
        var data = sCtx.getImageData(0, 0, src.width, src.height);
        var px = data.data;
        for (var i = 0; i < px.length; i += 4) {
          var r = px[i], g = px[i + 1], b = px[i + 2], a = px[i + 3];
          if (a === 0) continue;
          var maxC = Math.max(r, g, b);
          var minC = Math.min(r, g, b);
          var sat = maxC - minC;
          if (maxC > 230 && sat < 25) { px[i + 3] = 0; continue; }
          if (a < 230 && maxC > 200 && sat < 40) { px[i + 3] = 0; continue; }
          if (maxC > 215 && sat < 18 && (r + g + b) > 620) { px[i + 3] = 0; }
        }
        sCtx.putImageData(data, 0, 0);
      } catch (e) { /* CORS — skip */ }

      var CW = chunkWidth || 96;
      var aspect = src.width / src.height;
      var CH = Math.round(CW / aspect);
      var c = document.createElement('canvas');
      c.width = CW;
      c.height = CH;
      var cx = c.getContext('2d');
      cx.imageSmoothingEnabled = false;
      cx.drawImage(src, 0, 0, CW, CH);
      entry.canvas = c;
      entry.ready = true;
    };
    img.src = path;
    return entry;
  }

  function draw(ctx, x, y, ts, key, tilesW, tilesH, anchorOffsetX, opts) {
    if (drawNative(ctx, x, y, ts, key, tilesW, tilesH, anchorOffsetX, opts)) return;
    var s = spriteCache[key];
    if (!s || !s.ready) return;
    var areaW = ts * tilesW;
    var areaH = ts * tilesH;
    var destX = x - anchorOffsetX * ts;
    var destY = y + ts - areaH;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(s.canvas, destX, destY, areaW, areaH);
  }

  window.BridgeSprites = {
    load: load,
    draw: draw,
    hasNative: hasNative,
    loadNative: loadNative,
    drawNative: drawNative,
    drawNativeCentered: drawNativeCentered,
    area: area,
    drawContactShadow: drawContactShadow,
    whenReady: whenReady,
    pendingCount: function () { return pending; }
  };
})();
