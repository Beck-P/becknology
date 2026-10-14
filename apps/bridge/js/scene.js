/**
 * BridgeScene — pre-rendered Blender scenes with per-pixel depth.
 *
 * A world whose JSON has a "scene" block is drawn from a Blender render
 * (tools/bridge-art/scenes/*) instead of tiles:
 *
 *   assets/scenes/<id>/scene.json   size, origin, depth range, per-tile light
 *   assets/scenes/<id>/<state>.png  the render, one per light state
 *   assets/scenes/<id>/depth.png    depth, 16 bits packed in R (high) + G (low)
 *
 * Characters are depth-tested against the render pixel by pixel, so they
 * pass in front of and behind furniture correctly with no hand-placed
 * layers. A character is treated as an upright billboard standing at its
 * foot row: a pixel h tiles above the feet has depth
 *   -footRow·cot(θ) - h·tan(θ)        (same convention as scenekit.py)
 * and is hidden wherever the scene is nearer than that.
 *
 * The world JSON's scene block:
 *   "scene": {
 *     "id": "lumar-tavern",
 *     "flicker": { "from": "dim", "to": "full" },   // cross-fade for firelight
 *     "actors": [ { "sheet": "npc-bartender", "x": 4, "y": 2,
 *                   "facing": "down", "pose": "sit" } ]
 *   }
 */
var BridgeScene = (function () {
  var NATIVE_TS = 32;
  var FRAME_W = 32, FRAME_H = 48;
  var DIR_ROW = { down: 0, right: 1, up: 2, left: 3 };
  var IDLE_SEQ = [0, 1, 2, 1];
  var DEPTH_EPS = 0.04;

  var scenes = {};
  var sheets = {};
  var tmp = document.createElement('canvas');
  var tctx = tmp.getContext('2d', { willReadFrequently: true });

  function loadImage(src, cb) {
    var img = new Image();
    img.onload = function () { cb(img); };
    img.onerror = function () { cb(null); };
    img.src = src;
    return img;
  }

  function load(id, cb) {
    if (scenes[id] && scenes[id].ready) { cb(scenes[id]); return; }
    var base = '/bridge/assets/scenes/' + id + '/';
    var xhr = new XMLHttpRequest();
    xhr.open('GET', base + 'scene.json');
    xhr.onload = function () {
      if (xhr.status !== 200) { cb(null); return; }
      var meta = JSON.parse(xhr.responseText);
      var sc = { id: id, meta: meta, imgs: {}, depth: null, ready: false };
      var pending = meta.states.length + 1;
      function done() {
        if (--pending === 0) {
          sc.ready = true;
          scenes[id] = sc;
          cb(sc);
        }
      }
      meta.states.forEach(function (s) {
        loadImage(base + s + '.png', function (img) { sc.imgs[s] = img; done(); });
      });
      loadImage(base + 'depth.png', function (img) {
        if (img) sc.depth = decodeDepth(img, meta);
        done();
      });
    };
    xhr.onerror = function () { cb(null); };
    xhr.send();
  }

  function decodeDepth(img, meta) {
    var c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    var cx = c.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0);
    var px = cx.getImageData(0, 0, img.width, img.height).data;
    var n = img.width * img.height;
    var out = new Float32Array(n);
    var span = meta.depthMax - meta.depthMin;
    for (var i = 0; i < n; i++) {
      var q = px[i * 4] * 256 + px[i * 4 + 1];
      out[i] = q >= 65535 ? Infinity : meta.depthMin + (q / 65534) * span;
    }
    return out;
  }

  function get(id) { return scenes[id] && scenes[id].ready ? scenes[id] : null; }

  // Firelight: slow breathing plus a quick flutter, 0..1
  function flickerAt(t) {
    var v = 0.62 + 0.22 * Math.sin(t / 430) + 0.12 * Math.sin(t / 97 + 1.3) + 0.06 * Math.sin(t / 31 + 4.1);
    return Math.max(0, Math.min(1, v));
  }

  function drawBackground(ctx, sc, world, offX, offY, now) {
    var m = sc.meta;
    var x = offX - m.originX, y = offY - m.originY;
    var fl = world.scene && world.scene.flicker;
    if (fl && sc.imgs[fl.from] && sc.imgs[fl.to]) {
      ctx.drawImage(sc.imgs[fl.from], x, y);
      ctx.globalAlpha = flickerAt(now);
      ctx.drawImage(sc.imgs[fl.to], x, y);
      ctx.globalAlpha = 1;
    } else {
      ctx.drawImage(sc.imgs[m.states[0]], x, y);
    }
  }

  // Light falling on a character standing at (col, row), as a CSS colour
  // used to multiply its sprite. Blends the light states like the flicker.
  function tintAt(sc, world, col, row, now) {
    var m = sc.meta;
    var c = Math.max(0, Math.min(m.tileLight[m.states[0]][0].length - 1, Math.round(col)));
    var r = Math.max(0, Math.min(m.tileLight[m.states[0]].length - 1, Math.round(row)));
    var fl = world.scene && world.scene.flicker;
    var a, b, f = 1;
    if (fl && m.tileLight[fl.from] && m.tileLight[fl.to]) {
      a = m.tileLight[fl.from][r][c]; b = m.tileLight[fl.to][r][c]; f = flickerAt(now);
    } else {
      a = b = m.tileLight[m.states[0]][r][c];
    }
    function ch(i) { return Math.round(255 * Math.min(1, a[i] + (b[i] - a[i]) * f)); }
    return 'rgb(' + ch(0) + ',' + ch(1) + ',' + ch(2) + ')';
  }

  /**
   * Draw a sprite frame with the scene in front of it masked out.
   * footRow: the row (tile units, fractional) where the figure meets the
   * floor; its feet are drawn at screen y = offY + footRow·ts.
   */
  function drawOccluded(ctx, sc, img, sx, sy, sw, sh, dx, dy, footRow, offX, offY, tint, shadow) {
    if (tmp.width < sw || tmp.height < sh) { tmp.width = Math.max(tmp.width, sw); tmp.height = Math.max(tmp.height, sh); }
    tctx.setTransform(1, 0, 0, 1, 0, 0);
    tctx.globalCompositeOperation = 'source-over';
    tctx.globalAlpha = 1;
    tctx.imageSmoothingEnabled = false;
    tctx.clearRect(0, 0, sw, sh);
    if (shadow) {
      tctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      tctx.beginPath();
      tctx.ellipse(shadow.x - dx, shadow.y - dy, shadow.rx, shadow.ry, 0, 0, Math.PI * 2);
      tctx.fill();
    }
    tctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    if (tint) {
      tctx.globalCompositeOperation = 'multiply';
      tctx.fillStyle = tint;
      tctx.fillRect(0, 0, sw, sh);
      tctx.globalCompositeOperation = 'destination-in';
      tctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      if (shadow) {   // keep the shadow, which the sprite mask just cut away
        tctx.globalCompositeOperation = 'destination-over';
        tctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        tctx.beginPath();
        tctx.ellipse(shadow.x - dx, shadow.y - dy, shadow.rx, shadow.ry, 0, 0, Math.PI * 2);
        tctx.fill();
      }
      tctx.globalCompositeOperation = 'source-over';
    }
    var m = sc.meta;
    var data = tctx.getImageData(0, 0, sw, sh);
    var d = data.data;
    var left = offX - m.originX, top = offY - m.originY;
    var th = (m.theta || 45) * Math.PI / 180;
    var cot = Math.cos(th) / Math.sin(th), tan = Math.tan(th);
    var depth = sc.depth, W = m.width, H = m.height;
    for (var j = 0; j < sh; j++) {
      var Y = dy + j;
      var srow = (Y - offY) / NATIVE_TS;
      var above = footRow - srow;
      if (above < 0) above = 0;
      var cd = -footRow * cot - above * tan;
      var yy = Y - top;
      if (yy < 0 || yy >= H) continue;
      var rowBase = yy * W;
      for (var i = 0; i < sw; i++) {
        var k = (j * sw + i) * 4 + 3;
        if (!d[k]) continue;
        var xx = dx + i - left;
        if (xx < 0 || xx >= W) continue;
        if (depth[rowBase + xx] < cd - DEPTH_EPS) d[k] = 0;
      }
    }
    tctx.putImageData(data, 0, 0);
    ctx.drawImage(tmp, 0, 0, sw, sh, dx, dy, sw, sh);
  }

  function getSheet(name) {
    if (!sheets[name]) {
      var e = { img: null, ready: false };
      sheets[name] = e;
      loadImage('/bridge/assets/characters/' + name + '.png', function (img) { e.img = img; e.ready = !!img; });
    }
    return sheets[name];
  }

  // NPCs placed by the world JSON: idle animation, depth-tested, lit.
  function actorDrawList(sc, world, offX, offY, ts, now) {
    var list = [];
    var actors = (world.scene && world.scene.actors) || [];
    for (var i = 0; i < actors.length; i++) {
      var a = actors[i];
      var sh = getSheet(a.sheet);
      if (!sh.ready) continue;
      var footRow = a.y + (a.pose === 'sit' ? 0.55 : 0.9);
      list.push({
        footRow: footRow,
        draw: (function (a, sh, footRow) {
          return function (ctx) {
            var col = IDLE_SEQ[Math.floor((now + a.x * 137 + a.y * 71) / 360) % IDLE_SEQ.length];
            var row = DIR_ROW[a.facing] || 0;
            var cx = Math.round(offX + (a.x + 0.5) * ts);
            var footY = Math.round(offY + footRow * ts);
            var dx = cx - FRAME_W / 2, dy = footY - (FRAME_H - 3);
            drawOccluded(ctx, sc, sh.img, col * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H, dx, dy,
              footRow, offX, offY, tintAt(sc, world, a.x, a.y, now),
              a.pose === 'sit' ? null : { x: cx, y: footY, rx: 8, ry: 3 });
          };
        })(a, sh, footRow)
      });
    }
    return list;
  }

  return {
    load: load,
    get: get,
    drawBackground: drawBackground,
    drawOccluded: drawOccluded,
    tintAt: tintAt,
    actorDrawList: actorDrawList,
    flickerAt: flickerAt
  };
})();
