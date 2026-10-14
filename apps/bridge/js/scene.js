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
 *                                    // ("mode": "pulse" — slow LED breathing)
 *     "actors": [ { "sheet": "npc-bartender", "x": 4, "y": 2,
 *                   "facing": "down", "pose": "sit" } ],
 *     "sky": [1, 0.6, 15, 3]          // optional: screen-tile rect behind the
 *                                    // render's transparent holes (windows)
 *   }
 *
 * Swappable decor: scene.json "layers" lists variants rendered in the room's
 * light (scenekit k.variant). setLayers(id, {slot: key|null}) composites the
 * chosen ones into the scene image and depth, so characters are occluded by
 * them like any other furniture.
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
      var sc = { id: id, meta: meta, imgs: {}, depth: null, ready: false,
                 baseImgs: {}, baseDepth: null, layers: [] };
      var pending = meta.states.length + 1;
      function done() {
        if (--pending === 0) {
          sc.ready = true;
          scenes[id] = sc;
          composite(sc);
          cb(sc);
        }
      }
      meta.states.forEach(function (s) {
        loadImage(base + s + '.png', function (img) { sc.baseImgs[s] = img; sc.imgs[s] = img; done(); });
      });
      loadImage(base + 'depth.png', function (img) {
        if (img) sc.baseDepth = sc.depth = decodeDepth(img, meta);
        done();
      });
      // Decor variants: a lit image per state + depth for each
      Object.keys(meta.layers || {}).forEach(function (slot) {
        Object.keys(meta.layers[slot]).forEach(function (key) {
          var L = { slot: slot, key: key, box: meta.layers[slot][key], imgs: {}, depth: null };
          sc.layers.push(L);
          var dir = base + 'layers/' + slot + '/' + key + '/';
          pending += meta.states.length + 1;
          meta.states.forEach(function (s) {
            loadImage(dir + s + '.png', function (img) { L.imgs[s] = img ? pixels(img) : null; done(); });
          });
          loadImage(dir + 'depth.png', function (img) {
            if (img) L.depth = decodeDepth(img, meta);
            done();
          });
        });
      });
    };
    xhr.onerror = function () { cb(null); };
    xhr.send();
  }

  function pixels(img) {
    var c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    var cx = c.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0);
    return cx.getImageData(0, 0, img.width, img.height).data;
  }

  // Which variant each slot shows, per scene id (set before or after load)
  var activeLayers = {};

  function setLayers(id, map) {
    activeLayers[id] = map || {};
    if (scenes[id] && scenes[id].ready) composite(scenes[id]);
  }

  // Bake the active variants into the scene's images and depth. Runs on load
  // and when the owned decor changes — never per frame.
  function composite(sc) {
    var want = activeLayers[sc.id] || {};
    var use = sc.layers.filter(function (L) { return want[L.slot] === L.key && L.depth; });
    if (!use.length) {
      sc.imgs = {};
      for (var k in sc.baseImgs) sc.imgs[k] = sc.baseImgs[k];
      sc.depth = sc.baseDepth;
      return;
    }
    var m = sc.meta, W = m.width;
    var depth = new Float32Array(sc.baseDepth);
    var masks = use.map(function (L) {
      var b = L.box, mask = new Uint8Array(b.w * b.h);
      for (var j = 0; j < b.h; j++) {
        for (var i = 0; i < b.w; i++) {
          var li = j * b.w + i, d = L.depth[li];
          if (d === Infinity) continue;
          var gi = (b.y + j) * W + b.x + i;
          if (d < depth[gi] + DEPTH_EPS) { mask[li] = 1; depth[gi] = d; }
        }
      }
      return mask;
    });
    m.states.forEach(function (s) {
      var c = document.createElement('canvas');
      c.width = m.width; c.height = m.height;
      var cx = c.getContext('2d');
      cx.drawImage(sc.baseImgs[s], 0, 0);
      use.forEach(function (L, n) {
        var px = L.imgs[s];
        if (!px) return;
        var b = L.box, id = cx.getImageData(b.x, b.y, b.w, b.h), d = id.data, mask = masks[n];
        for (var li = 0; li < mask.length; li++) {
          if (!mask[li]) continue;
          d[li * 4] = px[li * 4]; d[li * 4 + 1] = px[li * 4 + 1]; d[li * 4 + 2] = px[li * 4 + 2]; d[li * 4 + 3] = 255;
        }
        cx.putImageData(id, b.x, b.y);
      });
      sc.imgs[s] = c;
    });
    sc.depth = depth;
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
  function flickerAt(t, mode) {
    if (mode === 'pulse') return 0.5 + 0.5 * Math.sin(t / 900);   // slow LED breathing
    var v = 0.62 + 0.22 * Math.sin(t / 430) + 0.12 * Math.sin(t / 97 + 1.3) + 0.06 * Math.sin(t / 31 + 4.1);
    return Math.max(0, Math.min(1, v));
  }

  function drawBackground(ctx, sc, world, offX, offY, now) {
    var m = sc.meta;
    var x = offX - m.originX, y = offY - m.originY;
    var fl = world.scene && world.scene.flicker;
    if (fl && sc.imgs[fl.from] && sc.imgs[fl.to]) {
      ctx.drawImage(sc.imgs[fl.from], x, y);
      ctx.globalAlpha = flickerAt(now, fl.mode);
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
      a = m.tileLight[fl.from][r][c]; b = m.tileLight[fl.to][r][c]; f = flickerAt(now, fl.mode);
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
  function drawOccluded(ctx, sc, img, sx, sy, sw, sh, dx, dy, footRow, offX, offY, tint, shadow, op) {
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
    if (op) { ctx.save(); ctx.globalCompositeOperation = op; }
    ctx.drawImage(tmp, 0, 0, sw, sh, dx, dy, sw, sh);
    if (op) ctx.restore();
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

  // A decor layer's lit image as a canvas, with its box in scene pixels —
  // for drawing a variant on its own (the shuttle lifting off its pad).
  var layerCanvases = {};
  function layerImage(id, slot, key, state) {
    var sc = scenes[id];
    if (!sc || !sc.ready) return null;
    var L = sc.layers.filter(function (l) { return l.slot === slot && l.key === key; })[0];
    if (!L) return null;
    state = state || sc.meta.states[0];
    var ck = id + '/' + slot + '/' + key + '/' + state;
    if (!layerCanvases[ck] && L.imgs[state]) {
      var c = document.createElement('canvas');
      c.width = L.box.w; c.height = L.box.h;
      var cx = c.getContext('2d');
      var img = cx.createImageData(L.box.w, L.box.h);
      img.data.set(L.imgs[state]);
      for (var i = 0; i < L.depth.length; i++) if (L.depth[i] === Infinity) img.data[i * 4 + 3] = 0;
      cx.putImageData(img, 0, 0);
      layerCanvases[ck] = c;
    }
    return layerCanvases[ck] ? { canvas: layerCanvases[ck], box: L.box, meta: sc.meta } : null;
  }

  function getLayers(id) { return activeLayers[id] || {}; }

  return {
    load: load,
    get: get,
    setLayers: setLayers,
    getLayers: getLayers,
    layerImage: layerImage,
    drawBackground: drawBackground,
    drawOccluded: drawOccluded,
    tintAt: tintAt,
    actorDrawList: actorDrawList,
    flickerAt: flickerAt
  };
})();
