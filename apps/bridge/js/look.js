/**
 * BridgeLook — how the pilot looks: build, hair, beard, helmet, skin and hair colour.
 *
 * The pilot sheets (tools/bridge-art/pilots.sh → assets/characters/pilots/) are rendered once per
 * suit × build × head, where a head is the helmet or a hairstyle with or without a beard:
 *   pilot[-sit|-ski|-climb][-<style>]-<a|b>-<head>.png
 * Suit, skin and hair aren't baked in. They're drawn in KEY colours (characters.py KEYS) and swapped
 * here for the player's picks as a sheet loads, along with the darker line-work copies sprites_post.py
 * makes of them. So any skin tone or hair colour costs nothing in files.
 *
 * Saved in localStorage `bridge_look`. With nothing saved the pilot keeps the helmet on (how
 * everyone looked before this existed); the new-pilot screen starts bare-headed.
 *
 *   BridgeLook.get() / set(patch) / onChange(fn)
 *   BridgeLook.code(look) / parse(code)             a look as a short string, for sheet keys
 *   BridgeLook.sheet(mode, style, colour, look)     { img, ready }, img a recoloured canvas once ready
 *   BridgeLook.drawPreview(canvas, t, style, colour, look)
 *   BridgeLook.editor(el, { look, onChange })        the picker rows (new pilot screen, wardrobe)
 *   BridgeLook.face(canvas, seed, style, colour, wild)  someone you hire: their portrait, drawn from their name
 *   BridgeLook.portrait(canvas, path, opts)          any portrait (assets/portraits/, tools/bridge-art/portraits.py)
 *   BridgeLook.npcFace(canvas, sheet, opts)           an NPC's portrait from their sheet's name
 *   BridgeLook.pilotFace(canvas, key, seed)          another pilot's, from their character key (js/character.js)
 */
var BridgeLook = (function () {
  var STORE = 'bridge_look';
  var DIR = '/bridge/assets/characters/pilots/';

  // ---- the key colours (keep in step with KEYS in tools/bridge-art/characters.py) ---------------------
  var KEYS = {
    suit:   ['#200070', '#3000b0', '#4000f0'],
    suitdk: ['#100038', '#180058', '#200078'],
    arm:    ['#003870', '#0050b0', '#0068f0'],
    skin:   ['#700020', '#b00030', '#f00040'],
    hair:   ['#007020', '#00b030', '#00f040']
  };
  var OUTLINE = [11, 10, 24];           // sprites_post.py OUTLINE: line work is half this, half the colour

  // suit colours: dark, mid, light (characters.py SUITS); the darker trim and the sleeves are mixed from them
  var SUITS = {
    purple: ['#6048a0', '#a078dc', '#c0a8ee'],
    cyan:   ['#388890', '#5cc8d0', '#8ce0e8'],
    red:    ['#903838', '#d06060', '#e89090'],
    green:  ['#387838', '#60b060', '#90d090'],
    gold:   ['#887028', '#c8a840', '#e0c870'],
    white:  ['#909090', '#d0d0d0', '#f0f0f0']
  };

  // ---- the choices -------------------------------------------------------------------------------------
  var BODIES = [['a', 'Broad'], ['b', 'Slight']];
  var HAIRS = [['short', 'Short'], ['long', 'Long'], ['ponytail', 'Ponytail'], ['bun', 'Bun'],
               ['curly', 'Curls'], ['mohawk', 'Mohawk'], ['bald', 'Shaved']];
  var SKINS = [
    ['porcelain', ['#b48468', '#ecc0a0', '#fcdcc4']],
    ['fair',      ['#9a6a4e', '#d8a07a', '#f0c49c']],
    ['tan',       ['#7a4e36', '#b0784e', '#cc9468']],
    ['olive',     ['#6e5232', '#a8804e', '#c49c68']],
    ['brown',     ['#5a341e', '#8a5434', '#a86c46']],
    ['deep',      ['#3e2418', '#6a3e28', '#8a563a']]
  ];
  var HAIR_COLOURS = [
    ['black',     ['#141010', '#241c1a', '#362a26']],
    ['darkbrown', ['#2a1a10', '#4a2e1a', '#6a4428']],
    ['brown',     ['#5a3a1a', '#8a5a2a', '#aa7a42']],
    ['auburn',    ['#6a2a14', '#9a4422', '#c06030']],
    ['ginger',    ['#8a3a10', '#b85a1a', '#d87a2a']],
    ['blonde',    ['#a8843a', '#d8b058', '#f0d080']],
    ['platinum',  ['#a8a8a0', '#d8d8cc', '#f4f4ea']],
    ['grey',      ['#6a6a70', '#a0a0a8', '#c8c8d0']],
    ['pink',      ['#c06080', '#e080a0', '#f0a8c0']],
    ['teal',      ['#1a6a70', '#30b0b8', '#60e0e8']],
    ['violet',    ['#4a2a7a', '#7048b0', '#9a70d8']]
  ];
  function table(list) { var o = {}; list.forEach(function (e) { o[e[0]] = e[1]; }); return o; }
  var SKIN = table(SKINS), HAIR_COLOUR = table(HAIR_COLOURS), BODY = table(BODIES), HAIR = table(HAIRS);

  var DEFAULT = { body: 'a', hair: 'short', beard: false, helmet: true, skin: 'fair', hairColour: 'darkbrown' };

  // any look made safe: unknown values fall back to the default
  function clean(l) {
    l = l || {};
    return {
      body: BODY[l.body] ? l.body : DEFAULT.body,
      hair: HAIR[l.hair] ? l.hair : DEFAULT.hair,
      beard: !!l.beard,
      helmet: l.helmet === undefined ? DEFAULT.helmet : !!l.helmet,
      skin: SKIN[l.skin] ? l.skin : DEFAULT.skin,
      hairColour: HAIR_COLOUR[l.hairColour] ? l.hairColour : DEFAULT.hairColour
    };
  }

  var state = (function () {
    try { return clean(JSON.parse(localStorage.getItem(STORE) || 'null')); } catch (e) { return clean(null); }
  })();
  var listeners = [];
  function get() { return clean(state); }
  function set(patch) {
    var next = {}, k;
    for (k in state) next[k] = state[k];
    for (k in patch || {}) next[k] = patch[k];
    state = clean(next);
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* private mode */ }
    listeners.forEach(function (fn) { try { fn(get()); } catch (e) { /* a listener's problem */ } });
  }
  function onChange(fn) { listeners.push(fn); }

  // a look as a short string, so a sheet key names everything that decides its pixels
  function code(l) {
    l = clean(l);
    return [l.body, l.hair, l.beard ? 1 : 0, l.helmet ? 1 : 0, l.skin, l.hairColour].join('.');
  }
  function parse(c) {
    var p = String(c || '').split('.');
    return clean({ body: p[0], hair: p[1], beard: p[2] === '1', helmet: p[3] === '1', skin: p[4], hairColour: p[5] });
  }
  function head(l) { return l.helmet ? 'helmet' : l.hair + (l.beard ? '-beard' : ''); }

  // ---- recolouring -------------------------------------------------------------------------------------
  function hex(h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function toHex(c) { return '#' + c.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join(''); }
  function mix(a, b, t) {                        // characters.py mix(): a toward b by t, per channel
    var A = hex(a), B = hex(b);
    return toHex(A.map(function (v, i) { return Math.round(v * (1 - t) + B[i] * t); }));
  }
  function lineOf(c) { return [(c[0] + OUTLINE[0]) >> 1, (c[1] + OUTLINE[1]) >> 1, (c[2] + OUTLINE[2]) >> 1]; }
  function int(c) { return (c[0] << 16) | (c[1] << 8) | c[2]; }

  // what each key tone becomes for this suit colour and look (the suit's mixes as characters.py made them)
  function tones(colour, l) {
    var s = SUITS[colour] || SUITS.purple;
    return {
      suit: s,
      suitdk: [mix(s[0], '#000000', 0.25), s[0], mix(s[0], s[1], 0.5)],
      arm: [mix(s[0], '#000000', 0.12), mix(s[1], s[0], 0.3), mix(s[2], s[1], 0.35)],
      skin: SKIN[l.skin],
      hair: HAIR_COLOUR[l.hairColour]
    };
  }
  function palette(colour, l) {
    var to = tones(colour, l), map = {};
    Object.keys(KEYS).forEach(function (k) {
      for (var i = 0; i < 3; i++) {
        var from = hex(KEYS[k][i]), into = hex(to[k][i]);
        map[int(from)] = into;
        map[int(lineOf(from))] = lineOf(into);
      }
    });
    return map;
  }
  function recolour(img, map) {
    var c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    var g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    var data = g.getImageData(0, 0, c.width, c.height), px = data.data;
    for (var i = 0; i < px.length; i += 4) {
      if (!px[i + 3]) continue;
      var to = map[(px[i] << 16) | (px[i + 1] << 8) | px[i + 2]];
      if (to) { px[i] = to[0]; px[i + 1] = to[1]; px[i + 2] = to[2]; }
    }
    g.putImageData(data, 0, 0);
    return c;
  }

  // one PNG can serve many looks (same build and head, other colours), so images are shared
  var images = {}, sheets = {};
  function image(src) {
    if (!images[src]) {
      var im = new Image(), entry = { img: im, ready: false, waiting: [] };
      im.onload = function () { entry.ready = true; entry.waiting.forEach(function (fn) { fn(); }); entry.waiting = []; };
      im.src = src;
      images[src] = entry;
    }
    return images[src];
  }
  function file(mode, style, l) {
    return DIR + 'pilot-' + (mode ? mode + '-' : '') + (style && style !== 'flight' ? style + '-' : '') +
      l.body + '-' + head(l) + '.png';
  }

  /** The pilot's sheet for a pose ('' standing, 'sit', 'ski', 'climb'), suit style and colour, and look. */
  function sheet(mode, style, colour, look) {
    var l = clean(look), src = file(mode, style, l), id = src + '|' + colour + '|' + code(l);
    if (sheets[id]) return sheets[id];
    var out = sheets[id] = { img: null, ready: false };
    var base = image(src);
    function paint() { out.img = recolour(base.img, palette(colour, l)); out.ready = true; }
    if (base.ready) paint(); else base.waiting.push(paint);
    return out;
  }

  // ---- faces for other people: the hands, staff and crew you hire (a look drawn from their name) -------------
  function hash01(t) { var h = 2166136261; for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100003) / 100003; }
  var NATURAL = HAIR_COLOURS.filter(function (c) { return ['pink', 'teal', 'violet'].indexOf(c[0]) < 0; });
  /** A look for someone, the same every time for the same seed (their name, or their hiring key); `wild` lets
   *  Arcadia's people have pink, teal or violet hair. */
  function lookFor(seed, wild) {
    var p = function (k, list) { return list[Math.floor(hash01(seed + ':' + k) * list.length)][0]; };
    var body = p('b', BODIES), hair = p('h', HAIRS);
    return { body: body, hair: hair, beard: body === 'a' && hair !== 'bun' && hash01(seed + ':d') < 0.35, helmet: false,
             skin: p('s', SKINS), hairColour: p('c', wild ? HAIR_COLOURS : NATURAL) };
  }
  /** Their face painted into a canvas: their portrait (pilots/…, dressed for the job and coloured as they are), or
   *  — no portrait file — the head and shoulders of their standing frame, once their sheet's loaded. */
  function face(canvas, seed, style, colour, wild) {
    if (!canvas) return null;
    var l = lookFor(seed, wild), st = style || 'flight', col = colour || 'gold';
    var path = 'pilots/' + (st !== 'flight' ? st + '-' : '') + l.body + '-' + head(l);
    return portrait(canvas, path, { map: portraitKeys(palette(col, l), seed, SKIN[l.skin]), key: col + '|' + code(l) + '|' + seed,
                                    fallback: function () { sheetFace(canvas, seed, st, col, wild); } });
  }
  function sheetFace(canvas, seed, style, colour, wild) {
    var sh = sheet('', style, colour, lookFor(seed, wild)), tries = 0;
    (function draw() {
      if (!sh.ready) { if (++tries < 60) setTimeout(draw, 80); return; }
      var g = canvas.getContext('2d');
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.imageSmoothingEnabled = false;
      g.drawImage(sh.img, 4, 2, 24, 24, 0, 0, canvas.width, canvas.height);
    })();
  }

  // ---- portraits: a face seen from the front, head and shoulders (tools/bridge-art/portraits.py) -----------------------
  // assets/portraits/<path>.png is a strip of square frames, one per expression (EXPRESSIONS). An NPC's (npc-baker) is
  // in its own colours; the crowd's (crowd/<body>) and the pilots' (pilots/[<style>-]<a|b>-<head>: anyone you hire) are
  // in key colours, swapped like their sheets, plus two keys of the portraits' own: the iris (a colour per person) and
  // the blush (mixed from their skin). Keep IRIS_KEY and BLUSH_KEY in step with portraits.py.
  var PORTRAITS = '/bridge/assets/portraits/';
  var EXPRESSIONS = ['neutral', 'happy', 'surprised', 'sad', 'blink'];
  var IRIS_KEY = ['#00284c', '#003c70', '#0058a0'], BLUSH_KEY = '#f05878';
  var IRISES = [['#2e1a10', '#5a3420', '#8a5a34'], ['#1a1210', '#33221a', '#523828'], ['#3a2a12', '#6a5226', '#9a8040'],
                ['#1a2e5a', '#2e5aa0', '#5a8ad0'], ['#1a3a24', '#2e6a3e', '#5a9a5a'], ['#2e3440', '#5a6474', '#8a96a6'],
                ['#2e1a10', '#5a3420', '#8a5a34'], ['#1a1210', '#33221a', '#523828']];     // brown and dark the likeliest
  /** Adds a portrait's own keys for someone to a recolour map: their iris (from seed) and blush (from their skin). */
  function portraitKeys(map, seed, skin) {
    var iris = IRISES[Math.floor(hash01('iris:' + seed) * IRISES.length)];
    for (var i = 0; i < 3; i++) map[int(hex(IRIS_KEY[i]))] = hex(iris[i]);
    if (skin) map[int(hex(BLUSH_KEY))] = hex(mix(skin[1], '#ff5a6e', 0.42));
    return map;
  }
  var pImages = {}, pColoured = {}, pKeys = [], pHalves = {};
  function portraitImage(path) {
    var e = pImages[path];
    if (!e) {
      e = pImages[path] = { img: new Image(), ready: false, failed: false, waiting: [] };
      var done = function () { var w = e.waiting; e.waiting = []; w.forEach(function (fn) { fn(); }); };
      e.img.onload = function () { e.ready = true; done(); };
      e.img.onerror = function () { e.failed = true; done(); };
      e.img.src = PORTRAITS + path + '.png';
    }
    return e;
  }
  function coloured(path, e, map, key) {             // the strip recoloured for someone (the last 60 kept)
    if (!map) return e.img;
    var id = path + '|' + key;
    if (!pColoured[id]) {
      pColoured[id] = recolour(e.img, map);
      pKeys.push(id);
      if (pKeys.length > 60) { var old = pKeys.shift(); delete pColoured[old]; delete pHalves[old]; }
    }
    return pColoured[id];
  }
  // a frame at half size for a small face (a list's 24 × 24): each pixel the average of four, the silhouette kept crisp
  function half(src, id, f, S) {
    var hs = pHalves[id] || (pHalves[id] = {});
    if (hs[f]) return hs[f];
    var t = document.createElement('canvas');
    t.width = S; t.height = S;
    var tg = t.getContext('2d');
    tg.drawImage(src, f * S, 0, S, S, 0, 0, S, S);
    var a = tg.getImageData(0, 0, S, S).data, H = S >> 1;
    var c = document.createElement('canvas');
    c.width = H; c.height = H;
    var cg = c.getContext('2d'), out = cg.createImageData(H, H), o = out.data;
    for (var y = 0; y < H; y++) for (var x = 0; x < H; x++) {
      var r = 0, g = 0, b = 0, al = 0;
      for (var j = 0; j < 4; j++) {
        var i = ((2 * y + (j >> 1)) * S + 2 * x + (j & 1)) * 4, w = a[i + 3];
        r += a[i] * w; g += a[i + 1] * w; b += a[i + 2] * w; al += w;
      }
      var q = (y * H + x) * 4;
      if (al >= 510) { o[q] = r / al; o[q + 1] = g / al; o[q + 2] = b / al; o[q + 3] = 255; }
    }
    cg.putImageData(out, 0, 0);
    return (hs[f] = c);
  }
  /** A portrait drawn into a canvas. A canvas the portrait's size (64) or a whole multiple of it shows it whole; a
   *  smaller one (a 24 × 24 face in a list) shows the head and shoulders at half size. path: under assets/portraits/,
   *  no '.png' ('npc-baker', 'crowd/man'). opts: map + key (key colours to swap, and a name for that recolouring),
   *  expr ('neutral' · 'happy' · 'surprised' · 'sad'), blink (now and then, while the canvas is on the page),
   *  fallback() (called when there's no portrait file). Returns a handle: set(expr) changes the face; ok is true once
   *  it's drawn, false if there's no portrait. */
  function portrait(canvas, path, opts) {
    opts = opts || {};
    var e = portraitImage(path), h = { ok: null, expr: opts.expr || 'neutral', set: function (x) { h.expr = x || 'neutral'; draw(h.expr); } };
    var src = null, id = path + '|' + (opts.key || '');
    function draw(name) {
      if (!src) return;
      var g = canvas.getContext('2d'), S = src.height, f = Math.max(0, EXPRESSIONS.indexOf(name));
      if (f * S >= src.width) f = 0;
      g.imageSmoothingEnabled = false;
      g.clearRect(0, 0, canvas.width, canvas.height);
      if (canvas.width >= S) {
        var k = Math.floor(Math.min(canvas.width, canvas.height) / S) || 1;
        g.drawImage(src, f * S, 0, S, S, (canvas.width - S * k) >> 1, (canvas.height - S * k) >> 1, S * k, S * k);
      } else {
        var hf = half(src, id, f, S), H = S >> 1;
        g.drawImage(hf, (H - canvas.width) >> 1, Math.max(0, Math.min(2, H - canvas.height)), canvas.width, canvas.height,
                    0, 0, canvas.width, canvas.height);
      }
    }
    function blink() {                                // now and then, for a moment, while it's on the page
      setTimeout(function () {
        if (!canvas.isConnected) return;
        if (h.expr !== 'happy') { draw('blink'); setTimeout(function () { draw(h.expr); }, 140); }
        blink();
      }, 2200 + Math.random() * 3800);
    }
    function ready() {
      if (e.failed || !e.img.naturalWidth) { h.ok = false; if (opts.fallback) opts.fallback(); return; }
      src = coloured(path, e, opts.map, opts.key || '');
      h.ok = true;
      draw(h.expr);
      if (opts.blink) blink();
    }
    if (e.ready || e.failed) ready(); else e.waiting.push(ready);
    return h;
  }
  /** A pilot's face from their character key ('[sit-|ski-|…][<style>-]<colour>@<look code>', js/character.js): another
   *  player you walk up to. seed picks their eyes' colour (their name). */
  function pilotFace(canvas, key, seed, opts) {
    key = String(key || '');
    var at = key.indexOf('@'), parts = (at < 0 ? key : key.slice(0, at)).split('-'), col = parts.pop();
    if (/^(sit|ski|climb|attack)$/.test(parts[0] || '')) parts.shift();
    var st = parts[0] || 'flight', l = at < 0 ? clean(null) : parse(key.slice(at + 1));
    if (!SUITS[col]) col = 'purple';
    var path = 'pilots/' + (st !== 'flight' ? st + '-' : '') + l.body + '-' + head(l);
    opts = opts || {};
    return portrait(canvas, path, { map: portraitKeys(palette(col, l), seed || '', SKIN[l.skin]), key: col + '|' + code(l) + '|' + seed,
                                    blink: opts.blink, fallback: function () {
      var sh = sheet('', st, col, l), tries = 0;
      (function draw() {
        if (!sh.ready) { if (++tries < 60) setTimeout(draw, 80); return; }
        var g = canvas.getContext('2d');
        g.clearRect(0, 0, canvas.width, canvas.height);
        g.imageSmoothingEnabled = false;
        g.drawImage(sh.img, 4, 2, 24, 24, 0, 0, canvas.width, canvas.height);
      })();
    } });
  }
  /** An NPC's face from their sheet's name (npc-baker): their portrait, else the head of the sheet's first frame. */
  function npcFace(canvas, sheetName, opts) {
    opts = opts || {};
    return portrait(canvas, sheetName, { expr: opts.expr, blink: opts.blink, fallback: opts.fallback || function () {
      var im = new Image();
      im.onload = function () {
        var g = canvas.getContext('2d');
        g.imageSmoothingEnabled = false;
        g.clearRect(0, 0, canvas.width, canvas.height);
        g.drawImage(im, 4, 2, 24, 24, 0, 0, canvas.width, canvas.height);
      };
      im.src = '/bridge/assets/characters/' + sheetName + '.png';
    } });
  }

  // ---- the preview: turning on the spot and walking in place ------------------------------------------
  function drawPreview(canvas, t, style, colour, look) {
    var g = canvas.getContext('2d');
    g.clearRect(0, 0, canvas.width, canvas.height);
    var sh = sheet('', style, colour, look);
    if (!sh.ready) return;
    var k = canvas.width / 32;
    var dir = Math.floor(t / 1600) % 4, walking = Math.floor(t / 800) % 2;
    var col = walking ? 4 + Math.floor(t / 110) % 8 : [0, 1, 2, 1][Math.floor(t / 340) % 4];
    g.imageSmoothingEnabled = false;
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.beginPath(); g.ellipse(16 * k, 45 * k, 9 * k, 2.7 * k, 0, 0, Math.PI * 2); g.fill();
    g.drawImage(sh.img, col * 32, dir * 48, 32, 48, 0, 0, 32 * k, 48 * k);
  }

  // ---- the picker ----------------------------------------------------------------------------------------
  // Rows of ◀ value ▶ for the choices and swatches for the colours. Click, or ↑/↓ to pick a row and
  // ←/→ to change it (editor.key(e.key) returns true when it used the key).
  var ROWS = [
    { key: 'body', label: 'BUILD', list: BODIES },
    { key: 'hair', label: 'HAIR', list: HAIRS },
    { key: 'beard', label: 'BEARD', list: [[false, 'None'], [true, 'Beard']] },
    { key: 'helmet', label: 'HELMET', list: [[false, 'Off'], [true, 'On']] },
    { key: 'skin', label: 'SKIN', swatch: SKINS },
    { key: 'hairColour', label: 'HAIR COLOUR', swatch: HAIR_COLOURS }
  ];
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function editor(el, opts) {
    opts = opts || {};
    var look = clean(opts.look || state), row = 0;
    el.classList.add('look-editor');

    function valueIndex(r) {
      var list = r.list || r.swatch;
      for (var i = 0; i < list.length; i++) if (list[i][0] === look[r.key]) return i;
      return 0;
    }
    function step(r, d) {
      var list = r.list || r.swatch, i = (valueIndex(r) + d + list.length) % list.length;
      choose(r.key, list[i][0]);
    }
    function choose(key, value) {
      look[key] = value;
      // picking something the helmet covers takes the helmet off, so you can see what you picked
      if (key === 'hair' || key === 'beard' || key === 'skin' || key === 'hairColour') look.helmet = false;
      look = clean(look);
      if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('blip');
      render();
      if (opts.onChange) opts.onChange(clean(look));
    }

    function render() {
      el.innerHTML = ROWS.map(function (r, ri) {
        var body;
        if (r.list) {
          body = '<button class="look-step" data-r="' + ri + '" data-d="-1" aria-label="previous">&#9664;</button>' +
            '<span class="look-value">' + esc(r.list[valueIndex(r)][1]) + '</span>' +
            '<button class="look-step" data-r="' + ri + '" data-d="1" aria-label="next">&#9654;</button>';
        } else {
          body = '<span class="look-swatches">' + r.swatch.map(function (s, si) {
            return '<button class="look-swatch' + (s[0] === look[r.key] ? ' on' : '') + '" data-r="' + ri + '" data-i="' + si +
              '" title="' + esc(s[0]) + '" style="background:' + s[1][1] + '"></button>';
          }).join('') + '</span>';
        }
        // a hidden helmet hides the hair, so dim what it covers
        var muted = look.helmet && (r.key === 'hair' || r.key === 'beard' || r.key === 'hairColour');
        return '<div class="look-row' + (ri === row ? ' active' : '') + (muted ? ' muted' : '') + '" data-r="' + ri + '">' +
          '<span class="look-label">' + r.label + '</span>' + body + '</div>';
      }).join('');
      el.querySelectorAll('.look-step').forEach(function (b) {
        b.addEventListener('click', function (e) {
          e.preventDefault(); e.stopPropagation();
          row = +b.getAttribute('data-r');
          step(ROWS[row], +b.getAttribute('data-d'));
        });
      });
      el.querySelectorAll('.look-swatch').forEach(function (b) {
        b.addEventListener('click', function (e) {
          e.preventDefault(); e.stopPropagation();
          row = +b.getAttribute('data-r');
          var r = ROWS[row];
          choose(r.key, r.swatch[+b.getAttribute('data-i')][0]);
        });
      });
    }

    function key(k) {
      if (k === 'ArrowUp' || k === 'w' || k === 'W') { row = (row + ROWS.length - 1) % ROWS.length; render(); return true; }
      if (k === 'ArrowDown' || k === 's' || k === 'S') { row = (row + 1) % ROWS.length; render(); return true; }
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') { step(ROWS[row], -1); return true; }
      if (k === 'ArrowRight' || k === 'd' || k === 'D') { step(ROWS[row], 1); return true; }
      return false;
    }

    render();
    return { key: key, look: function () { return clean(look); } };
  }

  return {
    get: get, set: set, onChange: onChange, code: code, parse: parse, clean: clean,
    sheet: sheet, drawPreview: drawPreview, editor: editor, face: face, lookFor: lookFor,
    portrait: portrait, portraitKeys: portraitKeys, npcFace: npcFace, pilotFace: pilotFace, EXPRESSIONS: EXPRESSIONS,
    SUITS: SUITS, SKINS: SKINS, HAIR_COLOURS: HAIR_COLOURS, HAIRS: HAIRS, BODIES: BODIES, DEFAULT: DEFAULT
  };
})();
