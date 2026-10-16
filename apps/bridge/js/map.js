/**
 * BridgeMap — the menu's Map tab: where you are, and every place you know.
 *
 * Here: the place you're in (or one you pick from All places), drawn small from its own scene render
 * (assets/scenes/<id>/full.png at 32 px a tile, cropped to the world's `view` if it has one) with you on it, and a
 * marker for each thing worth finding: people (named once you've met them, "Someone" before), shops and traders, the
 * ways in and out (where they lead once you've been there — "?" before), your ship, shuttle and sloop, fishing spots,
 * things to gather, games, what's yours (chests, homes, the farm), useful things (wells, notice boards) and the quest
 * clues you've found. Point at or tap a marker for its name; the legend beside the map counts them and picks one kind.
 * Markers come from the world's interactions — the live ones for where you stand (so what the JS adds as a world loads
 * is there), the world JSON plus the fishing and forage spots for anywhere else.
 *
 * All places: every system as a card (its planet drawn live by js/orbit.js), its places as a tree from where the
 * shuttle sets down — which door leads where (assets/atlas.json, written by tools/bridge-art/atlas.py) — Lumar's by
 * island. Places you've been are named and open their map; a way on from one of them you haven't taken shows as "?";
 * anything further stays hidden. The bridge's chart desk opens it (js/worlds/bridge.js).
 *
 * Where you've been is the journal's first-arrival record (BridgeQuests.visited(), localStorage bridge_log_seen), plus
 * the sea chart's islands and the nav chart's systems for saves older than that.
 *
 *   BridgeMap.visited(id) / placeName(id) / regionOf(id) / newDoors(worldId) / unseenSystems() / ready(fn)
 */
var BridgeMap = (function () {
  var atlas = null, waiting = [];
  var KINDS = { ship: 'Your ship, the Wayfarer', lumar: 'Ocean world · the spore seas', arcadia: 'City world · the night side lit', enigma: 'Listening post · a ringed giant',
                singularity: 'Black hole · the Brink', verdance: 'Garden world · two small moons', hoarfell: 'Ice world · the Hoarspire',
                sylvara: 'Forest world · the wood elves' };
  var PLANET = { lumar: 'lumar', arcadia: 'arcadia', enigma: 'enigma', singularity: 'singularity', verdance: 'verdance', hoarfell: 'hoarfell', sylvara: 'sylvara' };
  var SYS_RX = { ship: /^(bridge|quarters|hangar|gameroom)$/, lumar: /^lumar/, arcadia: /^(arcadia|cyber-noodle|chrome-clinic|junk-pawn|tech-repair|null-den)/,
                 enigma: /^enigma/, singularity: /^singularity/, verdance: /^verdance/, hoarfell: /^hoarfell/, sylvara: /^sylvara/ };
  var MERGE = { 'lumar-rose-mine-b': 'lumar-rose-mine-a', 'lumar-rose-mine-c': 'lumar-rose-mine-a' };

  fetch('/bridge/assets/atlas.json?v=' + Date.now()).then(function (r) { return r.json(); })
    .then(function (d) { atlas = d; }).catch(function () { atlas = { systems: [], isles: [], worlds: {} }; })
    .then(function () { var w = waiting; waiting = []; w.forEach(function (f) { f(); }); });
  function ready(fn) { if (atlas) fn(); else waiting.push(fn); }

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function title(t) { return String(t || '').toLowerCase().replace(/(^|[\s\-\/(&])([a-zà-ÿ])/g, function (m, a, b) { return a + b.toUpperCase(); }); }
  function here() { return typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId ? BridgeWorld.getWorldId() : null; }
  function W(id) { return atlas && atlas.worlds[MERGE[id] || id] || null; }

  // ---- what you know ----------------------------------------------------------------------------------------------
  function seen() {
    var out = {}, s = typeof BridgeQuests !== 'undefined' && BridgeQuests.visited ? BridgeQuests.visited() : {};
    Object.keys(s || {}).forEach(function (k) { out[MERGE[k] || k] = 1; });
    try {                                                                          // older saves: the charts know a little
      var nav = JSON.parse(localStorage.getItem('bridge_visited') || '{}') || {};
      Object.keys(nav).forEach(function (k) { out[k] = 1; });
    } catch (e) { /* none */ }
    if (typeof BridgeChart !== 'undefined' && BridgeChart._state) Object.keys(BridgeChart._state().visited || {}).forEach(function (k) { out[k] = 1; });
    var h = here();
    if (h) out[MERGE[h] || h] = 1;
    out.bridge = 1;                                                                // the Wayfarer's bridge: where every pilot starts
    return out;
  }
  function visited(id) { return !!id && !!seen()[MERGE[id] || id]; }
  function placeName(id) { var w = W(id); return w ? w.name : title(String(id || '').replace(/-/g, ' ')); }
  function sysOf(id) {
    var w = W(id);
    if (w) return w.sys;
    for (var s in SYS_RX) if (SYS_RX[s].test(id || '')) return s;
    return null;
  }
  function sysName(s) { var S = atlas && atlas.systems.filter(function (x) { return x.id === s; })[0]; return S ? S.name : title(s || ''); }
  function isleName(isle) {
    var I = typeof BridgeVoyage !== 'undefined' && BridgeVoyage._isles && BridgeVoyage._isles[isle];
    return I && I.name ? I.name : placeName(isle);
  }
  function regionOf(id) { var w = W(id); return w && w.isle ? isleName(w.isle) : sysName(sysOf(id)); }
  function whereIs(id) {                                           // "Lumar · Diggen's Point" (never the place's own name again)
    var w = W(id), parts = [sysName(sysOf(id))], me = placeName(id);
    if (w && w.isle && isleName(w.isle) !== me) parts.push(isleName(w.isle));
    return parts.filter(function (p) { return p && p !== me; }).join(' \u00b7 ');
  }

  // ---- markers ----------------------------------------------------------------------------------------------------
  var CATS = {
    person: { name: 'People', col: '#e3a33a', g: ['..###..', '..###..', '...#...', '.#####.', '#######', '#######', '.......'] },
    shop:   { name: 'Shops and traders', col: '#3c94d6', g: ['..###..', '.#####.', '##.#.##', '##...##', '##.#.##', '.#####.', '..###..'] },
    door:   { name: 'Ways in and out', col: '#2aa88a', g: ['.#####.', '.#...#.', '.#...#.', '.#..##.', '.#...#.', '.#...#.', '.#####.'] },
    travel: { name: 'Ship, shuttle and sloop', col: '#8566e0', g: ['...#...', '..#.#..', '...#...', '#######', '...#...', '#..#..#', '.#####.'] },
    fish:   { name: 'Fishing spots', col: '#2a86b8', g: ['.......', '..##..#', '.####.#', '#.#####', '.####.#', '..##..#', '.......'] },
    forage: { name: 'Things to gather', col: '#62a83a', g: ['...#...', '..###..', '.#####.', '.##.##.', '..###..', '...#...', '...#...'] },
    game:   { name: 'Games', col: '#d24f96', g: ['...#...', '..###..', '#######', '.#####.', '..###..', '.##.##.', '##...##'] },
    home:   { name: 'Yours', col: '#d8643a', g: ['...#...', '..###..', '.#####.', '#######', '.#...#.', '.#.#.#.', '.#.#.#.'] },
    use:    { name: 'Useful things', col: '#8a7a5a', g: ['.......', '.#####.', '.#...#.', '.#####.', '.#...#.', '.#####.', '.......'] },
    clue:   { name: 'Clues you\'ve found', col: '#e2b632', g: ['..###..', '..###..', '..###..', '..###..', '...#...', '.......', '..###..'] }
  };
  var UNKNOWN = ['..###..', '.#...#.', '.....#.', '....#..', '...#...', '.......', '...#...'];
  var glyphs = {};
  function glyph(rows) {
    var k = rows.join('');
    if (glyphs[k]) return glyphs[k];
    var c = document.createElement('canvas');
    c.width = c.height = 7;
    var g = c.getContext('2d');
    g.fillStyle = '#fff';
    rows.forEach(function (r, y) { for (var x = 0; x < 7; x++) if (r[x] === '#') g.fillRect(x, y, 1, 1); });
    return (glyphs[k] = c.toDataURL());
  }

  var DOOR = { enter_world: 1, leave_world: 1, password_gate: 1, home_door: 1, club_door: 1, farm_house: 1, palace_gate: 1, lift: 1, mine_lift: 1,
               mine_up: 1, mine_down: 1, climb: 1, ski_start: 1, park_start: 1 };
  var SHOP = { vendor: 'sells', shop: 'fittings and decor', catalog: 'decor', outfitter: 'clothes and packs', trader: 'buys anything', chandler: 'fittings, chests, packs - and buys anything',
               sell: 'buys', exchange: 'prices across the seas', charters: 'charters', registry: 'ships\' registry', charts: 'sea charts', sea_chart: 'the sea chart',
               rest: 'a bed for the night', lodge_room: 'a room for the night', clinic: 'patches you up', rummage: 'rummage for things', hands: 'hands for your ships',
               commissions: 'the Crown\'s commissions', pachinko_prizes: 'cash in balls', audience: 'an audience' };
  var GAME = { cabinet: 1, game_slot: 1, app: 1, pachinko: 1, casino: 1, dance: 1, splice: 1, dice: 1, fortune: 1, busker: 1, game_scores: 1, park_tow: 1, ski_gate: 1, ski_here: 1 };
  var USE = { farm_well: 'fills a watering can', farm_tools: 'tools', farm_bin: 'the shipping bin', farm_barn: 'the barn', farm_board: 'orders', farm_ledger: 'the farm\'s books',
              mine_rack: 'pickaxes', mine_slate: 'your deepest floor', lodge_fire: 'warm up', lodge_board: 'the board', climb_board: 'the routes', climb_register: 'the summit register',
              park_board: 'scores', ski_wax: 'wax your skis', stats_panel: 'the ship\'s logs', locker: 'your decor', catalog: 'decor' };

  function cluesHere(wid) {                                        // the quest clues you've found in this world: label → quest
    var out = {};
    if (typeof BridgeQuests === 'undefined' || !BridgeQuests.found) return out;
    BridgeQuests.found().forEach(function (f) {
      var p = f.id.split('/'), q = BridgeQuests.def(p[0]);
      if (!q) return;
      q.clues.forEach(function (c) {
        if (c.id !== p[1]) return;
        var w = c.on.world;
        if (w === wid || (w.slice(-1) === '*' && wid.indexOf(w.slice(0, -1)) === 0)) out[c.on.label] = q.title;
      });
    });
    return out;
  }
  function exitByLabel(wid, label, x, y) {
    var w = W(wid);
    if (!w) return null;
    var hit = null;
    w.exits.forEach(function (e) {
      if (e.label !== label) return;
      if (!hit || (e.x === x && e.y === y)) hit = e;
    });
    return hit;
  }

  // what an interaction is on the map (null: scenery, not worth a marker)
  function classify(it, wid, clues, mine) {
    var t = it.type, label = it.label || '', P = typeof BridgePeople !== 'undefined' ? BridgePeople : null;
    if (it._piece && t !== 'chest') return null;                       // furniture you put down (bar the chests)
    var person = (t === 'dialog' || t === 'random_dialog') && P && P.find(wid, label);
    if (person) {
      var met = P.met(person.id);
      return { cat: 'person', name: met ? person.name : 'Someone', sub: met ? person.role : 'You haven\'t met yet' + (clues[label] ? ' · a clue in ' + clues[label] : '') };
    }
    var ex = exitByLabel(wid, label, it.x, it.y);
    if (DOOR[t] || (ex && t !== 'dialog' && t !== 'random_dialog') || (ex && (label === 'FARMHOUSE' || label === 'PALACE GATE' || label === 'CLUB VOID' || label === 'CAPSULE HOTEL' || label === 'WHITE HOUSE'))) {
      var to = MERGE[it.target] || it.target || it.leaveTo || it.targetWorld || (ex && ex.to) || null;
      if (t === 'home_door' && typeof BridgeHome !== 'undefined' && BridgeHome.HOMES) to = it.homeId;
      if (!to && t === 'leave_world') return { cat: 'travel', name: 'Back to the ship', sub: 'the shuttle' };
      if (!to) return { cat: 'door', name: title(label), sub: '', unknown: false };
      var known = visited(to), mine2 = typeof BridgeHome !== 'undefined' && BridgeHome.owns && BridgeHome.HOMES && BridgeHome.HOMES[to] && !BridgeHome.HOMES[to].ship && BridgeHome.owns(to);
      return { cat: mine2 ? 'home' : 'door', name: known ? placeName(to) : title(label) || 'A way on', target: to, unknown: !known,
               sub: known ? (to === here() ? 'You are here' : 'Leads to ' + placeName(to) + (sysOf(to) !== sysOf(wid) ? ', ' + regionOf(to) : '')) : 'Somewhere you haven\'t been' };
    }
    if (t === 'shuttle') return { cat: 'travel', name: wid === 'hangar' ? 'The shuttle' : 'Your shuttle', sub: wid === 'hangar' ? 'Down to the world below' : 'Back up to the Wayfarer' };
    if (t === 'go_sailing' || t === 'sail_to' || (t === 'menu' && label === 'DOCK')) {
      var ships = typeof BridgeFleet !== 'undefined' && W(wid) && W(wid).isle ? BridgeFleet.all().filter(function (s) { return s.type !== 'sloop' && s.at === W(wid).isle; }) : [];
      return { cat: 'travel', name: 'Your sloop', sub: 'Go sailing' + (ships.length ? ' · also here: ' + ships.map(function (s) { return s.name; }).join(', ') : '') };
    }
    if (t === 'warp_map') return { cat: 'travel', name: 'The helm', sub: 'The nav chart: jump to another world' };
    if (t === 'chest') return { cat: 'home', name: title(label), sub: 'A chest of yours' };
    if (t === 'outfitter' && it.wardrobe) return { cat: 'home', name: title(label), sub: 'Your wardrobe: change what you wear' };
    if (t === 'holm' && it.action === 'ledger') return { cat: 'home', name: 'The holm\'s ledger', sub: 'your island' };
    if (t === 'fish') return { cat: 'fish', name: 'Fishing spot', sub: title(label) };
    if (t === 'forage') {
      var rd = typeof BridgeForage !== 'undefined' && BridgeForage.ready ? BridgeForage.ready(it) : true;
      return { cat: 'forage', name: title(label), sub: rd ? 'Ready to gather' : 'Growing back' };
    }
    if (GAME[t]) return { cat: 'game', name: title(label), sub: t === 'dance' ? 'the dance floor' : t === 'splice' ? 'jobs' : 'a game' };
    if (SHOP[t]) {
      var sub = SHOP[t];
      if (t === 'vendor' && it.items && it.items.length && typeof BridgeItems !== 'undefined') {
        sub = 'Sells ' + it.items.slice(0, 3).map(function (x) { var i = BridgeItems.get(x.id); return i ? i.name.toLowerCase() : x.id; }).join(', ') + (it.items.length > 3 ? '…' : '');
      }
      return { cat: 'shop', name: title(label), sub: sub.charAt(0).toUpperCase() + sub.slice(1) };
    }
    if (USE[t]) return { cat: 'use', name: title(label), sub: USE[t].charAt(0).toUpperCase() + USE[t].slice(1) };
    if (clues[label]) return { cat: 'clue', name: title(label), sub: 'A clue in ' + clues[label] };
    return null;
  }

  // the markers for a world: one per thing (a door three tiles wide is one door)
  function markersFor(wid, data) {
    var clues = cluesHere(wid), out = [];
    (data.interactions || []).forEach(function (it) {
      if (typeof it.x !== 'number') return;
      var m = classify(it, wid, clues);
      if (!m) return;
      var same = out.filter(function (o) { return o.cat === m.cat && o.name === m.name && o.target === m.target && Math.abs(o.x - it.x) <= 2 && Math.abs(o.y - it.y) <= 2 &&
                                                   (m.cat !== 'person' || o.lab === it.label); })[0];   // two people you haven't met are two "Someone"s
      if (same) { same.n++; same.sx += it.x; same.sy += it.y; same.x = same.sx / same.n; same.y = same.sy / same.n; return; }
      m.x = m.sx = it.x; m.y = m.sy = it.y; m.n = 1; m.lab = it.label;
      out.push(m);
    });
    return out;
  }

  // ---- the render, small ------------------------------------------------------------------------------------------
  var thumbs = {}, thumbOrder = [];
  function scaleDown(img, k) {                                     // a smooth, two-step reduction (a sharp one shimmers)
    var w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k)), src = img;
    if (k < 0.5) {
      var mid = document.createElement('canvas');
      mid.width = Math.round(img.width / 2); mid.height = Math.round(img.height / 2);
      var mg = mid.getContext('2d'); mg.imageSmoothingEnabled = true; mg.imageSmoothingQuality = 'high';
      mg.drawImage(img, 0, 0, mid.width, mid.height);
      src = mid;
    }
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, w, h);
    return c;
  }
  var K = 0.5;                                                     // thumbs at 16 px a tile
  function sceneThumb(sceneId, live, cb) {
    var sc = live && typeof BridgeScene !== 'undefined' && BridgeScene.get ? BridgeScene.get(sceneId) : null;
    if (sc && sc.meta && sc.imgs) {                                // where you are: the render already in memory, as it looks now
      var img = sc.imgs[sc.meta.states[0]] || sc.imgs.full;
      if (img && img.width) { cb({ c: scaleDown(img, K), meta: sc.meta }); return; }
    }
    if (thumbs[sceneId]) { cb(thumbs[sceneId]); return; }
    fetch('/bridge/assets/scenes/' + sceneId + '/scene.json?v=' + Date.now()).then(function (r) { return r.json(); }).then(function (meta) {
      var im = new Image();
      im.onload = function () {
        var t = thumbs[sceneId] = { c: scaleDown(im, K), meta: meta };
        im.onload = im.onerror = null;                              // (clearing src fires an error)
        im.src = '';
        thumbOrder.push(sceneId);
        if (thumbOrder.length > 6) delete thumbs[thumbOrder.shift()];
        cb(t);
      };
      im.onerror = function () { cb(null); };
      im.src = '/bridge/assets/scenes/' + sceneId + '/' + (meta.states && meta.states[0] || 'full') + '.png?v=' + (meta.rev || Date.now());
    }).catch(function () { cb(null); });
  }
  // a world's data: where you are, the live one; anywhere else its JSON with what the JS would add (fish, forage, shops)
  var spotFiles = null;
  function worldData(wid, cb) {
    if (wid === here() && typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorld()) return cb(BridgeWorld.getWorld(), true);
    fetch('/bridge/assets/worlds/' + wid + '.json?v=' + Date.now()).then(function (r) { return r.json(); }).then(function (d) {
      d.interactions = d.interactions || [];
      try {
        if (typeof BridgeFishing !== 'undefined') BridgeFishing.decorate(wid, d);
        if (typeof BridgeForage !== 'undefined') BridgeForage.decorate(wid, d);
        if (typeof BridgeGear !== 'undefined') BridgeGear.decorate(wid, d);
        if (typeof BridgeStorage !== 'undefined') BridgeStorage.decorate(wid, d);
        if (typeof BridgeScene !== 'undefined' && BridgeScene.walkerInteractions) d.interactions = d.interactions.concat(BridgeScene.walkerInteractions(wid));   // people out walking
      } catch (e) { /* the map does without */ }
      cb(d, false);
    }).catch(function () { cb(null, false); });
  }

  // ---- the page -----------------------------------------------------------------------------------------------------
  var root = null, mode = 'here', viewing = null, filter = null, picked = null, mk = [], ctx = null;
  function render(el, opts) {
    opts = opts || {};
    if (opts.world) { mode = 'here'; viewing = MERGE[opts.world] || opts.world; }
    else if (opts.all) mode = 'all';
    else { mode = 'here'; viewing = null; }
    if (!viewing || !visited(viewing)) viewing = null;
    filter = null; picked = null;
    root = document.createElement('div');
    root.className = 'mp';
    el.appendChild(root);
    ready(draw);
  }
  function draw() {
    if (!root) return;
    var cur = viewing || here(), onLumar = typeof BridgeChart !== 'undefined' && BridgeChart.known && W(here()) && W(here()).sys === 'lumar';
    root.innerHTML = '<div class="gm-head"><span class="gm-title">Map</span><div class="mp-seg" role="tablist">' +
      '<button type="button" data-v="here" class="' + (mode === 'here' ? 'on' : '') + '">' + esc(viewing && viewing !== here() ? placeName(viewing) : 'Here') + '</button>' +
      '<button type="button" data-v="all" class="' + (mode === 'all' ? 'on' : '') + '">All places</button></div>' +
      (viewing && viewing !== here() && mode === 'here' ? '<button type="button" class="gm-btn gm-btn-sm" data-a="home">Back to where you are</button>' : '') +
      (onLumar ? '<button type="button" class="gm-btn gm-btn-sm" data-a="chart"><span class="ip-key">C</span>Sea chart</button>' : '') + '</div>' +
      '<div class="mp-body"></div>';
    root.querySelectorAll('.mp-seg button').forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); mode = b.getAttribute('data-v'); if (mode === 'here' && b.textContent === 'Here') viewing = null; draw(); });
    });
    var hb = root.querySelector('[data-a="home"]');
    if (hb) hb.addEventListener('click', function (e) { e.stopPropagation(); viewing = null; mode = 'here'; draw(); });
    var cb = root.querySelector('[data-a="chart"]');
    if (cb) cb.addEventListener('click', function (e) { e.stopPropagation(); openChart(); });
    var body = root.querySelector('.mp-body');
    if (mode === 'all') renderAll(body); else renderHere(body, cur);
  }
  function openChart() {
    if (typeof BridgeMenu !== 'undefined') BridgeMenu.close();
    if (typeof BridgeChart !== 'undefined') setTimeout(function () { BridgeChart.open(); }, 0);
  }

  // ---- Here --------------------------------------------------------------------------------------------------------
  function renderHere(body, wid) {
    if (!wid) { body.innerHTML = '<div class="mp-empty">Nowhere to map.</div>'; return; }
    var live = wid === here();
    body.innerHTML = '<div class="mp-here"><div class="mp-mapbox"><div class="mp-frame"><canvas class="mp-canvas"></canvas><div class="mp-pins"></div>' +
      '<div class="mp-tip"></div></div><div class="mp-loading">Unrolling the map…</div></div>' +
      '<aside class="mp-side"><div class="mp-place"></div><div class="mp-info"></div><div class="mp-legend"></div></aside></div>';
    var place = body.querySelector('.mp-place');
    var w = W(wid);
    var wi = whereIs(wid);
    place.innerHTML = '<div class="mp-place-name">' + esc(placeName(wid)) + '</div><div class="mp-place-where">' + (wi ? esc(wi) + ' \u00b7 ' : '') +
      (live ? '<b>you are here</b>' : 'you\'ve been here') + '</div>';
    worldData(wid, function (data) {
      if (!root || !body.isConnected) return;
      if (!data) { body.querySelector('.mp-loading').textContent = 'No map of this place.'; return; }
      mk = markersFor(wid, data);
      if (live && typeof BridgeCharacter !== 'undefined') {
        var p = BridgeCharacter.getRenderPos ? BridgeCharacter.getRenderPos() : { x: BridgeCharacter.getX(), y: BridgeCharacter.getY() };
        mk.push({ cat: 'you', name: 'You', sub: 'You are here', x: p.x, y: p.y, n: 1 });
      }
      legend(body);
      var sceneId = data.scene && data.scene.id;
      var go = function (thumb) {
        if (!root || !body.isConnected) return;
        body.querySelector('.mp-loading').style.display = 'none';
        drawMap(body, data, thumb);
      };
      if (sceneId) sceneThumb(sceneId, live, go); else go(null);
    });
  }

  // the crop (in tiles) and how big it can be drawn in the box
  function crop(data, thumb) {
    var x0 = -0.5, y0 = -0.5, x1 = data.width + 0.5, y1 = data.height + 0.5;
    if (thumb) {
      var m = thumb.meta;
      x0 = -m.originX / 32; y0 = -m.originY / 32; x1 = (m.width - m.originX) / 32; y1 = (m.height - m.originY) / 32;
    }
    if (data.view) { x0 = Math.max(x0, data.view[0]); y0 = Math.max(y0, data.view[1]); x1 = Math.min(x1, data.view[2]); y1 = Math.min(y1, data.view[3]); }
    return { x0: x0, y0: y0, x1: x1, y1: y1 };
  }
  function drawMap(body, data, thumb) {
    var box = body.querySelector('.mp-mapbox'), frame = body.querySelector('.mp-frame'), cv = body.querySelector('.mp-canvas'), pins = body.querySelector('.mp-pins');
    var C = crop(data, thumb), tw = C.x1 - C.x0, th = C.y1 - C.y0;
    var bw = Math.max(120, box.clientWidth - 8), bh = Math.max(120, box.clientHeight - 8);
    var one = getComputedStyle(body.querySelector('.mp-here')).gridTemplateColumns.split(' ').length === 1;
    if (one) { bh = Math.min(window.innerHeight * 0.6, bw * (C.y1 - C.y0) / (C.x1 - C.x0)); box.style.height = Math.ceil(bh + 8) + 'px'; }
    var s = Math.min(bw / tw, bh / th);                             // CSS px a tile
    var cw = Math.floor(tw * s), ch = Math.floor(th * s), dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    frame.style.width = cw + 'px'; frame.style.height = ch + 'px';
    var g = cv.getContext('2d');
    g.fillStyle = mapGround(data); g.fillRect(0, 0, cv.width, cv.height);
    if (thumb) {
      var m = thumb.meta, k = thumb.c.width / m.width;                // thumb px per render px
      var sx = (C.x0 * 32 + m.originX) * k, sy = (C.y0 * 32 + m.originY) * k, sw = tw * 32 * k, sh = th * 32 * k;
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      var lift = mapLift(data);
      if (lift && 'filter' in g) g.filter = lift;
      g.drawImage(thumb.c, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
      g.filter = 'none';
    } else {                                                          // no render: the floor plan from the collision grid
      var u = s * dpr;
      for (var y = 0; y < data.height; y++) for (var x = 0; x < data.width; x++) {
        var solid = data.collisions && data.collisions[y] && data.collisions[y][x];
        g.fillStyle = solid ? 'rgba(0,0,0,0.35)' : 'rgba(255,240,210,0.22)';
        g.fillRect(Math.floor((x - C.x0) * u), Math.floor((y - C.y0) * u), Math.ceil(u), Math.ceil(u));
      }
    }
    // the markers
    pins.innerHTML = '';
    var tip = body.querySelector('.mp-tip');
    mk.forEach(function (m, i) {
      if (m.x < C.x0 - 0.5 || m.y < C.y0 - 0.5 || m.x > C.x1 + 0.5 || m.y > C.y1 + 0.5) { m.off = true; }
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mp-pin mp-' + m.cat + (m.unknown ? ' mp-unknown' : '');
      var px = Math.max(8, Math.min(cw - 8, (m.x + 0.5 - C.x0) * s)), py = Math.max(8, Math.min(ch - 8, (m.y + 0.5 - C.y0) * s));
      b.style.left = px + 'px'; b.style.top = py + 'px';
      if (m.cat !== 'you') {
        var C2 = CATS[m.cat];
        b.style.setProperty('--pin', m.unknown ? '#7c7468' : C2.col);
        b.innerHTML = '<img alt="" src="' + glyph(m.unknown ? UNKNOWN : C2.g) + '">';
      } else b.innerHTML = '<i></i>';
      b.setAttribute('aria-label', m.name);
      m.el = b;
      var showTip = function () {
        tip.innerHTML = '<b>' + esc(m.name) + '</b>' + (m.sub ? '<span>' + esc(m.sub) + '</span>' : '');
        tip.style.left = px + 'px'; tip.style.top = py + 'px';
        tip.classList.toggle('below', py < 60);
        tip.classList.toggle('left', px > cw - 110); tip.classList.toggle('right', px < 110);
        tip.classList.add('on');
      };
      b.addEventListener('mouseenter', showTip);
      b.addEventListener('mouseleave', function () { tip.classList.remove('on'); });
      b.addEventListener('focus', showTip);
      b.addEventListener('blur', function () { tip.classList.remove('on'); });
      b.addEventListener('click', function (e) { e.stopPropagation(); showTip(); pick(m, body); });
      pins.appendChild(b);
    });
    applyFilter();
  }
  function mapGround(data) {
    var ts = data.tileset || '';
    if (/^lumar|tavern|cave|tower/.test(ts) && data.scene && data.scene.backdrop) return '#0d2a26';      // the night sea round an island
    if (ts === 'verdance') return '#3e6a32';
    if (ts === 'hoarfell') return '#c8d2e4';
    if (ts === 'sylvara') return data.indoors ? '#3a2a20' : '#3e5a30';                                    // bark in the hall, moss in the glade
    return '#0b0a12';
  }
  function mapLift(data) {                                          // night worlds lifted a little to read; dusk a touch; day not at all
    var ts = data.tileset || '';
    if (/^(verdance|hoarfell)/.test(ts)) return null;
    if (ts === 'sylvara') return 'brightness(1.16) saturate(1.04)';
    return 'brightness(1.32) saturate(1.08)';
  }
  // the legend: what kinds are here, how many; pick one to see only those
  function legend(body) {
    var L = body.querySelector('.mp-legend'), counts = {};
    mk.forEach(function (m) { if (m.cat !== 'you') counts[m.cat] = (counts[m.cat] || 0) + 1; });
    var cats = Object.keys(CATS).filter(function (c) { return counts[c]; });
    L.innerHTML = '<div class="mp-legend-head">On this map</div>' + (cats.length ? cats.map(function (c) {
      return '<button type="button" class="mp-key' + (filter === c ? ' on' : '') + '" data-c="' + c + '"><span class="mp-pin mp-' + c + '" style="--pin:' + CATS[c].col + '"><img alt="" src="' + glyph(CATS[c].g) + '"></span>' +
        '<span class="mp-key-name">' + esc(CATS[c].name) + '</span><span class="mp-key-n">' + counts[c] + '</span></button>';
    }).join('') : '<div class="mp-empty">Nothing marked here yet.</div>') +
      '<div class="mp-key mp-key-static"><span class="mp-pin mp-unknown" style="--pin:#7c7468"><img alt="" src="' + glyph(UNKNOWN) + '"></span><span class="mp-key-name">Not been there yet</span></div>';
    L.querySelectorAll('.mp-key[data-c]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var c = b.getAttribute('data-c');
        filter = filter === c ? null : c;
        L.querySelectorAll('.mp-key[data-c]').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-c') === filter); });
        applyFilter();
        info(body, filter ? listOf(filter) : null);
      });
    });
    info(body, null);
  }
  function listOf(c) {
    var items = mk.filter(function (m) { return m.cat === c; });
    return '<div class="mp-info-head">' + esc(CATS[c].name) + '</div><ul class="mp-list">' + items.map(function (m) {
      return '<li><b>' + esc(m.name) + '</b>' + (m.sub ? ' · ' + esc(m.sub) : '') + '</li>';
    }).join('') + '</ul>';
  }
  function applyFilter() {
    mk.forEach(function (m) { if (m.el) m.el.classList.toggle('dim', !!filter && m.cat !== filter && m.cat !== 'you'); });
  }
  function pick(m, body) {
    picked = m;
    mk.forEach(function (x) { if (x.el) x.el.classList.toggle('picked', x === m); });
    var go = m.target && !m.unknown && m.target !== (viewing || here()) && visited(m.target);
    info(body, '<div class="mp-info-head">' + esc(m.name) + '</div>' + (m.sub ? '<div class="mp-info-sub">' + esc(m.sub) + '</div>' : '') +
      (go ? '<button type="button" class="gm-btn gm-btn-sm" data-go="' + esc(m.target) + '">Map of ' + esc(placeName(m.target)) + '</button>' : ''));
    var b = body.querySelector('[data-go]');
    if (b) b.addEventListener('click', function (e) { e.stopPropagation(); viewing = b.getAttribute('data-go'); mode = 'here'; draw(); });
  }
  function info(body, html) {
    var I = body.querySelector('.mp-info');
    if (!I) return;
    var tch = document.documentElement.classList.contains('touch');
    I.innerHTML = html || '<div class="mp-info-hint">' + (tch ? 'Tap' : 'Point at') + ' a marker to see what it is. Pick a kind below to see only those.</div>';
  }

  // ---- All places ----------------------------------------------------------------------------------------------------
  function renderAll(body) {
    var S = seen(), h = here(), hs = sysOf(h);
    var wrap = document.createElement('div');
    wrap.className = 'mp-all';
    (atlas.systems || []).forEach(function (sys) {
      var ids = Object.keys(atlas.worlds).filter(function (k) { return atlas.worlds[k].sys === sys.id; });
      var been = ids.filter(function (k) { return S[k]; }).length;
      var card = document.createElement('section');
      card.className = 'mp-sys' + (sys.id === hs ? ' here' : '') + (been ? '' : ' unseen');
      card.innerHTML = '<div class="mp-sys-head"><canvas class="mp-planet" width="40" height="40"></canvas><div class="mp-sys-id"><b>' + esc(sys.name) + '</b><span>' + esc(KINDS[sys.id] || '') + '</span></div>' +
        '<span class="mp-sys-n">' + (sys.id === hs ? 'You are here' : been ? been + ' of ' + ids.length + ' places' : 'Not been yet') + '</span></div>';
      planet(card.querySelector('.mp-planet'), sys.id, !been);
      if (!been) {
        var p = document.createElement('div');
        p.className = 'mp-sys-note';
        p.textContent = sys.id === 'ship' ? '' : 'Jump here from the helm on the Wayfarer\'s bridge, then take the shuttle down.';
        card.appendChild(p);
      } else if (sys.id === 'lumar') {
        var isles = atlas.isles || [], hidden = 0;
        isles.forEach(function (isle) {
          var known = typeof BridgeChart !== 'undefined' && BridgeChart.known ? BridgeChart.known(isle) : false;
          var inIsle = ids.filter(function (k) { return atlas.worlds[k].isle === isle; });
          var beenIsle = inIsle.some(function (k) { return S[k]; });
          if (!beenIsle && !known) { hidden++; return; }
          var sub = document.createElement('div');
          sub.className = 'mp-isle' + (beenIsle ? '' : ' unseen') + (atlas.worlds[h] && atlas.worlds[h].isle === isle ? ' here' : '');
          sub.innerHTML = '<div class="mp-isle-name">' + esc(isleName(isle)) + (beenIsle ? '' : '<i>on your chart · not been ashore</i>') + '</div>';
          if (beenIsle) sub.appendChild(tree(isle, inIsle, S, h));
          card.appendChild(sub);
        });
        var foot = document.createElement('div');
        foot.className = 'mp-sys-note';
        foot.textContent = 'Between the islands you sail: Go sailing at any pier.' + (hidden ? ' ' + hidden + ' island' + (hidden > 1 ? 's' : '') + ' not on your chart yet.' : '');
        card.appendChild(foot);
      } else {
        card.appendChild(tree(sys.root, ids, S, h));
        if (sys.id === 'ship') {
          var n2 = document.createElement('div');
          n2.className = 'mp-sys-note';
          n2.textContent = 'The helm jumps the ship between worlds; the shuttle in the hangar flies you down to the one below.';
          card.appendChild(n2);
        }
      }
      wrap.appendChild(card);
    });
    body.appendChild(wrap);
    wrap.querySelectorAll('[data-w]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); viewing = b.getAttribute('data-w'); mode = 'here'; draw(); });
    });
  }
  // a system's (or an island's) places as a tree from its root: the places you've been, named; the ways on from them
  // you haven't taken, "?"; nothing past that
  function tree(rootId, ids, S, h) {
    var inSet = {};
    ids.forEach(function (k) { inSet[k] = 1; });
    var parent = {}, via = {}, order = [rootId], kids = {};
    parent[rootId] = null;
    for (var i = 0; i < order.length; i++) {
      var w = atlas.worlds[order[i]];
      (w ? w.exits : []).forEach(function (e) {
        if (!inSet[e.to] || e.to in parent) return;
        parent[e.to] = order[i]; via[e.to] = e.label; order.push(e.to);
        (kids[order[i]] = kids[order[i]] || []).push(e.to);
      });
    }
    ids.forEach(function (k) { if (!(k in parent) && S[k]) { parent[k] = rootId; (kids[rootId] = kids[rootId] || []).push(k); } });   // reached some other way
    function shown(k) { return S[k] || (parent[k] && S[parent[k]]); }
    function items(k) {
      var out = '';
      (kids[k] || []).forEach(function (c) {
        if (shown(c)) out += node(c);
        else out += items(c);                                       // hidden: anything you've been to below it still shows
      });
      return out;
    }
    function node(k) {
      var inner = items(k), cls = 'mp-node' + (k === h ? ' here' : '');
      var label = S[k] ? '<button type="button" class="' + cls + '" data-w="' + esc(k) + '">' + esc(placeName(k)) + (k === h ? ' <i>you are here</i>' : '') + '</button>'
                       : '<span class="mp-node unknown">?<i>' + esc(via[k] ? title(via[k]) + ' \u00b7 not been yet' : 'a way on, not taken yet') + '</i></span>';
      return '<li>' + label + (inner ? '<ul>' + inner + '</ul>' : '') + '</li>';
    }
    var ul = document.createElement('ul');
    ul.className = 'mp-tree';
    ul.innerHTML = shown(rootId) ? node(rootId) : items(rootId);
    return ul;
  }
  function planet(cv, sys, dim) {
    var g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    if (sys === 'ship') {                                           // the Wayfarer: a little galleon
      var rows = ['....................', '.........#..........', '........##..........', '.......###...#......', '......####..##......', '.....#####.###......',
                  '....######.####.....', '.........#..........', '..##################.', '...################..', '....##############...', '.....############....'];
      var pal = { '#': dim ? '#5a5870' : '#d8b860' };
      g.clearRect(0, 0, 40, 40);
      rows.forEach(function (r, y) { for (var x = 0; x < r.length; x++) if (r[x] === '#') { g.fillStyle = y > 7 ? (dim ? '#3a3850' : '#3a3a8a') : pal['#']; g.fillRect(x * 2, 8 + y * 2, 2, 2); } });
      return;
    }
    if (typeof BridgeOrbit === 'undefined') return;
    var kind = BridgeOrbit.kindOf(PLANET[sys]) || 'ocean', now = performance.now();
    if (kind === 'hole') BridgeOrbit.drawHole(g, 20, 20, 13, now); else BridgeOrbit.drawPlanet(g, kind, 20, 20, 16, now);
    if (sys === 'enigma' && BridgeOrbit.drawStation) BridgeOrbit.drawStation(g, 33, 9, 2, now);
    if (dim) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(20,18,30,0.62)'; g.fillRect(0, 0, 40, 40); g.globalCompositeOperation = 'source-over'; }
  }

  // ---- for the journal: what's left to find round here, and out there ---------------------------------------------------
  function newDoors(wid) {
    if (!atlas || !wid) return 0;
    var data = wid === here() && typeof BridgeWorld !== 'undefined' ? BridgeWorld.getWorld() : null;
    if (!data) return 0;
    var clues = {}, n = 0, seenT = {};
    (data.interactions || []).forEach(function (it) {
      var m = classify(it, wid, clues);
      if (m && m.unknown && m.target && !seenT[m.target]) { seenT[m.target] = 1; n++; }
    });
    return n;
  }
  function unseenSystems() {
    if (!atlas) return 0;
    var S = seen();
    return atlas.systems.filter(function (s) { return s.id !== 'ship' && !Object.keys(atlas.worlds).some(function (k) { return atlas.worlds[k].sys === s.id && S[k]; }); }).length;
  }

  if (typeof BridgeMenu !== 'undefined') {
    BridgeMenu.page('map', {
      render: render,
      leave: function () { root = null; mk = []; },
      resize: function () { if (root) draw(); },
      key: function (e) {
        if ((e.key === 'c' || e.key === 'C') && W(here()) && W(here()).sys === 'lumar') { openChart(); return true; }
        if (e.key === 'Escape' && (filter || (viewing && viewing !== here()))) {
          if (filter) { filter = null; draw(); } else { viewing = null; mode = 'here'; draw(); }
          return true;
        }
        return false;
      }
    });
  }

  return { ready: ready, visited: visited, placeName: placeName, regionOf: regionOf, newDoors: newDoors, unseenSystems: unseenSystems,
           markers: function (wid, data) { return markersFor(wid, data || BridgeWorld.getWorld()); }, atlas: function () { return atlas; } };
})();
