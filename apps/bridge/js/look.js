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
    sheet: sheet, drawPreview: drawPreview, editor: editor,
    SUITS: SUITS, SKINS: SKINS, HAIR_COLOURS: HAIR_COLOURS, HAIRS: HAIRS, BODIES: BODIES, DEFAULT: DEFAULT
  };
})();
