/**
 * Shared PNG sprite loader for bridge worlds.
 *
 * Multi-tile pixel-art building sprites: load the PNG, strip the
 * cream/white halo most image generators leave around the subject,
 * chunkify down to a low-res base so the result reads as the same
 * pixel density as the procedural drawers, then draw it anchored at a
 * specific tile within its footprint.
 *
 * Sized once at load via chunkWidth — each pixel of the chunked source
 * becomes ~3 screen pixels at our 3× render scale.
 */
(function () {
  var spriteCache = {};

  function load(key, path, chunkWidth) {
    if (spriteCache[key]) return spriteCache[key];
    var entry = { canvas: null, ready: false };
    spriteCache[key] = entry;
    var img = new Image();
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

  function draw(ctx, x, y, ts, key, tilesW, tilesH, anchorOffsetX) {
    var s = spriteCache[key];
    if (!s || !s.ready) return;
    var areaW = ts * tilesW;
    var areaH = ts * tilesH;
    var destX = x - anchorOffsetX * ts;
    var destY = y + ts - areaH;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(s.canvas, destX, destY, areaW, areaH);
  }

  window.BridgeSprites = { load: load, draw: draw };
})();
