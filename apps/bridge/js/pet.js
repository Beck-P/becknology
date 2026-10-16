/**
 * BridgePet — a companion who follows you through every world.
 *
 * Three to be had: a pup from Hollin's dog's litter on the farm (once the farm
 * is yours), a kitten from Gran Wilde in her cottage on the Market Square, a
 * hover-drone from Tinkers Tech in the District (400 coins) — each from a
 * conversation topic (`pet: 'dog' | 'cat' | 'drone'`). You name them. One goes
 * with you at a time; the whistle (given with the first) calls the next one,
 * or sends them all home. They follow your steps a pace or two behind, sit
 * when you stop, and E pets them.
 *
 * Each does a little something once a day: the dog digs up something good in
 * the open air, the cat brings you a present, the drone pings when there's a
 * hidden curio or a treasure spot near (and lights faintly round you).
 * Drawn in code on the 16-unit grid (side views, mirrored), depth-tested with
 * everyone, through the '*' scene hooks. Kept in localStorage bridge_pet.
 *
 *   BridgePet.adopt(kind, who) / .whistle() / .use(inter) / .active()
 */
var BridgePet = (function () {
  var KEY = 'bridge_pet', DAY = 86400000;
  var KINDS = {
    dog:   { name: 'Dog', price: 0, sound: 'A SOFT WOOF.', base: ['Biscuit', 'Juniper', 'Pepper', 'Moss'] },
    cat:   { name: 'Cat', price: 0, sound: 'A SMALL, SERIOUS MEW.', base: ['Inkwell', 'Mackerel', 'Saffron', 'Pocket'] },
    drone: { name: 'Drone', price: 400, sound: 'A HAPPY TWO-NOTE CHIRP.', base: ['Blip', 'Pixel', 'Sprocket', 'Echo'] }
  };
  var st = load();
  var me = null;                // where it is now: {x, y, dir, sit, dist, inter, world}
  var trail = [];

  function load() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    d = d || {};
    return { pets: d.pets || {}, active: d.active || null, perk: d.perk || {} };
  }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode */ } }
  function say(t, x) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(t, x); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }
  function toast(k, t, sub) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(k, t, sub); }
  function today() { return Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / DAY); }
  function pet() { return st.active ? st.pets[st.active] : null; }

  // ---- getting one -----------------------------------------------------------------------------------------------------
  function adopt(kind, who) {
    var K = KINDS[kind];
    if (!K) return;
    if (st.pets[kind]) return say((who || '').toUpperCase(), kind === 'drone' ? '"YOURS IS ALREADY OUT THERE BEEPING AT THINGS. ONE PER CUSTOMER."' : '"YOU\'VE ALREADY GOT ONE OF MINE. HOW ARE THEY?"');
    if (kind === 'dog' && !(typeof BridgeHomestead !== 'undefined' && BridgeHomestead.owned())) {
      return say('HOLLIN', '"MY OLD DOG\'S HAD PUPS. I\'LL NOT GIVE ONE TO SOMEONE WITHOUT A FIELD FOR IT TO RUN IN, THOUGH. WHEN THE FARM\'S YOURS, COME BACK."');
    }
    var pitch = { dog: '"THE LAST PUP OF THE LITTER. ALL EARS AND FEET. SHE\'LL FOLLOW YOU ANYWHERE - LITERALLY, SHE ALREADY IS. WHAT\'LL YOU CALL HER?"',
                  cat: '"THE KITTEN? OH, TAKE HIM. HE\'S BEEN SITTING IN YOUR BAG SINCE YOU CAME IN ANYWAY. GIVE HIM A GOOD NAME - A SEA NAME."',
                  drone: '"A K-7 HOVER UNIT. REBUILT IT MYSELF - NEW GYROS, A LAMP, A SCANNER THAT PINGS AT ANYTHING OLD. ' + K.price + ' COINS, AND IT\'S YOURS. IT NEEDS A NAME, THEY\'RE WEIRD ABOUT THAT."' }[kind];
    BridgeInteractions.choose({
      title: 'A ' + K.name.toLowerCase(),
      text: pitch,
      input: { placeholder: K.base[Math.floor(Math.random() * K.base.length)], max: 16, button: K.price ? 'Pay ' + K.price + ' and name it' : 'Name it', submit: function (v) {
        v = String(v || '').replace(/[^\w '\-]/g, '').trim().slice(0, 16) || K.base[0];
        var go = function () {
          st.pets[kind] = { kind: kind, name: v, since: Date.now(), pats: 0 };
          var first = !st.whistle;
          st.active = kind; st.whistle = true; store();
          if (first && typeof BridgeInventory !== 'undefined') BridgeInventory.give('whistle', 1);
          me = null;
          sfx('quest');
          toast('A new friend', v, 'Follows you everywhere' + (first ? ' · the whistle calls them' : ''));
        };
        if (!K.price) return go();
        BridgeProgression.wagerCoins(K.price, 'pet:' + kind).then(function (r) { if (r && r.ok) go(); else say('TINKER', '"' + K.price + ' COINS. IT\'S A GOOD DRONE, NOT A CHARITY."'); });
      } }
    });
  }

  // the whistle: the next one comes, or (after the last) they all go home
  function whistle() {
    var kinds = Object.keys(st.pets);
    if (!kinds.length) return say('WHISTLE', 'A CLEAR NOTE. NOBODY COMES. (NOBODY\'S YOURS YET.)');
    var order = kinds.concat([null]), i = order.indexOf(st.active), next = order[(i + 1) % order.length];
    st.active = next; store(); me = null;
    sfx('blip');
    if (!next) return say('WHISTLE', 'A LONG LOW NOTE: GO HOME. THEY WAIT FOR YOU ABOARD THE WAYFARER.');
    say('WHISTLE', st.pets[next].name.toUpperCase() + ' COMES RUNNING. ' + KINDS[next].sound);
  }

  // ---- E on it: a pat, and how it's doing ----------------------------------------------------------------------------
  function use(inter) {
    var P = pet();
    if (!P) return;
    P.pats++; store();
    if (me) me.love = performance.now();
    sfx('pickup');
    var lines = {
      dog: ['SHE ROLLS OVER AT ONCE FOR A BELLY RUB. NO DIGNITY. NONE.', 'A LICK ON THE HAND, A WAG THAT MOVES HER WHOLE BACK HALF.', 'SHE LEANS HER WHOLE WEIGHT ON YOUR LEG AND SIGHS.'],
      cat: ['HE PERMITS IT. THEN HE PERMITS IT AGAIN. THEN HE BITES YOU, POLITELY, TO END THE MEETING.', 'A PURR LIKE A SMALL ENGINE. HE HEADBUTTS YOUR KNEE.', 'HE LOOKS AT YOU AS IF YOU\'D FINALLY DONE SOMETHING RIGHT.'],
      drone: ['IT TILTS INTO YOUR HAND LIKE A CAT WOULD. THE LAMP GOES WARM YELLOW.', 'A LITTLE ARPEGGIO OF BEEPS. YOU CHOOSE TO BELIEVE IT\'S A SONG.', 'ITS SCANNER SWEEPS YOU, TOP TO TOE. "FRIEND," SAYS THE TINY SCREEN.']
    }[P.kind];
    say(P.name.toUpperCase(), lines[P.pats % lines.length]);
  }

  // ---- following ---------------------------------------------------------------------------------------------------------
  function interiorish(world) { return !world.scene || !(world.scene.backdrop || /^(lumar|lumar-(square|crimson|rose|sapphire|midnight)|verdance|hoarfell(-summit|-piste|-park|-ridge)?|arcadia-(street|alley|skypad))$/.test(BridgeWorld.getWorldId())); }
  function tick(world, now, dt) {
    var P = pet();
    if (!P) { me = null; return; }
    if (BridgeWorld.getMode() || (BridgeCharacter.isHidden && BridgeCharacter.isHidden())) return;
    var pos = BridgeCharacter.getRenderPos(), px = pos.x, py = pos.y, wid = BridgeWorld.getWorldId();
    if (!me || me.world !== wid || Math.hypot(me.x - px, me.y - py) > 8) {
      me = { x: px - 0.8, y: py + 0.3, dir: 1, sit: 0, dist: 0, world: wid, bob: 0 };
      trail = [];
      attach(world);
    }
    var last = trail[trail.length - 1];
    if (!last || Math.hypot(last[0] - px, last[1] - py) > 0.12) { trail.push([px, py]); if (trail.length > 60) trail.shift(); }
    // aim for the point a pace and a half back along your steps
    var target = null, acc = 0;
    for (var i = trail.length - 1; i > 0; i--) {
      acc += Math.hypot(trail[i][0] - trail[i - 1][0], trail[i][1] - trail[i - 1][1]);
      if (acc >= 1.3) { target = trail[i - 1]; break; }
    }
    var moving = false;
    if (target) {
      var dx = target[0] - me.x, dy = target[1] - me.y, d = Math.hypot(dx, dy);
      if (d > 0.08) {
        var step = Math.min(d, (2.2 + d * 3) * dt);
        me.x += dx / d * step; me.y += dy / d * step; me.dist += step; moving = true;
        if (Math.abs(dx) > 0.04) me.dir = dx > 0 ? 1 : -1;
      }
    }
    me.sit = moving ? 0 : me.sit + dt;
    if (me.inter) { me.inter.x = Math.round(me.x); me.inter.y = Math.round(me.y); }
    perks(world, now);
  }
  function attach(world) {
    world.interactions = (world.interactions || []).filter(function (it) { return it.type !== 'companion'; });
    var P = pet();
    if (!P) return;
    me.inter = { x: Math.round(me.x), y: Math.round(me.y), type: 'companion', label: P.name.toUpperCase(), prompt: 'PRESS E TO PET', noBeacon: true };
    world.interactions.push(me.inter);
  }

  // ---- what they do for you, once a day ------------------------------------------------------------------------------------
  var walked = 0, lastPing = 0;
  function perks(world, now) {
    var P = pet(), d = today();
    if (me.sit === 0) walked += 1 / 60;
    if (P.kind === 'drone') return scan(world, now);
    if (st.perk[P.kind] === d || walked < 40 || interiorish(world)) return;
    st.perk[P.kind] = d; walked = 0; store();
    var x = Math.round(me.x), y = Math.round(me.y), wid = BridgeWorld.getWorldId();
    if (P.kind === 'dog') {
      var finds = /^hoarfell/.test(wid) ? ['hoar_crystal', 'edelweiss'] : wid === 'verdance' ? ['apple', 'honey', 'seed_strawberry'] : /^lumar/.test(wid) ? ['sea_glass', 'silver_nail', 'old_boot'] : ['silver_nail'];
      var it = finds[Math.floor(Math.random() * finds.length)];
      if (typeof BridgeLoot !== 'undefined') BridgeLoot.spawn(x, y, it, 1);
      if (typeof BridgeProgression !== 'undefined') BridgeProgression.awardCoins(15, 'pet:dig');
      sfx('pickup');
      toast(P.name, 'Dug something up!', 'And a few old coins');
    } else {
      var gift = /^lumar/.test(wid) ? 'silverfin' : wid === 'verdance' ? 'pond_perch' : 'sea_glass';
      if (typeof BridgeLoot !== 'undefined') BridgeLoot.spawn(x, y, gift, 1);
      sfx('pickup');
      toast(P.name, 'Brought you a present', 'He looks very pleased with himself');
    }
  }
  // the drone: a ping every few seconds, gold when something hidden is near
  var pingT = 0, pingHot = false;
  function scan(world, now) {
    if (now - lastPing < 3200) return;
    lastPing = now;
    var wid = BridgeWorld.getWorldId(), hot = false, px = me.x, py = me.y;
    if (typeof BridgeMagic !== 'undefined') {
      var found = BridgeMagic._st().found;
      BridgeMagic.CURIOS.forEach(function (c) { if (c.world === wid && !found[c.id] && Math.hypot(c.at[0] - px, c.at[1] - py) < 7) hot = true; });
    }
    (world.interactions || []).forEach(function (it) { if (it.type === 'dig' && Math.hypot(it.x - px, it.y - py) < 7) hot = true; });
    pingT = now; pingHot = hot;
    if (hot) sfx('blip');
  }

  // ---- drawing: 16-unit art, mirrored for left ----------------------------------------------------------------------------
  var PAL = { k: '#2a1a10', b: '#c8904a', s: '#a06a30', l: '#e8c088', e: '#1a1010', t: '#e86070', g: '#8a8a96', h: '#6a6a74', w: '#e8e8ee',
              y: '#7ae070', c: '#c8f0f8', m: '#5a6a7a', n: '#40c8d8', o: '#f0a020' };
  function dogParts(f, sit, wag) {
    var ty = wag ? 1 : 3;
    if (sit) return [['k', 0, ty + 3, 3, 2], ['b', 1, ty + 3, 1, 1], ['k', 3, 4, 8, 6], ['b', 4, 5, 6, 4], ['s', 4, 8, 6, 1], ['k', 8, 8, 2, 3], ['b', 8, 9, 1, 1],
                     ['k', 9, 1, 5, 5], ['b', 10, 2, 3, 3], ['s', 9, 2, 2, 3], ['e', 14, 3, 1, 1], ['e', 12, 2, 1, 1], ['t', 12, 5, 1, 1]];
    var l = f ? 1 : 0;
    return [['k', 0, ty, 3, 2], ['b', 1, ty, 1, 1], ['k', 2, 4, 10, 5], ['b', 3, 5, 8, 3], ['s', 3, 7, 8, 1], ['l', 9, 6, 2, 1],
            ['k', 3 + l, 8, 2, 3], ['k', 9 - l, 8, 2, 3], ['b', 3 + l, 8, 1, 2], ['b', 9 - l, 8, 1, 2],
            ['k', 10, 1, 5, 5], ['b', 11, 2, 3, 3], ['s', 10, 2, 2, 3], ['e', 15, 3, 1, 1], ['e', 13, 2, 1, 1], ['t', 13, 5, 1, 1]];
  }
  function catParts(f, sit, wag) {
    var tx = wag ? 0 : 1;
    if (sit) return [['k', 0, 8 - tx, 1, 2], ['k', 1, 9, 3, 1],                                        // the tail, curled round the feet
                     ['k', 4, 4, 4, 1], ['k', 3, 5, 6, 5], ['g', 4, 5, 4, 4], ['h', 4, 8, 4, 1], ['w', 7, 7, 1, 2],
                     ['k', 6, 1, 5, 4], ['g', 7, 2, 3, 2], ['k', 6, 0, 1, 1], ['k', 10, 0, 1, 1], ['y', 9, 2, 1, 1], ['t', 10, 3, 1, 1]];
    var l = f ? 1 : 0;
    return [['k', tx, 0, 2, 5], ['g', tx + 1, 1, 1, 3], ['k', 1, 4, 9, 4], ['g', 2, 5, 7, 2], ['h', 3, 5, 5, 1], ['w', 3, 7, 6, 0],
            ['k', 2 + l, 7, 2, 2], ['k', 7 - l, 7, 2, 2], ['g', 2 + l, 7, 1, 1], ['g', 7 - l, 7, 1, 1],
            ['k', 8, 1, 5, 4], ['g', 9, 2, 3, 2], ['k', 8, 0, 1, 1], ['k', 12, 0, 1, 1], ['y', 11, 2, 1, 1], ['t', 12, 3, 1, 1]];
  }
  function droneParts(f) {
    var a = f ? 1 : 0;
    return [['k', 2, 2, 9, 5], ['c', 3, 3, 7, 3], ['m', 3, 5, 7, 1], ['k', 5, 3, 3, 2], ['n', 5, 3, 2, 2],
            ['k', 0, 1 + a, 3, 1], ['k', 10, 2 - a, 3, 1], ['m', 6, 0, 1, 2], ['o', 6, 7, 1, 1]];
  }
  var scr = null;
  function scratch(w, h) {
    if (!scr) scr = document.createElement('canvas');
    if (scr.width !== w || scr.height !== h) { scr.width = w; scr.height = h; }
    return scr;
  }
  function items(world, offX, offY, ts, now, sc) {
    var dt = Math.min(0.05, (now - (lastT || now)) / 1000);
    lastT = now;
    tick(world, now, dt);
    var P = pet();
    if (!P || !me || BridgeWorld.getMode()) return [];
    var foot = me.y + 0.85;
    return [{ footRow: foot, draw: function (c) { draw(c, P, offX, offY, ts, now, sc, world, foot); } }];
  }
  var lastT = 0;
  function draw(c, P, offX, offY, ts, now, sc, world, foot) {
    var u = ts / 16, sit = me.sit > 1.2, f = me.sit === 0 ? Math.floor(me.dist / 0.22) % 2 : 0, wag = Math.floor(now / 160) % 2 === 0;
    var drone = P.kind === 'drone', parts = P.kind === 'dog' ? dogParts(f, sit, wag) : P.kind === 'cat' ? catParts(f, sit, wag && me.sit > 3) : droneParts(Math.floor(now / 70) % 2);
    var W = 16, H = 12, lift = drone ? Math.round((10 + Math.sin(now / 400) * 2) * u) : 0;
    var cx = Math.round(offX + (me.x + 0.5) * ts), fy = Math.round(offY + foot * ts);
    var cv = scratch(Math.ceil(W * u) + 2, Math.ceil(H * u) + 2), g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    parts.forEach(function (p) {
      if (!p[3] || !p[4]) return;
      var x = me.dir > 0 ? p[1] : W - p[1] - p[3];
      g.fillStyle = PAL[p[0]];
      g.fillRect(Math.round(x * u) + 1, Math.round(p[2] * u) + 1, Math.round(p[3] * u), Math.round(p[4] * u));
    });
    var dx = cx - Math.round(W * u / 2) - 1, dy = fy - Math.round((drone ? 8 : 11) * u) - 1 - lift;
    var shadow = { x: cx, y: fy, rx: drone ? 5 : 7, ry: 2 };
    if (sc && BridgeScene.drawOccluded) {
      BridgeScene.drawOccluded(c, sc, cv, 0, 0, cv.width, cv.height, dx, dy, foot, offX, offY,
        BridgeScene.tintAt ? BridgeScene.tintAt(sc, world, Math.round(me.x), Math.round(me.y), now) : null, shadow);
    } else c.drawImage(cv, dx, dy);
    if (drone) {                                     // its lamp, and the scanner's ring every few seconds
      var age = (now - pingT) / 900;
      c.save(); c.globalCompositeOperation = 'lighter';
      c.fillStyle = 'rgba(64,200,216,0.25)'; c.fillRect(cx - 2 * u, dy + 9 * u, 4 * u, 2 * u);
      if (age < 1) {
        c.strokeStyle = pingHot ? 'rgba(255,214,110,' + (0.8 * (1 - age)).toFixed(2) + ')' : 'rgba(64,200,216,' + (0.55 * (1 - age)).toFixed(2) + ')';
        c.lineWidth = 1;
        c.beginPath(); c.ellipse(cx, fy, ts * (0.4 + age * 3.2), ts * (0.18 + age * 1.4), 0, 0, Math.PI * 2); c.stroke();
      }
      c.restore();
    }
    var love = (performance.now() - (me.love || -1e9)) / 1200;
    if (love >= 0 && love < 1) {
      var hx = cx - 3 * u, hy = dy - (2 + love * 8) * u;
      c.globalAlpha = 1 - love; c.fillStyle = '#e83a5a';
      c.fillRect(hx, hy, 2 * u, 2 * u); c.fillRect(hx + 4 * u, hy, 2 * u, 2 * u); c.fillRect(hx, hy + u, 6 * u, 2 * u);
      c.fillRect(hx + u, hy + 3 * u, 4 * u, u); c.fillRect(hx + 2 * u, hy + 4 * u, 2 * u, u);
      c.globalAlpha = 1;
    }
  }
  function decorate() { me = null; }
  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('*', { items: items });

  return { adopt: adopt, whistle: whistle, use: use, decorate: decorate, KINDS: KINDS,
           active: function () { return pet(); }, _st: function () { return st; }, _me: function () { return me; } };
})();
