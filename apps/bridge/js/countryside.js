/**
 * BridgeCountryside — the countryside by horse and buggy (Verdance; Beck: "lean into the countryside… small
 * countryside towns… nice countryside in between… the horse").
 *
 * Hobb's Livery on Station Road (js/village.js hands the yard over here) sells a horse — four coats, and you name it —
 * and, once you've a horse, a buggy: a green-and-gold gig with a red seat and room behind it for a load. Hobb gives you
 * a whistle with the horse (an item: use it from the pack or the hotbar). Outdoors on Verdance — the farm, Brambleford,
 * Station Road and the places along the lanes — the whistle brings your horse to you and you're up and riding, about
 * twice walking pace (the buggy a little less, but it carries a load: produce for the market, a crate of wine). Whistle
 * again, or press E on it, to get down; the horse waits where you left it until you whistle. Indoors, or off Verdance,
 * you're on your own feet and the horse goes back to the yard.
 *
 * Drawn from Blender sheets like the people (tools/bridge-art/horse_sprites.py: assets/characters/horse-<coat>.png and
 * buggy-<coat>.png, each with a `_front` sheet of what stands in front of a rider, and <what>-seat.json, where the rider
 * sits in each frame): the horse, then you on it (your seated frame, js/character.js setMount), then its front over you.
 * Hobb's own horses wander the paddock behind the yard. Kept in localStorage `bridge_country`.
 */
var BridgeCountryside = (function () {
  var KEY = 'bridge_country';
  var RIDE = /^verdance(-village|-east|-downs|-market|-hill|-mill)?$/;   // outdoors on Verdance
  var HORSE_COST = 900, BUGGY_COST = 700, LOAD = 80;
  var COATS = [{ id: 'bay', name: 'Bay' }, { id: 'chestnut', name: 'Chestnut' }, { id: 'grey', name: 'Grey' }, { id: 'black', name: 'Black' }];
  var SPEED = { horse: 1.9, buggy: 1.5 };
  var PADDOCK = { world: 'verdance-east', x0: 31, y0: 20, x1: 35, y1: 21, horses: [{ coat: 'bay', name: 'Clover' }, { coat: 'grey', name: 'Duchess' }] };
  var LIVERY_SPOT = { world: 'verdance-east', x: 30, y: 21 };

  var s = load();
  function load() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    d = d || {};
    return { horse: d.horse || null, buggy: !!d.buggy, riding: d.riding || null, at: d.at || null, hold: d.hold || {}, miles: d.miles || 0 };
  }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private mode */ } }
  function say(t, x) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(t, x); }
  function choose(spec) { if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.choose) BridgeInteractions.choose(spec); }
  function toast(a, b, c) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(a, b, c); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function count(id) { return typeof BridgeInventory !== 'undefined' ? BridgeInventory.getCount(id) : 0; }
  function item(id) { return typeof BridgeItems !== 'undefined' && BridgeItems.get(id); }
  function nameOf(id) { var i = item(id); return i ? i.name : id; }
  function here() { return typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId ? BridgeWorld.getWorldId() : null; }
  function charge(n, why) {
    return typeof BridgeProgression !== 'undefined' && BridgeProgression.wagerCoins
      ? BridgeProgression.wagerCoins(n, why).then(function (r) { return r || { ok: false }; }, function () { return { ok: false }; })
      : Promise.resolve({ ok: false, reason: 'offline' });
  }
  function why(r) { var x = r && r.reason; return x === 'offline' || x === 'no_client' || x === 'no_pilot' || x === 'error' ? 'NO WAY TO MOVE COINS RIGHT NOW.' : 'NOT ENOUGH COINS.'; }
  function horseName() { return s.horse ? s.horse.name : 'your horse'; }

  // ---- the sheets ------------------------------------------------------------------------------------------------------
  var sheets = {}, seats = {};
  function sheet(name) {
    if (!sheets[name]) { var im = new Image(); sheets[name] = { img: im, ready: false }; im.onload = function () { sheets[name].ready = true; }; im.src = '/bridge/assets/characters/' + name + '.png'; }
    return sheets[name];
  }
  ['horse', 'buggy'].forEach(function (w) {
    fetch('/bridge/assets/characters/' + w + '-seat.json').then(function (r) { return r.json(); }).then(function (d) { seats[w] = d; }).catch(function () { /* no seat file yet */ });
  });
  var ROW = { down: 0, right: 1, up: 2, left: 3 }, COLN = ['idle0', 'idle1', 'idle2', 'idle3', 'walk0', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5', 'walk6', 'walk7'];
  var IDLE = [0, 1, 2, 1, 0, 0, 3, 0];
  function frameCol(walking, stride, now, seed) {
    if (walking) return 4 + Math.floor(stride / (3.2 / 8)) % 8;
    return IDLE[Math.floor((now / 420) + (seed || 0)) % IDLE.length];
  }
  // A horse (and still more the buggy) reaches past the floor point toward you — the head riding down the screen, the
  // gig behind — so it's depth-tested from its own front edge, not the rider's feet (else the ground in front hides it).
  function depthRow(o, what) { var D = seats[what]; return o.footRow + (D ? (D.h - D.origin[1]) / o.ts * 0.9 : 0.4); }
  /** Draw a horse (or the buggy) at a floor point, with a rider fn between it and its front. */
  function drawMount(ctx, o, what, coat, facing, col, rider) {
    var D = seats[what], full = sheet(what + '-' + coat), front = sheet(what + '-' + coat + '_front');
    if (!D || !full.ready) return;
    var fw = D.w, fh = D.h, ox = D.origin[0], oy = D.origin[1], row = ROW[facing] || 0;
    var cx = Math.round(o.offX + (o.x + 0.5) * o.ts), footY = Math.round(o.offY + o.footRow * o.ts);
    var tint = BridgeScene.tintAt ? BridgeScene.tintAt(o.sc, o.world, Math.round(o.x), Math.round(o.y), o.now) : null;
    var dx = cx - ox, dy = footY - oy, depth = depthRow(o, what);
    BridgeScene.drawOccluded(ctx, o.sc, full.img, col * fw, row * fh, fw, fh, dx, dy, depth, o.offX, o.offY, tint,
      { x: cx, y: footY, rx: what === 'buggy' ? 22 : 15, ry: 4 }, null, 'auto');
    if (rider) {
      var st = D.seat[Object.keys(ROW)[row] + '_' + COLN[col] + '.png'] || [0, -20];
      rider(ctx, cx + st[0], footY + st[1], tint, depth);
      if (front.ready) BridgeScene.drawOccluded(ctx, o.sc, front.img, col * fw, row * fh, fw, fh, dx, dy, depth, o.offX, o.offY, tint, null, null, 'auto');
    }
  }

  // ---- riding ------------------------------------------------------------------------------------------------------------
  function mountFor(what) {
    return { speed: SPEED[what], what: what, item: function (o) {
      return { footRow: depthRow(o, what), draw: function (ctx) {
        drawMount(ctx, o, what, s.horse.coat, o.facing, frameCol(o.walking, o.stride, o.now), o.rider);
      } };
    } };
  }
  function up(what) {
    if (!s.horse || (what === 'buggy' && !s.buggy)) return;
    if (typeof BridgeCharacter === 'undefined' || !BridgeCharacter.setMount) return;
    s.riding = what; s.at = null; store();
    BridgeCharacter.setMount(mountFor(what));
    sfx('step');
    refresh();
  }
  function down(quiet) {
    if (!s.riding) return;
    var wid = here();
    s.riding = null;
    if (wid && RIDE.test(wid) && typeof BridgeCharacter !== 'undefined') {
      var f = BridgeCharacter.getFacing ? BridgeCharacter.getFacing() : 'down';
      s.at = { world: wid, x: BridgeCharacter.getX(), y: BridgeCharacter.getY(), facing: f };
    } else s.at = null;
    store();
    if (typeof BridgeCharacter !== 'undefined' && BridgeCharacter.setMount) BridgeCharacter.setMount(null);
    if (!quiet) sfx('step');
    refresh();
  }
  function riding() { return s.riding; }
  /** The whistle: your horse comes (and you're up), or you get down. */
  function whistle() {
    if (!s.horse) return say('WHISTLE', 'A BRASS WHISTLE. NOTHING COMES. YOU HAVEN\'T A HORSE YET - HOBB\'S LIVERY ON STATION ROAD HAS.');
    var wid = here();
    if (s.riding) return down();
    if (!wid || !RIDE.test(wid)) return say('WHISTLE', 'NO ROOM FOR A HORSE IN HERE. OUTDOORS ON VERDANCE, ' + horseName().toUpperCase() + ' COMES WHEN YOU WHISTLE.');
    if (!s.buggy) return up('horse');
    choose({ title: horseName(), text: 'UP ON ' + horseName().toUpperCase() + ', OR THE BUGGY?' + (holdCount() ? ' THE BUGGY HAS ' + holdCount() + ' THINGS IN THE BACK.' : ''),
             rows: [{ label: 'Ride', sub: 'quicker', pick: function () { up('horse'); } },
                    { label: 'Drive the buggy', sub: 'a load behind you', pick: function () { up('buggy'); } }] });
  }

  // ---- the buggy's load ------------------------------------------------------------------------------------------------
  function holdCount() { var n = 0; for (var k in s.hold) n += s.hold[k]; return n; }
  function loadable(id) { var it = item(id); return it && it.stackable && it.type !== 'tool' && it.type !== 'weapon'; }
  function hold() {
    var carried = typeof BridgeInventory !== 'undefined' && BridgeInventory.getAll ? BridgeInventory.getAll() : {};
    var ids = Object.keys(s.hold).filter(function (k) { return s.hold[k] > 0; });
    var pack = Object.keys(carried).filter(function (id) { return loadable(id) && carried[id] > 0; });
    choose({
      title: 'The buggy',
      text: 'CRATES STRAPPED BEHIND THE SEAT: ' + holdCount() + ' OF ' + LOAD + '. WHAT\'S IN THE BACK GOES WHERE YOU DRIVE - TO THE MARKET, THE WHARF, THE CAFE.',
      rows: ids.map(function (k) { return { label: 'Take out ' + nameOf(k), icon: k, sub: s.hold[k] + ' in the back', pick: function () {
        var n = s.hold[k]; if (BridgeInventory.addItem(k, n)) { delete s.hold[k]; store(); sfx('pickup'); } hold(); } }; })
        .concat(pack.map(function (k) { return { label: 'Load ' + nameOf(k), icon: k, sub: 'you have ' + count(k), pick: function () {
          var n = Math.min(count(k), LOAD - holdCount());
          if (n <= 0) return say('THE BUGGY', 'IT\'S FULL. ANY MORE AND THE AXLE WILL HAVE WORDS WITH YOU.');
          BridgeInventory.removeItem(k, n); s.hold[k] = (s.hold[k] || 0) + n; store(); sfx('pickup'); hold(); } }; })),
      closeLabel: 'Done'
    });
  }
  /** Take n of id from the buggy's load (the market, a buyer): how many there were to take. */
  function fromHold(id, n) { var have = s.hold[id] || 0, t = Math.min(have, n); if (t) { s.hold[id] = have - t; if (!s.hold[id]) delete s.hold[id]; store(); } return t; }

  // ---- Hobb's Livery -----------------------------------------------------------------------------------------------------
  function livery() {
    if (!s.horse) {
      return choose({
        title: "Hobb's Livery",
        text: 'FOUR STALLS, HARNESS ON PEGS, A GOAT ON THE MOUNTING BLOCK. "A HORSE OF YOUR OWN? ' + HORSE_COST + ' COINS, SADDLE AND BRIDLE IN, AND I\'LL KEEP HER FED. PICK YOUR COLOUR."',
        rows: COATS.map(function (c) { return { label: c.name, sub: 'a ' + c.name.toLowerCase() + ' mare', note: HORSE_COST + ' coins', draw: coatIcon(c.id), pick: function () { buy(c.id); } }; })
      });
    }
    var rows = [];
    if (!s.buggy) rows.push({ label: 'Buy the buggy', sub: 'a green-and-gold gig, room for a load', note: BUGGY_COST + ' coins', pick: buyBuggy });
    rows.push({ label: s.riding ? 'Get down' : 'Ride out on ' + horseName(), pick: function () { s.riding ? down() : up('horse'); } });
    if (s.buggy) rows.push({ label: s.riding === 'buggy' ? 'Unhitch the buggy' : 'Hitch up the buggy', pick: function () { s.riding === 'buggy' ? down() : up('buggy'); } });
    if (s.buggy) rows.push({ label: 'The buggy\'s load', sub: holdCount() + ' of ' + LOAD, pick: hold });
    if (!count('horse_whistle')) rows.push({ label: 'A new whistle', sub: 'you\'ve lost yours', pick: function () { BridgeInventory.addItem('horse_whistle', 1); } });
    choose({ title: "Hobb's Livery", text: '"' + horseName().toUpperCase() + '\'S FED AND BRUSHED. ' + (s.miles > 3 ? 'SHE\'S DONE ' + Math.round(s.miles) + ' MILES WITH YOU, NEAR ENOUGH. ' : '') + 'WHISTLE AND SHE\'LL COME, ANYWHERE OUT OF DOORS."', rows: rows });
  }
  function buy(coat) {
    choose({ title: 'Name her', text: 'A ' + coat.toUpperCase() + ' MARE, FIFTEEN HANDS, A KIND EYE. WHAT\'LL YOU CALL HER?',
             input: { placeholder: 'Bramble', button: 'Buy her', max: 16, submit: function (name) { pay(coat, (name || '').trim() || 'Bramble'); } } });
  }
  function pay(coat, name) {
    charge(HORSE_COST, 'livery:horse').then(function (r) {
      if (!r.ok) return say("HOBB'S LIVERY", why(r));
      s.horse = { coat: coat, name: name.replace(/[<>]/g, '').slice(0, 16) }; store();
      if (!count('horse_whistle')) BridgeInventory.addItem('horse_whistle', 1);
      toast('Hobb\'s Livery', s.horse.name + ' is yours', 'a whistle brings her');
      say("HOBB'S LIVERY", '"' + s.horse.name.toUpperCase() + ' IT IS. HERE - A WHISTLE. BLOW IT OUT OF DOORS AND SHE\'LL COME TO YOU, ANYWHERE ON THE FARM, THE VILLAGE OR THE LANES. AND GO EASY ON THE BRIDGE."');
      up('horse');
    });
  }
  function buyBuggy() {
    charge(BUGGY_COST, 'livery:buggy').then(function (r) {
      if (!r.ok) return say("HOBB'S LIVERY", why(r));
      s.buggy = true; store();
      toast('Hobb\'s Livery', 'The buggy is yours', 'room for ' + LOAD + ' in the back');
      say("HOBB'S LIVERY", '"SHE\'S A GOOD LITTLE GIG. TWO WHEELS, ONE SEAT, CRATES BEHIND. PUT YOUR PRODUCE IN THE BACK AND DRIVE IT TO MARKET LIKE A PROPER FARMER."');
    });
  }
  function coatIcon(coat) {
    var c = { bay: '#8a4a26', chestnut: '#b05a24', grey: '#c4c4c8', black: '#2a2630' }[coat];
    return function (g, size) {
      var u = size / 16; function r(col, a, b, w, h) { g.fillStyle = col; g.fillRect(a * u, b * u, w * u, h * u); }
      r('#1a1008', 2, 5, 11, 6); r(c, 3, 6, 9, 4); r('#1a1008', 11, 2, 4, 5); r(c, 12, 3, 2, 3);
      r('#1a1008', 3, 10, 2, 5); r('#1a1008', 10, 10, 2, 5); r('#2e6a4a', 5, 5, 4, 2);
    };
  }

  // ---- as places load: who's riding, your horse waiting, the paddock -------------------------------------------------
  function decorate(worldId, data) {
    if (!data) return;
    if (s.riding && !RIDE.test(worldId)) { down(true); s.at = null; store(); }
    if (typeof BridgeCharacter !== 'undefined' && BridgeCharacter.setMount) BridgeCharacter.setMount(s.riding && RIDE.test(worldId) ? mountFor(s.riding) : null);
    if (s.horse && !s.riding && s.at && s.at.world === worldId)
      (data.interactions = data.interactions || []).push({ x: s.at.x, y: s.at.y, type: 'horse', label: horseName().toUpperCase(), prompt: 'PRESS E TO GET UP', _horse: 1 });
    if (worldId === PADDOCK.world) placePaddock();
  }
  function refresh() {
    var w = typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorld ? BridgeWorld.getWorld() : null;
    if (!w) return;
    w.interactions = (w.interactions || []).filter(function (it) { return !it._horse; });
    if (s.horse && !s.riding && s.at && s.at.world === here())
      w.interactions.push({ x: s.at.x, y: s.at.y, type: 'horse', label: horseName().toUpperCase(), prompt: 'PRESS E TO GET UP', _horse: 1 });
  }
  function onHorse() {
    if (!s.buggy) return up('horse');
    choose({ title: horseName(), rows: [{ label: 'Ride', pick: function () { up('horse'); } }, { label: 'Drive the buggy', pick: function () { up('buggy'); } },
                                        { label: 'The buggy\'s load', sub: holdCount() + ' of ' + LOAD, pick: hold }] });
  }

  // Hobb's horses in the paddock behind the yard, grazing and wandering a step now and then
  var herd = [];
  function placePaddock() {
    herd = PADDOCK.horses.map(function (h, i) {
      return { coat: h.coat, name: h.name, x: PADDOCK.x0 + 1 + i * 2, y: PADDOCK.y0 + (i % 2), tx: null, wait: 2 + i * 3, facing: i ? 'left' : 'right', stride: 0, seed: i * 3 };
    });
  }
  var lastT = 0;
  function items(world, offX, offY, ts, now, sc) {
    var out = [], wid = here(), dt = Math.min(0.05, (now - (lastT || now)) / 1000);
    lastT = now;
    if (wid === PADDOCK.world) herd.forEach(function (h) {
      if (h.wait > 0) h.wait -= dt;
      else if (h.tx === null) { h.tx = PADDOCK.x0 + Math.random() * (PADDOCK.x1 - PADDOCK.x0); h.ty = PADDOCK.y0 + Math.random() * (PADDOCK.y1 - PADDOCK.y0); }
      else {
        var dx = h.tx - h.x, dy = h.ty - h.y, d = Math.hypot(dx, dy), st = 0.9 * dt;
        if (d <= st) { h.x = h.tx; h.y = h.ty; h.tx = null; h.wait = 4 + Math.random() * 8; }
        else { h.x += dx / d * st; h.y += dy / d * st; h.stride += st; h.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); }
      }
      var walking = h.tx !== null && h.wait <= 0, fr = h.y + 1 - 3 / 32;
      out.push({ footRow: fr, draw: function (c) {
        drawMount(c, { sc: sc, world: world, offX: offX, offY: offY, ts: ts, now: now, x: h.x, y: h.y, footRow: fr }, 'horse', h.coat, h.facing,
                  frameCol(walking, h.stride, now, h.seed), null);
      } });
    });
    if (s.horse && !s.riding && s.at && s.at.world === wid) {
      var fr2 = s.at.y + 1 - 3 / 32;
      out.push({ footRow: fr2, draw: function (c) {
        drawMount(c, { sc: sc, world: world, offX: offX, offY: offY, ts: ts, now: now, x: s.at.x, y: s.at.y, footRow: fr2 }, 'horse', s.horse.coat,
                  s.at.facing || 'down', frameCol(false, 0, now, 5), null);
      } });
    }
    return out;
  }
  // miles on the clock (a tile's about eight yards): for Hobb, and the journal
  var lastPos = null;
  setInterval(function () {
    if (!s.riding || typeof BridgeCharacter === 'undefined') { lastPos = null; return; }
    var p = [BridgeCharacter.getX(), BridgeCharacter.getY()];
    if (lastPos) { s.miles += (Math.abs(p[0] - lastPos[0]) + Math.abs(p[1] - lastPos[1])) / 220; }
    lastPos = p;
  }, 2000);
  setInterval(store, 30000);

  // ---- a journey: the train or the ferry, the countryside sliding past for a few seconds ---------------------------------
  // A little picture drawn at 320 × 180 and scaled up crisp: the sky for Verdance's hour, the Downs in layers (the chalk
  // horse on the far hill, hedges, telegraph poles and steam by the line), or the river's far bank and willows from the
  // ferry's rail. Then the next place. kind: 'train' | 'ferry'.
  function journey(kind, done) {
    var W_ = 320, H_ = 180, LEN = 4800;
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:60;background:#000;opacity:0;transition:opacity .5s;display:flex;align-items:center;justify-content:center';
    var cv = document.createElement('canvas'); cv.width = W_; cv.height = H_;
    cv.style.cssText = 'width:min(100vw,177.8vh);height:min(56.25vw,100vh);image-rendering:pixelated';
    wrap.appendChild(cv); document.body.appendChild(wrap);
    if (typeof BridgeControls !== 'undefined' && BridgeControls.disable) BridgeControls.disable();
    requestAnimationFrame(function () { wrap.style.opacity = '1'; });
    var g = cv.getContext('2d'), t0 = performance.now();
    var sky = typeof BridgeClock !== 'undefined' ? BridgeClock.sky('verdance') : { sun: 1, dusk: 0 };
    var sun = sky.sun, dusk = sky.dusk || 0;
    function lerp(a, b, f) { return [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * f); }); }
    function mix(a, b, f) { return 'rgb(' + lerp(a, b, f).join(',') + ')'; }
    function hill(off, base, amp, f, col, seed) {
      g.fillStyle = col; g.beginPath(); g.moveTo(0, H_);
      for (var x = 0; x <= W_; x += 4) g.lineTo(x, base - amp * (Math.sin((x + off) * f + seed) * 0.6 + Math.sin((x + off) * f * 2.3 + seed * 2) * 0.4));
      g.lineTo(W_, H_); g.fill();
    }
    function frame(now) {
      var t = now - t0, v = t * (kind === 'train' ? 0.09 : 0.03);
      var day = [118, 178, 228], night = [16, 22, 48], gold = [240, 168, 96];
      var top = mix(night, day, sun), low = mix(lerp(night, [170, 210, 236], sun), gold, dusk * 0.7);
      var gr = g.createLinearGradient(0, 0, 0, H_ * 0.7); gr.addColorStop(0, top); gr.addColorStop(1, low);
      g.fillStyle = gr; g.fillRect(0, 0, W_, H_);
      if (sun < 0.3) for (var i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,240,' + (0.6 * (1 - sun / 0.3)) + ')'; g.fillRect((i * 73) % W_, (i * 37) % 70, 1, 1); }
      if (sun < 0.5 && typeof BridgeFarm !== 'undefined' && BridgeFarm.moonLight) [[250, 26, 7], [60, 38, 4]].forEach(function (m, i) {   // the Lantern and the Button
        var L = BridgeFarm.moonLight(i, Date.now()), a = (1 - sun * 2);
        g.fillStyle = 'rgba(240,236,210,' + (a * (0.25 + 0.75 * L)).toFixed(2) + ')'; g.beginPath(); g.arc(m[0], m[1], m[2], 0, 7); g.fill();
        g.fillStyle = 'rgba(20,24,48,' + (a * (1 - L) * 0.9).toFixed(2) + ')'; g.beginPath(); g.arc(m[0] + m[2] * (0.4 + L), m[1] - 1, m[2], 0, 7); g.fill();
      });
      var lit = sun < 0.35;
      var shade = function (c) { return mix([12, 18, 24], c, 0.35 + 0.65 * sun); };
      if (kind === 'train') {
        hill(v * 0.15, 104, 14, 0.012, shade([120, 168, 104]), 1);
        var hx = 260 - (v * 0.15 % 700);                       // the chalk horse on the far hill
        g.fillStyle = mix([70, 74, 70], [240, 236, 224], sun);
        g.fillRect(hx, 101, 14, 2); g.fillRect(hx + 12, 98, 2, 3); g.fillRect(hx + 14, 98, 2, 1); g.fillRect(hx + 1, 103, 1, 3); g.fillRect(hx + 4, 103, 1, 3);
        g.fillRect(hx + 10, 103, 1, 3); g.fillRect(hx + 12, 103, 1, 2); g.fillRect(hx - 2, 100, 2, 1);
        var vx = 420 - (v * 0.25 % 900);                       // a village going by: cottages, a spire, lit windows after dark
        for (var hh = 0; hh < 5; hh++) {
          var bx = vx + hh * 13, bh = 8 + (hh % 2) * 2;
          g.fillStyle = shade([200, 176, 132]); g.fillRect(bx, 116 - bh, 10, bh);
          g.fillStyle = shade([150, 80, 60]); g.beginPath(); g.moveTo(bx - 1, 116 - bh); g.lineTo(bx + 5, 110 - bh); g.lineTo(bx + 11, 116 - bh); g.fill();
          if (lit) { g.fillStyle = '#ffd890'; g.fillRect(bx + 2, 112 - bh + 4, 2, 2); g.fillRect(bx + 6, 112 - bh + 4, 2, 2); }
        }
        g.fillStyle = shade([190, 168, 128]); g.fillRect(vx + 66, 98, 5, 18); g.beginPath(); g.moveTo(vx + 65, 98); g.lineTo(vx + 68.5, 84); g.lineTo(vx + 72, 98); g.fill();
        hill(v * 0.35, 124, 12, 0.02, shade([92, 148, 70]), 3);
        if (sun > 0.3) for (var sh = 0; sh < 7; sh++) {          // sheep on the near field
          var sx_ = ((sh * 47 - v * 0.35) % 360 + 360) % 360 - 20;
          g.fillStyle = '#ece8dc'; g.fillRect(sx_, 128 + (sh * 7) % 9, 4, 2); g.fillStyle = '#2a2420'; g.fillRect(sx_ + 4, 128 + (sh * 7) % 9, 1, 1);
        }
        for (var h = 0; h < 8; h++) {                           // hedgerows across the fields, trees in them
          var hy = 128 + h * 3, xo = -(v * (0.4 + h * 0.05)) % 90;
          g.fillStyle = shade([58, 104, 48]);
          for (var x = xo; x < W_; x += 90) { g.fillRect(x, hy, 70, 2); g.beginPath(); g.arc(x + 20, hy - 3, 5, 0, 7); g.fill(); }
        }
        hill(v * 0.8, 150, 6, 0.03, shade([104, 160, 72]), 5);
        var px_ = -(v * 1.6 % 120);                             // telegraph poles flicking past
        g.fillStyle = shade([70, 50, 30]);
        for (var p2 = px_; p2 < W_; p2 += 120) { g.fillRect(p2, 96, 3, 70); g.fillRect(p2 - 6, 100, 15, 2); }
        g.strokeStyle = 'rgba(30,30,30,0.5)'; g.beginPath(); g.moveTo(0, 101); g.lineTo(W_, 103); g.stroke();
        for (var sm = 0; sm < 6; sm++) {                        // steam drifting back past the window
          var sx = (W_ - ((t * 0.12 + sm * 70) % (W_ + 80))), sy = 20 + Math.sin(t / 300 + sm) * 6 + sm * 3;
          g.fillStyle = 'rgba(240,240,240,' + ((0.35 - sm * 0.04) * (0.3 + 0.7 * sun)).toFixed(2) + ')'; g.beginPath(); g.arc(sx, sy, 6 + sm * 1.5, 0, 7); g.fill();
        }
        g.fillStyle = '#1e3a2a';                                // the carriage window
        g.fillRect(0, 0, W_, 12); g.fillRect(0, H_ - 26, W_, 26); g.fillRect(0, 0, 14, H_); g.fillRect(W_ - 14, 0, 14, H_); g.fillRect(156, 0, 8, H_);
        g.fillStyle = '#c8a050'; g.fillRect(14, 12, W_ - 28, 2); g.fillRect(14, H_ - 28, W_ - 28, 2);
        g.fillStyle = '#6a2a2a'; g.fillRect(0, H_ - 18, W_, 18);
      } else {
        hill(v * 0.2, 96, 10, 0.015, shade([116, 160, 100]), 2);
        var wx = -(v * 0.5 % 110);                              // willows on the far bank
        for (var w2 = wx; w2 < W_ + 40; w2 += 110) {
          g.fillStyle = shade([60, 40, 24]); g.fillRect(w2 + 18, 84, 4, 28);
          g.fillStyle = shade([96, 150, 70]); g.beginPath(); g.ellipse(w2 + 20, 84, 22, 14, 0, 0, 7); g.fill();
          for (var f2 = 0; f2 < 9; f2++) g.fillRect(w2 + 2 + f2 * 4, 84, 2, 16 + (f2 % 3) * 5);
        }
        g.fillStyle = shade([84, 132, 60]); g.fillRect(0, 108, W_, 6);
        g.fillStyle = shade([70, 110, 50]);                        // reeds along the far bank
        for (var rd = 0; rd < 60; rd++) { var rx_ = ((rd * 29 - v * 0.6) % 340 + 340) % 340 - 10; g.fillRect(rx_, 104 - (rd % 4), 1, 6 + (rd % 4)); }
        var hx2 = ((150 - v * 0.6) % 600 + 600) % 600 - 100;       // a heron standing in the shallows
        g.fillStyle = shade([150, 160, 170]); g.fillRect(hx2, 102, 4, 6); g.fillRect(hx2 + 3, 97, 1, 5); g.fillRect(hx2 + 3, 96, 3, 1);
        g.fillStyle = shade([60, 60, 60]); g.fillRect(hx2 + 1, 108, 1, 5); g.fillRect(hx2 + 3, 108, 1, 5);
        var wg = g.createLinearGradient(0, 114, 0, H_); wg.addColorStop(0, shade([60, 110, 120])); wg.addColorStop(1, shade([30, 70, 84]));
        g.fillStyle = wg; g.fillRect(0, 114, W_, H_ - 114);
        for (var gl = 0; gl < 24; gl++) {                       // glints sliding by
          var gx = (W_ - ((t * 0.05 * (1 + gl % 3) + gl * 37) % W_)), gy = 120 + (gl * 13) % 50;
          g.fillStyle = 'rgba(255,255,240,' + (0.25 + 0.25 * Math.sin(t / 200 + gl)) + ')'; g.fillRect(gx, gy, 4 + gl % 3, 1);
        }
        g.fillStyle = '#efe6d2'; g.fillRect(0, H_ - 34, W_, 4);   // the ferry's rail and deck
        for (var r2 = 6; r2 < W_; r2 += 26) g.fillRect(r2, H_ - 34, 3, 24);
        g.fillStyle = '#7a5a3a'; g.fillRect(0, H_ - 12, W_, 12);
      }
      var a = Math.min(1, t / 400, (LEN - t) / 400);
      g.fillStyle = 'rgba(0,0,0,' + (1 - Math.max(0, a)).toFixed(2) + ')'; g.fillRect(0, 0, W_, H_);
      if (t < LEN) requestAnimationFrame(frame);
      else {
        done();
        wrap.style.opacity = '0';
        setTimeout(function () { wrap.remove(); if (typeof BridgeControls !== 'undefined' && BridgeControls.enable) BridgeControls.enable(); }, 600);
      }
    }
    requestAnimationFrame(frame);
    if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(kind === 'train' ? 'step' : 'splash');
  }

  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('verdance', { items: items });
  if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.register) BridgeInteractions.register('horse', onHorse, 'Get up');

  return { decorate: decorate, livery: livery, whistle: whistle, journey: journey, riding: riding, down: down, hold: hold, fromHold: fromHold, holdCount: holdCount,
           drawMount: drawMount, frameCol: frameCol, owned: function () { return !!s.horse; },
           journal: function () { return { horse: s.horse, buggy: s.buggy, miles: Math.round(s.miles), load: holdCount() }; },
           _s: function () { return s; }, reload: function () { s = load(); } };
})();
