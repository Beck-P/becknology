/**
 * BridgeKeyItems — quest items you're given and give away, shown the way a Zelda game shows them.
 *
 * Alyssa found the quests hard to follow: you freed Beckolas's ribbon from the willow and nothing showed you had it,
 * and handing it back was just a line of text. So a quest can now have things in it (quests.json, per quest:
 * `items: { <id>: { name, text, to, icon } }`), and a clue can `get` one or `give` one:
 *
 *  - get: the moment the clue's found (and whatever it says has been read), the pilot turns to face you and holds
 *    the thing up over their head, light rays turning behind it, a little fanfare, and a card along the bottom:
 *    YOU GOT · the thing, big · what it is and where it goes. Space / E / a tap puts it away.
 *  - give: before the person you're giving it to says anything, the thing flies from your hands to them in an arc
 *    and bursts into sparkles, with a chime.
 *
 * What you're carrying isn't kept anywhere of its own: it's every item whose `get` clue you've found and whose `give`
 * clue you haven't (js/quests.js), so it can never fall out of step with the quest. The journal lists it under the
 * quest and in Next up (*Carrying*).
 *
 * Icons are drawn in code on the 16-unit grid (ICONS), like the pack's (js/items.js).
 */
var BridgeKeyItems = (function () {
  // ---- the icons --------------------------------------------------------------------------------------------------
  function px(ctx, x, y, u, c, rects) {
    ctx.fillStyle = c;
    for (var i = 0; i < rects.length; i++) ctx.fillRect(x + rects[i][0] * u, y + rects[i][1] * u, rects[i][2] * u, rects[i][3] * u);
  }
  var ICONS = {
    // Beckolas's favour: a bow of green silk worked with gold leaves, two tails (RIBBON, below)
    ribbon: function (ctx, x, y, u) { grid(ctx, x, y, u, RIBBON, { o: '#0e2412', G: '#2e7a3a', L: '#5ab060', d: '#1e5a28', Y: '#d0a040', y: '#f0d070' }); },
    // Mirelle's moonflower: a closed bud, white and lavender, glowing faintly, on a silver-green stem
    moonflower: function (ctx, x, y, u) {
      px(ctx, x, y, u, '#1a2a22', [[7, 8, 2, 7], [9, 10, 4, 3], [4, 1, 8, 9]]);
      px(ctx, x, y, u, '#4a7a52', [[7, 9, 2, 6], [9, 11, 3, 1]]);
      px(ctx, x, y, u, '#78b0a6', [[10, 11, 2, 1]]);
      px(ctx, x, y, u, '#f0f0f0', [[5, 2, 6, 6], [6, 8, 4, 1]]);
      px(ctx, x, y, u, '#c8a8f0', [[5, 5, 1, 3], [10, 5, 1, 3], [7, 2, 2, 1]]);
      px(ctx, x, y, u, '#8a6ab8', [[6, 7, 1, 1], [9, 7, 1, 1], [7, 8, 2, 1]]);
      px(ctx, x, y, u, '#a8e0d8', [[7, 4, 2, 2]]);                                            // the glow at its heart
      px(ctx, x, y, u, '#ffffff', [[6, 3, 1, 1]]);
    },
    // anything without its own art: a gold star
    // the Gloaming's stern lantern (Midnight, js/midnight.js): an iron cage, cracked glass, a cold green flame still in it
    lantern: function (ctx, x, y, u) { grid(ctx, x, y, u, LANTERN, { o: '#0a0e10', I: '#3a4048', i: '#5a6470', G: '#2a6a5a', g: '#7ad0c8', w: '#e0fff8' }); },
    star: function (ctx, x, y, u) {
      px(ctx, x, y, u, '#3a2a10', [[7, 1, 2, 14], [1, 6, 14, 3], [4, 4, 8, 8]]);
      px(ctx, x, y, u, '#d0a040', [[7, 2, 2, 12], [2, 7, 12, 1], [5, 5, 6, 6]]);
      px(ctx, x, y, u, '#f0d070', [[7, 3, 1, 4], [5, 5, 2, 2]]);
    }
  };
  // a picture as rows of letters (one a pixel, '.' clear), coloured by a key
  function grid(ctx, x, y, u, rows, key) {
    for (var j = 0; j < rows.length; j++) for (var i = 0; i < rows[j].length; i++) {
      var c = key[rows[j][i]];
      if (c) { ctx.fillStyle = c; ctx.fillRect(x + i * u, y + j * u, u, u); }
    }
  }
  var LANTERN = [
    '......oooo......',
    '.....oIiIo......',
    '......oIo.......',
    '....oooooooo....',
    '....oIiiiiIo....',
    '...oIGGGGGGIo...',
    '...oIGggggGIo...',
    '...oiGgwwgGio...',
    '...oiGgwwgGio...',
    '...oIGggggGIo...',
    '...oIGGgGGGIo...',
    '...oIGGGGGGIo...',
    '....oIiiiiIo....',
    '....oooooooo....',
    '.....oIIIIo.....',
    '......oooo......'
  ];
  var RIBBON = [
    '................',
    '.oo..........oo.',
    'oLLoo......ooLLo',
    'oLLGGo....oGGLLo',
    'oLGyGGo..oGGyGLo',
    'oGGGGGGooGGGGGGo',
    'oGGGdGoYYoGdGGGo',
    'oGGddGoYyoGddGGo',
    'oGddooooooooddGo',
    '.ooo.oGGoGGo.oo.',
    '....oGGo.oGGo...',
    '....oGyo.oyGo...',
    '...oGGo...oGGo..',
    '...oGdo...odGo..',
    '..oGGo.....oGGo.',
    '..ooo.......ooo.'
  ];
  function draw(icon, ctx, x, y, size) { (ICONS[icon] || ICONS.star)(ctx, x, y, size / 16); }
  var urls = {};
  function iconURL(icon, size) {                    // for the journal's HTML
    var k = icon + '@' + size;
    if (!urls[k]) {
      var c = document.createElement('canvas'); c.width = c.height = size;
      draw(icon, c.getContext('2d'), 0, 0, size);
      urls[k] = c.toDataURL();
    }
    return urls[k];
  }

  // ---- what you're carrying: got and not yet given (from the quests themselves) --------------------------------------
  function Q() { return typeof BridgeQuests !== 'undefined' && BridgeQuests.defs ? BridgeQuests : null; }
  function itemOf(quest, id) {
    var q = Q() && Q().def(quest), it = q && q.items && q.items[id];
    return it ? { quest: quest, id: id, name: it.name || id, text: it.text || '', to: it.to || '', icon: it.icon || id } : null;
  }
  function carried(onlyQuest) {
    var B = Q(); if (!B) return [];
    var defs = B.defs(), out = [];
    Object.keys(defs).forEach(function (qid) {
      if (onlyQuest && qid !== onlyQuest) return;
      var q = defs[qid]; if (!q.items) return;
      Object.keys(q.items).forEach(function (iid) {
        var got = q.clues.filter(function (c) { return c.get === iid; })[0], gave = q.clues.filter(function (c) { return c.give === iid; })[0];
        if (got && B.has(qid + '/' + got.id) && !(gave && B.has(qid + '/' + gave.id))) out.push(itemOf(qid, iid));
      });
    });
    return out;
  }

  // ---- holding it up: drawn into the world over the pilot's head (a '*' scene hook) ------------------------------------
  var hold = null, fly = null, burst = null;       // { icon, t0 } · { icon, from, to, t0, dur, done } · { x, y, t0 }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }
  function headAt() {                               // the native px just over the pilot's head
    var p = BridgeCharacter.getRenderPos();
    return { x: p.x + 0.5, y: p.y + 1 - 45 / 32 };  // tile units: the sheet's floor point is 45 px down a 48 px frame
  }
  function rays(ctx, cx, cy, now, n, r0, r1, a) {
    for (var i = 0; i < n; i++) {
      var ang = i / n * Math.PI * 2 + now / 1400;
      for (var r = r0; r < r1; r += 2) {
        ctx.fillStyle = 'rgba(255,226,140,' + (a * (1 - (r - r0) / (r1 - r0))).toFixed(3) + ')';
        ctx.fillRect(Math.round(cx + Math.cos(ang) * r), Math.round(cy + Math.sin(ang) * r), 1, 1);
      }
    }
  }
  function over(ctx, world, offX, offY, ts) {
    var now = performance.now();
    if (hold) {
      var h = headAt(), k = Math.min(1, (now - hold.t0) / 380), e = 1 - Math.pow(1 - k, 3);
      var cx = Math.round(offX + h.x * ts), cy = Math.round(offY + h.y * ts - 6 - 12 * e - 8);
      ctx.fillStyle = 'rgba(255,220,130,' + (0.18 * e).toFixed(3) + ')';                 // a soft glow behind it
      ctx.fillRect(cx - 11, cy - 9, 22, 18); ctx.fillRect(cx - 9, cy - 11, 18, 22);
      rays(ctx, cx, cy, now, 10, 10, 24, 0.55 * e);
      draw(hold.icon, ctx, cx - 8, cy - 8, 16);
      if (Math.floor(now / 160) % 3 === 0) { ctx.fillStyle = '#fff8d8'; ctx.fillRect(cx + 5, cy - 7, 1, 1); ctx.fillRect(cx - 6, cy + 5, 1, 1); }
    }
    if (fly) {
      var t = Math.min(1, (now - fly.t0) / fly.dur), s = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      var x = fly.from.x + (fly.to.x - fly.from.x) * s, y = fly.from.y + (fly.to.y - fly.from.y) * s - Math.sin(Math.PI * t) * 1.3;
      var fx = Math.round(offX + x * ts), fy = Math.round(offY + y * ts);
      for (var j = 1; j <= 4; j++) {                                                     // a little trail of light behind it
        var tt = Math.max(0, t - j * 0.05), ss = tt < 0.5 ? 2 * tt * tt : 1 - Math.pow(-2 * tt + 2, 2) / 2;
        var tx = fly.from.x + (fly.to.x - fly.from.x) * ss, ty = fly.from.y + (fly.to.y - fly.from.y) * ss - Math.sin(Math.PI * tt) * 1.3;
        ctx.fillStyle = 'rgba(255,226,140,' + (0.5 - j * 0.1).toFixed(2) + ')';
        ctx.fillRect(Math.round(offX + tx * ts) - 1, Math.round(offY + ty * ts) - 1, 2, 2);
      }
      draw(fly.icon, ctx, fx - 8, fy - 8, 16);
      if (t >= 1) { burst = { x: fly.to.x, y: fly.to.y, t0: now }; var d = fly.done; fly = null; sfx('give'); setTimeout(d, 260); }
    }
    if (burst) {
      var bk = (now - burst.t0) / 650;
      if (bk >= 1) burst = null;
      else {
        var bx = offX + burst.x * ts, by = offY + burst.y * ts;
        for (var i = 0; i < 14; i++) {
          var a = i / 14 * Math.PI * 2, r = 4 + bk * 20;
          ctx.fillStyle = 'rgba(' + (i % 2 ? '255,230,150' : '200,250,230') + ',' + (1 - bk).toFixed(2) + ')';
          ctx.fillRect(Math.round(bx + Math.cos(a) * r), Math.round(by + Math.sin(a) * r * 0.8), 2, 2);
        }
      }
    }
  }
  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('*', { over: over });

  // ---- you got it: the moment, once nothing else is on screen -------------------------------------------------------------
  var queue = [], card = null, waiting = false;
  function busy() {
    return !!(card || fly || document.querySelector('.world-dialog') || document.getElementById('fish-reveal') ||
      (typeof BridgeInventory !== 'undefined' && BridgeInventory.isMenuOpen && BridgeInventory.isMenuOpen()));
  }
  function got(clue) {
    var it = itemOf(clue.quest, clue.get);
    if (!it) return;
    queue.push(it);
    setTimeout(pump, 120);                          // after whatever the clue opens (its words, a conversation) is up
  }
  function pump() {
    if (waiting || !queue.length) return;
    if (busy()) { waiting = true; setTimeout(function () { waiting = false; pump(); }, 250); return; }
    show(queue.shift());
  }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function touch() { return typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches; }
  function show(it) {
    if (typeof BridgeControls !== 'undefined' && BridgeControls.disable) BridgeControls.disable();
    if (typeof BridgeCharacter !== 'undefined' && BridgeCharacter.setFacing) BridgeCharacter.setFacing('down');   // to face you, holding it up
    hold = { icon: it.icon, t0: performance.now() };
    document.documentElement.classList.add('item-get');           // (the prompt pill stays out of the way)
    sfx('itemget');
    card = document.createElement('div');
    card.id = 'item-get';
    card.innerHTML = '<div class="ig-card"><canvas class="ig-art" width="96" height="96"></canvas><div class="ig-body">' +
      '<div class="ig-kicker">You got</div><div class="ig-name">' + esc(it.name) + '</div>' +
      (it.text ? '<div class="ig-text">' + esc(it.text) + '</div>' : '') +
      '<div class="ig-go">' + (touch() ? 'Tap to carry on' : 'Space · carry on') + '</div></div></div>';
    var cv = card.querySelector('.ig-art'), cx = cv.getContext('2d');
    cx.imageSmoothingEnabled = false;
    draw(it.icon, cx, 0, 0, 96);
    var c0 = card, ready = performance.now() + 900;
    setTimeout(function () { if (card === c0) c0.classList.add('ig-ready'); }, 900);
    function put(e) {
      if (performance.now() < ready) return;
      if (e) { e.preventDefault(); e.stopPropagation(); }
      done();
    }
    c0.onKey = function (e) {
      if (!/^( |Enter|e|E|Escape)$/.test(e.key)) return;
      e.preventDefault(); e.stopPropagation();
      put();
    };
    document.addEventListener('keydown', c0.onKey, true);
    card.addEventListener('pointerdown', put);
    document.body.appendChild(card);
    // (it's a sticky moment: it waits for you, but never forever)
    c0.timer = setTimeout(function () { if (card === c0) done(); }, 9000);
  }
  function done() {
    var c = card; card = null; hold = null;
    document.documentElement.classList.remove('item-get');
    if (!c) return;
    clearTimeout(c.timer);
    document.removeEventListener('keydown', c.onKey, true);
    c.classList.add('ig-out');
    setTimeout(function () { if (c.parentNode) c.parentNode.removeChild(c); }, 260);
    if (typeof BridgeControls !== 'undefined' && BridgeControls.enable) BridgeControls.enable();
    setTimeout(pump, 300);
  }

  // ---- you give it: from your hands to theirs, then they speak --------------------------------------------------------------
  function give(clue, inter, then) {
    var it = itemOf(clue.quest, clue.give);
    if (!it || typeof BridgeCharacter === 'undefined' || !BridgeWorld.getView) { then(); return; }
    if (typeof BridgeControls !== 'undefined' && BridgeControls.disable) BridgeControls.disable();
    document.documentElement.classList.add('item-get');
    var h = headAt(), to = { x: (inter.x || 0) + 0.5, y: (inter.y || 0) + 0.1 };   // to about their hands
    fly = { icon: it.icon, from: { x: h.x, y: h.y - 0.3 }, to: to, t0: performance.now(), dur: 720, done: function () {
      if (typeof BridgeControls !== 'undefined' && BridgeControls.enable) BridgeControls.enable();
      if (!card) document.documentElement.classList.remove('item-get');
      if (typeof BridgeQuests !== 'undefined' && BridgeQuests.note) BridgeQuests.note('Given', it.name, it.to ? 'to ' + it.to : '');
      then();
    } };
  }

  return { got: got, give: give, carried: carried, iconURL: iconURL, draw: draw, ICONS: ICONS,
           _busy: function () { return !!(card || fly || hold); } };
})();
