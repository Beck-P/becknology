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
  var MAX_SCENES = 3;        // the place you're in and the last two: renders are big, and the browser
                             // starts drawing images in tiles (some coming out blank) when memory runs short
  var tmp = document.createElement('canvas');
  var tctx = tmp.getContext('2d', { willReadFrequently: true });

  function loadImage(src, cb) {
    var img = new Image();
    img.onload = function () { cb(img); };
    img.onerror = function () { cb(null); };
    img.src = src;
    return img;
  }

  // Forget the least recently drawn scenes beyond MAX_SCENES (never `keep`), so travelling
  // the worlds doesn't pile up decoded renders, depth maps and water canvases.
  function evict(keep) {
    var ids = Object.keys(scenes).filter(function (k) { return k !== keep && scenes[k].ready; });
    if (ids.length < MAX_SCENES) return;
    ids.sort(function (a, b) { return (scenes[a].used || 0) - (scenes[b].used || 0); });
    ids.slice(0, ids.length - (MAX_SCENES - 1)).forEach(function (k) {
      var sc = scenes[k];
      for (var s in sc.baseImgs) if (sc.baseImgs[s] && 'src' in sc.baseImgs[s]) sc.baseImgs[s].src = '';
      delete scenes[k];
      Object.keys(layerCanvases).forEach(function (ck) { if (ck.indexOf(k + '/') === 0) delete layerCanvases[ck]; });
      if (typeof BridgeSea !== 'undefined' && BridgeSea.forget) BridgeSea.forget(k);
    });
  }

  function load(id, cb) {
    if (scenes[id] && scenes[id].ready) { scenes[id].used = Date.now(); cb(scenes[id]); return; }
    var base = '/bridge/assets/scenes/' + id + '/';
    var xhr = new XMLHttpRequest();
    xhr.open('GET', base + 'scene.json?v=' + Date.now());     // always fresh; images are keyed to it by rev
    xhr.onload = function () {
      if (xhr.status !== 200) { cb(null); return; }
      var meta = JSON.parse(xhr.responseText);
      var sc = { id: id, meta: meta, imgs: {}, depth: null, ready: false,
                 baseImgs: {}, baseDepth: null, layers: [] };
      // images carry the scene's revision so a cached one never meets a newer layout
      var q = '?v=' + (meta.rev || Date.now());
      sc.q = q;
      var pending = meta.states.length + 1;
      function done() {
        if (--pending === 0) {
          sc.ready = true;
          sc.used = Date.now();
          scenes[id] = sc;
          evict(id);
          composite(sc);
          cb(sc);
        }
      }
      meta.states.forEach(function (s) {
        loadImage(base + s + '.png' + q, function (img) { sc.baseImgs[s] = img; sc.imgs[s] = img; done(); });
      });
      loadImage(base + 'depth.png' + q, function (img) {
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
            loadImage(dir + s + '.png' + q, function (img) { L.imgs[s] = img ? pixels(img) : null; done(); });
          });
          loadImage(dir + 'depth.png' + q, function (img) {
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

  // A colour grade baked into a scene's images (Verdance's seasons, js/seasons.js): fn(rgba, w, h) reworks
  // the pixels in place. Like the layers, it runs on load and when it changes — never per frame.
  var grades = {};
  function setGrade(id, fn, key) {
    var g = grades[id];
    if (g && g.key === key && fn) return;
    grades[id] = fn ? { fn: fn, key: key } : null;
    if (scenes[id] && scenes[id].ready) composite(scenes[id]);
  }

  // Bake the active variants into the scene's images and depth. Runs on load
  // and when the owned decor changes — never per frame.
  function composite(sc) {
    var want = activeLayers[sc.id] || {};
    var use = sc.layers.filter(function (L) { return want[L.slot] === L.key && L.depth; });
    var grade = grades[sc.id];
    if (!use.length && !grade) {
      sc.imgs = {};
      for (var k in sc.baseImgs) sc.imgs[k] = sc.baseImgs[k];
      sc.depth = sc.baseDepth;
      return;
    }
    var m = sc.meta, W = m.width;
    var depth = use.length ? new Float32Array(sc.baseDepth) : sc.baseDepth;
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
      if (grade) {
        var all = cx.getImageData(0, 0, m.width, m.height);
        grade.fn(all.data, m.width, m.height);
        cx.putImageData(all, 0, 0);
      }
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

  function get(id) {
    var sc = scenes[id];
    if (!sc || !sc.ready) return null;
    sc.used = Date.now();
    return sc;
  }

  // Firelight: slow breathing plus a quick flutter, 0..1
  function flickerAt(t, mode) {
    if (mode === 'pulse') return 0.5 + 0.5 * Math.sin(t / 900);   // slow LED breathing
    var v = 0.62 + 0.22 * Math.sin(t / 430) + 0.12 * Math.sin(t / 97 + 1.3) + 0.06 * Math.sin(t / 31 + 4.1);
    return Math.max(0, Math.min(1, v));
  }

  // The part [sx, sy, w, h] of a W x H image placed at (x, y) that lands on a cw x ch canvas.
  function visible(W, H, x, y, cw, ch) {
    var x0 = Math.max(0, -x), y0 = Math.max(0, -y);
    var x1 = Math.min(W, cw - x), y1 = Math.min(H, ch - y);
    return x1 > x0 && y1 > y0 ? [x0, y0, x1 - x0, y1 - y0] : null;
  }

  // ---- day and night (js/clock.js) -----------------------------------------------------------------------------------
  // A scene whose scene.json has a `cycle` ({day, dusk, night}: which light state is which) is drawn as a blend of
  // them by its planet's sky: dusk's weight is the sun crossing the horizon, day's the sun up, night the rest. Drawn
  // night first (with its firelight flicker), dusk over it, day over that — only the ones that show.
  var skyCache = {};
  function weights(sc) {
    var cy = sc.meta.cycle;
    if (!cy || typeof BridgeClock === 'undefined' || !sc.imgs[cy.day] || !sc.imgs[cy.night]) return null;   // its day art not loaded
    var t = Date.now(), key = sc.id + (sc.own ? '#own' : ''), c = skyCache[key];
    if (c && t - c.at < 250) return c.w;
    var w = BridgeClock.weights(sc.id, !!sc.imgs[cy.dusk]);
    w.cy = cy;
    skyCache[key] = { at: t, w: w };
    return w;
  }
  /** The light state that shows most right now (for things drawn from a single state). */
  function shownState(sc) {
    var w = weights(sc);
    if (!w) return sc.meta.states[0];
    return w.day >= w.dusk && w.day >= w.night ? w.cy.day : w.dusk >= w.night ? w.cy.dusk : w.cy.night;
  }

  // Only the part of the render on screen is drawn. Blending two whole large renders every
  // frame made the browser draw them in 256-px tiles once GPU memory ran short, and now and
  // then one tile came out blank: a dark rectangle over the room.
  function drawBackground(ctx, sc, world, offX, offY, now) {
    var m = sc.meta;
    var x = Math.round(offX - m.originX), y = Math.round(offY - m.originY);
    var v = visible(m.width, m.height, x, y, ctx.canvas.width, ctx.canvas.height);
    if (!v) return;
    function blit(img) { ctx.drawImage(img, v[0], v[1], v[2], v[3], x + v[0], y + v[1], v[2], v[3]); }
    var fl = world.scene && world.scene.flicker;
    var W = weights(sc);
    if (W && W.day > 0.995) { blit(sc.imgs[W.cy.day]); return; }
    if (fl && sc.imgs[fl.from] && sc.imgs[fl.to]) {
      blit(sc.imgs[fl.from]);
      ctx.globalAlpha = flickerAt(now, fl.mode);
      blit(sc.imgs[fl.to]);
      ctx.globalAlpha = 1;
    } else {
      blit(sc.imgs[W ? W.cy.night : m.states[0]]);
    }
    if (!W) return;
    var aD = W.dusk + W.night > 0 ? W.dusk / (W.dusk + W.night) : 0;   // dusk over night, then day over both
    if (aD > 0.003) { ctx.globalAlpha = aD; blit(sc.imgs[W.cy.dusk]); }
    if (W.day > 0.003) { ctx.globalAlpha = W.day; blit(sc.imgs[W.cy.day]); }
    ctx.globalAlpha = 1;
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
    var W = weights(sc), d = null, s = null, aD = 0;
    if (W) {
      if (W.cy.night !== m.states[0] && !(fl && m.tileLight[fl.from])) { a = b = m.tileLight[W.cy.night][r][c]; }
      d = m.tileLight[W.cy.dusk] && m.tileLight[W.cy.dusk][r][c];
      s = m.tileLight[W.cy.day] && m.tileLight[W.cy.day][r][c];
      aD = W.dusk + W.night > 0 ? W.dusk / (W.dusk + W.night) : 0;
    }
    function ch(i) {
      var v = a[i] + (b[i] - a[i]) * f;
      if (d) v += (d[i] - v) * aD;
      if (s) v += (s[i] - v) * W.day;
      return Math.round(255 * Math.min(1, v));
    }
    return 'rgb(' + ch(0) + ',' + ch(1) + ',' + ch(2) + ')';
  }

  /**
   * Draw a sprite frame with the scene in front of it masked out.
   * footRow: the row (tile units, fractional) where the figure meets the
   * floor; its feet are drawn at screen y = offY + footRow·ts.
   */
  // flat: what's drawn below the foot line lies on the ground in front (a weapon swung down, a pike thrust at you) —
  // tested against the floor at its own row, not hidden as if it were underground
  function drawOccluded(ctx, sc, img, sx, sy, sw, sh, dx, dy, footRow, offX, offY, tint, shadow, op, xray, flat) {
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
    // the render is blitted at whole pixels (blit); index its depth the same way, or a scene whose origin
    // isn't a whole pixel (a 1.2-tile margin: 38.4 px) reads depth from the wrong place
    var left = Math.round(offX - m.originX), top = Math.round(offY - m.originY);
    var th = (m.theta || 45) * Math.PI / 180;
    var cot = Math.cos(th) / Math.sin(th), tan = Math.tan(th);
    var depth = sc.depth, W = m.width, H = m.height;
    // xray 'auto' (people walking about): a silhouette only once most of them is hidden — behind a building or a
    // tall cabinet you'd lose yourself entirely; behind a counter your legs just go, as they should
    var auto = xray === 'auto', hid = auto ? [] : null, seen = 0;
    for (var j = 0; j < sh; j++) {
      var Y = dy + j;
      var srow = (Y - offY) / NATIVE_TS;
      var above = footRow - srow;
      if (above < 0) above = 0;
      var cd = flat && srow > footRow ? -srow * cot : -footRow * cot - above * tan;
      var yy = Y - top;
      if (yy < 0 || yy >= H) continue;
      var rowBase = yy * W;
      for (var i = 0; i < sw; i++) {
        var k = (j * sw + i) * 4 + 3;
        if (!d[k]) continue;
        var xx = dx + i - left;
        if (xx < 0 || xx >= W) continue;
        if (auto && d[k] > 120) seen++;
        if (depth[rowBase + xx] < cd - DEPTH_EPS) {
          if (auto) { if (d[k] > 120) hid.push(k); else d[k] = 0; }   // (the shadow under them is fainter: never ghosted)
          else if (xray) { d[k - 3] = 214; d[k - 2] = 226; d[k - 1] = 255; d[k] = 92; }   // hidden: a pale silhouette, so you can see yourself in the trees
          else d[k] = 0;
        }
      }
    }
    if (auto) {
      var ghost = seen && hid.length / seen > 0.55;
      for (var h = 0; h < hid.length; h++) {
        var q = hid[h];
        if (ghost) d[q] = 120; else d[q] = 0;              // seen through: themselves, faded (reads on snow as on stone)
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
  // People going about their day (assets/walkers.json, by world id): each
  // walks a route of tile points there and back, pausing at either end.
  // One with `talk` (the label people.json knows them by) can be talked to:
  // it carries a dialog interaction along with it, and stops and turns to
  // you while you're beside it (its clock held, so it walks on from there).
  var walkers = {}, held = {};
  fetch('/bridge/assets/walkers.json?v=' + Date.now()).then(function (r) { return r.json(); })
    .then(function (d) { walkers = d; }).catch(function () { walkers = {}; });

  function talkInteraction(wk, key, x, y) {
    return { x: x, y: y, type: 'dialog', label: wk.talk, prompt: 'PRESS E TO TALK', dialog: wk.say || '', walker: key };
  }
  function walkerPos(wk, i, now, wid) {
    var key = wid + '#' + i, h = held[key] || (held[key] = { shift: 0, at: null });
    var p = walkerAt(wk, (h.at != null ? h.at : now) - h.shift, i);
    if (!wk.talk || typeof BridgeCharacter === 'undefined' || !BridgeCharacter.getX) return p;
    var dx = BridgeCharacter.getX() - p.x, dy = BridgeCharacter.getY() - p.y, near = Math.abs(dx) < 1.6 && Math.abs(dy) < 1.6;
    if (near && h.at == null) h.at = now;
    else if (!near && h.at != null) { h.shift += now - h.at; h.at = null; }
    if (h.at != null) {
      p.moving = false;
      p.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    }
    return p;
  }
  // the interactions of the talking walkers in a world: carried along with them (live), or where their routes start
  // (anywhere else: the map's markers)
  function syncWalkers(world, wid, now) {
    var list = walkers[wid];
    if (!list || !world || !world.interactions) return;
    list.forEach(function (wk, i) {
      if (!wk.talk) return;
      var key = wid + '#' + i, it = null;
      for (var j = 0; j < world.interactions.length; j++) if (world.interactions[j].walker === key) { it = world.interactions[j]; break; }
      var p = walkerPos(wk, i, now, wid);
      if (!it) world.interactions.push(it = talkInteraction(wk, key, 0, 0));
      it.x = Math.round(p.x); it.y = Math.round(p.y);
    });
  }
  function walkerInteractions(wid) {
    return (walkers[wid] || []).map(function (wk, i) { return wk.talk ? talkInteraction(wk, wid + '#' + i, Math.round(wk.path[0][0]), Math.round(wk.path[0][1])) : null; })
      .filter(Boolean);
  }

  function walkerAt(wk, now, i) {
    var P = wk.path, L = 0, seg = [];
    for (var k = 0; k < P.length - 1; k++) { var d = Math.hypot(P[k + 1][0] - P[k][0], P[k + 1][1] - P[k][1]); seg.push(d); L += d; }
    var travel = L / (wk.speed || 1.1) * 1000, pause = wk.pause || 2500, period = 2 * (travel + pause);
    var t = ((now + i * 7919) % period + period) % period, fwd = t < travel + pause, tt = fwd ? t : t - travel - pause;
    var moving = tt >= pause, s = moving ? (tt - pause) / travel * L : 0;
    if (!fwd) s = L - s;
    var acc = 0;
    for (var j = 0; j < seg.length; j++) {
      if (s <= acc + seg[j] || j === seg.length - 1) {
        var f = seg[j] ? Math.min(1, (s - acc) / seg[j]) : 0;
        var dx = (P[j + 1][0] - P[j][0]) * (fwd ? 1 : -1), dy = (P[j + 1][1] - P[j][1]) * (fwd ? 1 : -1);
        var facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        if (!moving) facing = wk.rest || 'down';
        return { x: P[j][0] + (P[j + 1][0] - P[j][0]) * f, y: P[j][1] + (P[j + 1][1] - P[j][1]) * f, facing: facing,
                 moving: moving, dist: (fwd ? s : L - s) };
      }
      acc += seg[j];
    }
    return { x: P[0][0], y: P[0][1], facing: 'down', moving: false, dist: 0 };
  }

  function actorDrawList(sc, world, offX, offY, ts, now) {
    var list = [];
    var wid = typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId && BridgeWorld.getWorldId();
    syncWalkers(world, wid, now);
    (walkers[wid] || []).forEach(function (wk, i) {
      var sh = getSheet(wk.sheet);
      if (!sh.ready) return;
      var p = walkerPos(wk, i, now, wid), footRow = p.y + 0.9;
      list.push({ footRow: footRow, draw: function (ctx) {
        var col = p.moving ? 4 + Math.floor(p.dist / 0.3) % 8 : IDLE_SEQ[Math.floor((now + i * 137) / 360) % IDLE_SEQ.length];
        var cx = Math.round(offX + (p.x + 0.5) * ts), footY = Math.round(offY + footRow * ts);
        drawOccluded(ctx, sc, sh.img, col * FRAME_W, (DIR_ROW[p.facing] || 0) * FRAME_H, FRAME_W, FRAME_H, cx - FRAME_W / 2,
          footY - (FRAME_H - 3), footRow, offX, offY, tintAt(sc, world, Math.round(p.x), Math.round(p.y), now), { x: cx, y: footY, rx: 8, ry: 3 });
      } });
    });
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
            var row = DIR_ROW[a.facing] || 0, bob = 0;
            if (a.dance) {                              // dancers (Club Void): turn on the beat, step, bounce
              var b = typeof BridgeDance !== 'undefined' ? BridgeDance.beat() : now / 484, kk = Math.floor(b) + Math.round(a.x * 3 + a.y);
              row = [0, 1, 0, 3, 2, 1, 0, 3][kk % 8];
              col = 4 + (Math.floor(b * 2) + kk) % 8;
              bob = Math.round(Math.max(0, Math.sin((b % 1) * Math.PI)) * 2);
            }
            if (a.hitT != null) bob = Math.round(Math.max(0, 1 - (performance.now() - a.hitT) / 220) * 3);   // a dance-off partner hops on each step

            var cx = Math.round(offX + (a.x + 0.5) * ts);
            var footY = Math.round(offY + footRow * ts);
            var dx = cx - FRAME_W / 2, dy = footY - (FRAME_H - 3) - bob - Math.round((a.lift || 0) * Math.SQRT1_2 * ts);   // a height z shows z·cos 45° up
            drawOccluded(ctx, sc, sh.img, col * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H, dx, dy,
              footRow, offX, offY, tintAt(sc, world, a.light ? a.light[0] : a.x, a.light ? a.light[1] : a.y, now),   // light: lit as if on another tile (a throne in its own shadow)
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
    state = state || shownState(sc);
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
    setGrade: setGrade,
    getLayers: getLayers,
    layerImage: layerImage,
    drawBackground: drawBackground,
    drawOccluded: drawOccluded,
    restore: function () { for (var k in scenes) if (scenes[k].ready) composite(scenes[k]); },   // after the canvas was lost
    tintAt: tintAt,
    sky: function (id) { var sc = scenes[id]; return sc && sc.ready ? weights(sc) : null; },
    skyOf: function (sc) { return sc && sc.meta ? weights(sc) : null; },     // any scene object (the sloop's own islands)
    shownState: function (id) { var sc = scenes[id]; return sc && sc.ready ? shownState(sc) : null; },
    actorDrawList: actorDrawList,
    walkerInteractions: walkerInteractions,
    flickerAt: flickerAt,
    visible: visible
  };
})();
