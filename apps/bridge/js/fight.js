/**
 * BridgeFight — fighting together. When someone else is in the same place (js/multi.js `myInst`), the creatures there
 * are shared: one of you runs them (the **host** — whoever got there first and still has the game in front of them)
 * and everyone else's copy follows.
 *
 *   - The host's game moves them, picks who each one goes for (whoever's nearest, never someone who's down) and sends
 *     every creature's place and health (`fs`, ten times a second while anything changes, on asking `fs?`), each
 *     wind-up as it starts (`fw`: what kind, the tiles it'll hit) and a wind-up broken off (`fc`).
 *   - Everyone plays each strike out on their own screen from the wind-up — the marked tiles, the bolt, the slam —
 *     and whether it lands is checked against **you**, where you really are, so dodging works the same for both.
 *   - A hit on a creature someone else runs shows at once (the flash, the number, your drinking blade's heal) and goes
 *     to the host to settle (`fh`); the host's game applies it as if you'd struck it there (frost, burn, the knock
 *     back from where you stood). Whoever lands the blow that kills it takes the coins and the drops; anyone else
 *     within nine tiles gets their share too (`fd`) — loot is your own, nobody's picking it up before you.
 *   - The Bell Warden rings louder for company (half again its health for each extra fighter, js/combat.js `engage`).
 *   - **Down, not out**: at no health with someone fighting beside you, you're down for 30 s instead of blacking out —
 *     slumped where you fell, the creatures leaving you be. They walk up to you (*E — Help up*, `up`) and you're on
 *     your feet with a third of your health. Nobody comes (or everyone's down) and you black out as ever.
 *
 * Alone, none of it runs: the creatures are yours, as before.
 *
 *   BridgeFight.shared() / host() / targets(you, out) / follower(h) / sendHit / struck / wound / died / near / company
 *   (the hooks interactions.js, items.js and combat.js call)
 */
var BridgeFight = (function () {
  var since = 0, lastWorld = null, dead = {}, downIds = {}, down = null, banner = null, timer = 0;
  var snapAt = 0, snapJson = '', wantSnap = false, gotSnap = 0, arrivedAt = 0, asked = 0, applying = false;

  function N() { return typeof BridgeNet !== 'undefined' ? BridgeNet : null; }
  function M() { return typeof BridgeMulti !== 'undefined' ? BridgeMulti : null; }
  function myId() { var m = N() && N().me(); return m ? m.id : ''; }
  function inWorld() { return typeof BridgeState !== 'undefined' && BridgeState.getState() === 'world' && typeof BridgeWorld !== 'undefined' && !!BridgeWorld.getWorld(); }
  function here() { return M() && inWorld() ? M().myInst() : null; }
  function world() { return BridgeWorld.getWorld(); }
  function send(e, d, to) { var n = N(); if (n) n.send(e, Object.assign({ i: here() }, d), to); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function toast(a, b, c) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(a, b, c, false); }
  function cap(t) { return M() ? M().cap(t) : t; }

  // ---- who's here, and who runs the creatures --------------------------------------------------------------------------
  function present() {
    var n = N(), h = here(), out = {};
    if (!n || !h) return [];
    n.peers().forEach(function (p) { if (p.inst === h) out[p.id] = p; });
    var o = M().others();
    Object.keys(o).forEach(function (id) { if (!out[id]) out[id] = n.peer(id) || { id: id, name: o[id].name }; });
    return Object.keys(out).map(function (k) { return out[k]; });
  }
  function shared() { return !!(here() && N() && N().online() && present().length); }
  // the host: the one who's been here longest (presence `since`, set as you arrive), among those with the game in front
  // of them; anyone whose presence doesn't say they're here yet has only just come
  function host() {
    if (!shared()) return true;
    if (document.hidden) return false;
    var h = here(), me = myId();
    return present().every(function (p) {
      if (p.away) return true;
      var s = p.inst === h && typeof p.since === 'number' ? p.since : Infinity;
      return since < s || (since === s && me < p.id);
    });
  }
  function follower(h) { return !!(h && h.fid && shared() && !host()); }
  function company() { return 1 + present().length; }
  function isDown(id) { return typeof downIds[id] === 'boolean' ? downIds[id] : !!(N() && N().peer(id) && N().peer(id).down); }

  // who the creatures may go for: you (unless you're out of it) and everyone fighting beside you who's on their feet
  function targets(you, out) {
    var list = [];
    if (!out && !down) list.push(you);
    var o = M() ? M().others() : {};
    Object.keys(o).forEach(function (id) {
      var a = o[id];
      if (a.fresh || isDown(id)) return;
      var x = Math.round(a.tx), y = Math.round(a.ty);
      list.push({ id: id, getX: function () { return x; }, getY: function () { return y; } });
    });
    return list;
  }

  function find(w, id) {
    if (!w || !w.interactions) return null;
    for (var i = 0; i < w.interactions.length; i++) if (w.interactions[i].type === 'hostile' && w.interactions[i].fid === id) return w.interactions[i];
    return null;
  }
  function near(h) {
    if (typeof BridgeCharacter === 'undefined') return false;
    return Math.max(Math.abs(BridgeCharacter.getX() - h.x), Math.abs(BridgeCharacter.getY() - h.y)) <= 9;
  }
  function place(w, h, x, y) {
    if (h.x === x && h.y === y) return;
    var far = Math.abs(h.x - x) + Math.abs(h.y - y) > 2;
    if (w.collisions[h.y] && !w.interactions.some(function (o) { return o !== h && o.type === 'hostile' && o.x === h.x && o.y === h.y; })) w.collisions[h.y][h.x] = 0;
    h.x = x; h.y = y;
    if (w.collisions[y]) w.collisions[y][x] = 1;
    if (far) { h._rx = x; h._ry = y; h._blinkAt = performance.now(); }       // a blink: it's just there
  }

  // ---- the host: what its game tells the others ------------------------------------------------------------------------
  function wound(h) {
    if (!h.fid || !shared() || !host()) return;
    var t = h._attackTarget || { x: h.x, y: h.y };
    send('fw', { id: h.fid, k: h._kind || 'hit', t: [t.x, t.y], w: Math.round(h._windFor || h.windupMs || 500), x: h.x, y: h.y });
  }
  function struck(h, winding) {
    if (winding && h._attackPhase !== 'winding' && h.fid && shared() && host()) send('fc', { id: h.fid });
  }
  function snapshot(now) {
    var w = world();
    if (!w || !w.interactions) return [];
    return w.interactions.filter(function (h) { return h.type === 'hostile' && h.creature && h.fid; }).map(function (h) {
      return [h.fid, h.x, h.y, Math.max(0, Math.round(h._hp)), h.maxHP, h.creature,
              (h._engaged ? 1 : 0) | (h._frostUntil > now ? 2 : 0) | (h._burnUntil > now ? 4 : 0), h._face || 1];
    });
  }
  function sendSnap(now) {
    if (now - snapAt < 150) return;
    var s = snapshot(now), json = JSON.stringify(s);
    if (!wantSnap && json === snapJson && now - snapAt < 2000) return;
    if (!wantSnap && !s.length && snapJson === '[]') return;
    send('fs', { s: s });
    snapJson = json; snapAt = now; wantSnap = false;
  }
  function onHit(d, from) {
    if (!d || d.i !== here() || !host()) return;
    var w = world(), h = find(w, d.id);
    if (!h || typeof BridgeItems === 'undefined' || !BridgeItems.strike) return;
    BridgeItems.strike(w, h, Math.max(0, +d.d || 0), Object.assign({}, d.w || {}, { remote: true, by: from, from: { x: d.x, y: d.y } }));
  }

  // ---- everyone else: following the host's game -----------------------------------------------------------------------
  function onSnap(d, from) {
    if (!d || d.i !== here() || host() || !Array.isArray(d.s)) return;
    var w = world(), now = performance.now(), seen = {};
    if (!w) return;
    gotSnap = now;
    d.s.forEach(function (e) {
      var id = e[0];
      seen[id] = 1;
      if (dead[id]) {                                             // you finished it, they haven't heard: say again
        if (now - dead[id] > 2500 && !dead['!' + id]) { dead['!' + id] = 1; send('fh', { id: id, d: e[3] + 1, w: {}, x: BridgeCharacter.getX(), y: BridgeCharacter.getY() }, from); }
        return;
      }
      var h = find(w, id);
      if (!h) {
        if (typeof BridgeCombat === 'undefined' || !BridgeCombat.CREATURES[e[5]] || !w.collisions[e[2]]) return;
        h = BridgeCombat.spawn(w, e[5], e[1], e[2]);
        h.fid = id; h._blinkAt = now;
      } else place(w, h, e[1], e[2]);
      h.maxHP = e[4];
      if (!(now - (h._mineAt || 0) < 900 && e[3] > h._hp)) h._hp = e[3];   // your own hit, not yet counted there
      if ((e[6] & 1) && !h._engaged && typeof BridgeCombat !== 'undefined' && BridgeCombat.engage) { h._rallied = true; BridgeCombat.engage(h, company()); }
      h._frostUntil = e[6] & 2 ? now + 400 : 0;
      h._burnUntil = e[6] & 4 ? now + 400 : 0;
      h._face = e[7] || h._face;
    });
    w.interactions.slice().forEach(function (h) {               // whatever they no longer have is gone
      if (h.type === 'hostile' && h.fid && !seen[h.fid]) quietly(w, h);
    });
  }
  function onWind(d) {
    if (!d || d.i !== here() || host()) return;
    var w = world(), h = find(w, d.id);
    if (!h || dead[d.id]) return;
    place(w, h, d.x, d.y);
    h._attackPhase = 'winding'; h._attackStart = performance.now(); h._windFor = d.w; h._kind = d.k;
    h._attackTarget = { x: d.t[0], y: d.t[1] };
  }
  function onCancel(d) {
    if (!d || d.i !== here() || host()) return;
    var h = find(world(), d.id);
    if (h && h._attackPhase === 'winding') { h._attackPhase = 'recovering'; h._attackStart = performance.now(); h._attackTarget = null; }
  }
  function onDie(d) {
    if (!d || d.i !== here() || dead[d.id]) return;
    var w = world(), h = find(w, d.id);
    dead[d.id] = performance.now();
    if (!h) return;
    applying = true;
    try {
      var share = near(h);
      if (share && typeof BridgeFX !== 'undefined' && BridgeFX.spawnSparks) BridgeFX.spawnSparks(h.x, h.y, '#ff90e8', 10);
      BridgeInteractions.killHostile(w, h, { quiet: !share });
    } finally { applying = false; }
  }
  function quietly(w, h) {
    applying = true;
    try { BridgeInteractions.killHostile(w, h, { quiet: true }); } finally { applying = false; }
  }

  // your hit on one they run: you feel it now, they settle it
  function sendHit(h, dmg, w) {
    var t = {};
    if (w) ['frost', 'burn', 'heavy', 'holy', 'arc'].forEach(function (k) { if (w[k]) t[k] = 1; });
    if (w && w.push) t.push = w.push;                           // a finisher's or a charged blow's knock back (js/arms.js)
    if (w && w.cls) t.cls = w.cls;
    send('fh', { id: h.fid, d: dmg, w: t, x: BridgeCharacter.getX(), y: BridgeCharacter.getY() });
    h._mineAt = performance.now();
    if (w && w.drain && typeof BridgeInventory !== 'undefined') {
      var back = Math.max(1, Math.round(dmg * w.drain));
      BridgeInventory.restoreHP(back);
      if (typeof BridgeFX !== 'undefined' && BridgeFX.spawnFloatingText) BridgeFX.spawnFloatingText(BridgeCharacter.getX(), BridgeCharacter.getY() - 0.4, '+' + back, '#80f0a0');
    }
  }
  // every death passes here (interactions.js killHostile): the host tells everyone; anyone else remembers it's done
  function died(w, h, opts) {
    if (!h || !h.fid || applying) return;
    dead[h.fid] = performance.now();
    if (shared() && host()) send('fd', { id: h.fid, x: h.x, y: h.y, by: (opts && opts.by) || myId() });
  }

  // ---- down, and helped up --------------------------------------------------------------------------------------------
  function helpers() { var o = M() ? M().others() : {}; return present().filter(function (p) { return o[p.id] && !isDown(p.id); }); }
  function hookFaint() {
    if (typeof BridgeCombat === 'undefined' || BridgeCombat.__fight) return;
    var faint0 = BridgeCombat.faint;
    BridgeCombat.faint = function () {
      if (down) return;
      if (inWorld() && helpers().length) return goDown(faint0);
      faint0();
    };
    BridgeCombat.__fight = true;
  }
  function goDown(faint0) {
    down = { until: Date.now() + 30000, faint: faint0 };
    if (typeof BridgeControls !== 'undefined') BridgeControls.disable();
    slump();
    if (N()) N().set({ down: true });
    send('dn', { d: 1 });
    sfx('fail');
    banner = document.createElement('div');
    banner.id = 'down-banner';
    banner.innerHTML = '<div class="db-title">YOU\'RE DOWN</div><div class="db-sub"></div><button type="button" class="db-out">Black out</button>';
    banner.querySelector('.db-out').addEventListener('click', function (e) { e.preventDefault(); giveUp(); });
    document.body.appendChild(banner);
    clearInterval(timer);
    timer = setInterval(tickDown, 250);
    tickDown();
  }
  function slump() {                                          // sat where you fell (the seated sheet, low on the ground)
    if (typeof BridgeCharacter === 'undefined' || BridgeCharacter.isSeated()) return;
    BridgeCharacter.sit({ x: BridgeCharacter.getX() + 0.5, y: BridgeCharacter.getY() + 1 - 3 / 32 + 0.3, facing: 'down' });
  }
  function tickDown() {
    if (!down) return;
    slump();
    var hs = helpers(), left = Math.max(0, Math.ceil((down.until - Date.now()) / 1000));
    if (!hs.length || left <= 0) { giveUp(); return; }
    var sub = banner && banner.querySelector('.db-sub');
    if (sub) sub.textContent = hs.map(function (p) { return cap(p.name); }).join(' or ') + ' can help you up · ' + left;
  }
  function getUp() {
    var was = down;
    down = null;
    clearInterval(timer);
    if (banner) { banner.remove(); banner = null; }
    if (typeof BridgeCharacter !== 'undefined') BridgeCharacter.stand();
    if (N()) N().set({ down: false });
    send('dn', { d: 0 });
    return was;
  }
  function giveUp() { var was = getUp(); if (was && was.faint) was.faint(); }
  function onUp(d, from) {
    if (!down || !d || d.i !== here()) return;
    getUp();
    var st = BridgeInventory.getStats();
    BridgeInventory.restoreHP(Math.ceil(st.maxHP / 3));
    if (typeof BridgeControls !== 'undefined') BridgeControls.enable();
    var p = N() && N().peer(from);
    sfx('success');
    toast('Back on your feet', (p ? cap(p.name) : 'Someone') + ' helped you up', 'Watch the ground');
  }
  function helpUp(id) {
    send('up', {}, id);
    downIds[id] = false;
    sfx('pickup');
    var p = N() && N().peer(id);
    toast('You help ' + (p ? cap(p.name) : 'them') + ' up', 'A hand, and they\'re on their feet', '');
  }

  // ---- the loop -------------------------------------------------------------------------------------------------------
  function frame() {
    requestAnimationFrame(frame);
    var w = inWorld() ? world() : null, now = performance.now();
    if (w !== lastWorld) {                                    // somewhere new: you're the latest here; ask what's what
      lastWorld = w; dead = {}; snapJson = ''; gotSnap = 0; asked = 0; arrivedAt = now;
      since = Date.now();
      if (N()) N().set({ since: since });
      if (down) giveUp();
    }
    if (!w || !shared()) return;
    if (host()) sendSnap(now);
    else if (!gotSnap && asked < 3 && now - arrivedAt > 400 + asked * 1200) { asked++; send('fs?', {}); }
  }

  function wire() {
    var n = N();
    if (!n) return;
    n.on('fs', onSnap);
    n.on('fs?', function (d) { if (d && d.i === here() && host()) wantSnap = true; });
    n.on('fw', onWind);
    n.on('fc', onCancel);
    n.on('fh', onHit);
    n.on('fd', onDie);
    n.on('dn', function (d, from) { if (d && d.i === here()) downIds[from] = !!d.d; });
    n.on('up', onUp);
    n.on('leave', function (p, id) { delete downIds[id]; });
  }
  document.addEventListener('visibilitychange', function () { if (N()) N().set({ away: document.hidden }); });

  hookFaint();
  wire();
  if (M()) {
    M().promptFor = function (id) { return isDown(id) ? 'PRESS E TO HELP UP' : null; };
    M().direct = function (id) { if (!isDown(id)) return false; helpUp(id); return true; };
    M().isDown = isDown;
  }
  requestAnimationFrame(frame);

  return { shared: shared, host: host, targets: targets, follower: follower, sendHit: sendHit, struck: struck, wound: wound, died: died,
           near: near, company: company, isDown: isDown, down: function () { return !!down; }, _present: present };
})();
