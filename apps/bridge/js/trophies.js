/*
 * js/trophies.js — BridgeTrophies: the hall of finds on Starling Holm (the empire plan's chunk 4,
 * `_claude_docs/spec-empire.md`; Beck: the monsters you beat and the relics you dig up yourself go in a trophy hall at
 * your base, the rarest finds always yours to go and get).
 *
 * The hall (`lumar-holm-hall`, scenes/lumar_holm_hall.py) is built from the holm's ledger once the cottage is up. Its
 * render holds the room and its empty furniture; this draws each find on its board, plinth or case once you have it,
 * from the item's own art (the sea legends from js/fishart.js), depth-tested like anything else in the room — so a new
 * find never needs a re-render. Where each goes is the world JSON's `hall.spots` ([id, x, row, z, kind]).
 *
 * What counts as found: anything the Collection has noted (js/codex.js), any fish ever landed (the fishing journal —
 * from a boat too, where the catch goes in her hold), the Undercroft's relics (js/dungeon.js), or the thing in your
 * pack now. Kept in localStorage `bridge_trophies` ({found: {id: time}}), so selling a scale later doesn't empty its
 * plinth. Every spot has a plate: the find, where it came from and when, or for an empty one, a hint where to look.
 */
var BridgeTrophies = (function () {
  'use strict';
  var KEY = 'bridge_trophies', WID = 'lumar-holm-hall', C45 = Math.cos(Math.PI / 4);
  // what goes in the hall: its name on the plate, the line under it, and (empty) where to look
  var T = {
    old_mossback: { name: 'Old Mossback', line: 'The Emerald Sea\'s legend, landed from a boat.', hint: 'THE EMERALD SEA, FROM A BOAT. ONCE IN A LONG WHILE.' },
    crownfin:     { name: 'Crownfin', line: 'The Sapphire Sea\'s legend, landed from a boat.', hint: 'THE SAPPHIRE SEA, FROM A BOAT.' },
    nightglass:   { name: 'The Nightglass Coelacanth', line: 'Out of the Midnight Sea, deep. Nobody had, that anyone remembered.', hint: 'THE MIDNIGHT SEA, FROM A BOAT, DEEP. NOBODY HAS, THAT ANYONE REMEMBERS.' },
    dawnveil:     { name: 'Dawnveil', line: 'The Rose Sea\'s legend, at first light.', hint: 'THE ROSE SEA, FROM A BOAT - AT FIRST LIGHT, THEY SAY.' },
    emberjaw:     { name: 'Emberjaw', line: 'Out of the Crimson Sea. Nobody aboard said its name.', hint: 'THE CRIMSON SEA, FROM A BOAT. DON\'T SAY ITS NAME ABOARD.' },
    lantern_beyond: { name: 'The Lantern Beyond', line: 'Lit from the light past the last ridge. It has never gone out.', hint: 'PAST THE HOARSPIRE, WHERE THE OLD TALE ENDS. THE CURIOS KNOW THE WAY.', glow: '255,214,140' },
    heartsong:    { name: 'Heartsong', line: 'The heart of the great songstone, from the bottom of the Rose Mine. Still singing.', hint: 'THE BOTTOM OF THE ROSE MINE. FLOOR TWENTY, HOB SAYS.', glow: '190,140,255' },
    wispcaller:   { name: 'The Bell Warden\'s Staff', line: 'Taken from the warden of the abbey ruins on Midnight Isle.', hint: 'THE ABBEY RUINS ON MIDNIGHT ISLE. SOMETHING THERE TOLLS.' },
    regatta_cup:  { name: 'The Regatta Cup', line: 'The Emerald Regatta, first across the line.', hint: 'THE EMERALD REGATTA. CROWNHAVEN\'S HARBOUR BOOK SAYS WHEN IT SAILS.' },
    gloam_scale:  { name: 'A Gloamserpent\'s Scale', line: 'Off the serpent of the Midnight Sea. Its spots still glow.', hint: 'SOMETHING LONG AND PALE CIRCLES UNDER BOATS IN THE MIDNIGHT SEA.', glow: '120,220,200' },
    deep_pearl:   { name: 'The Deep Pearl', line: 'From the Deep Maw itself. Something moves inside it, slowly.', hint: 'THE DEEP MAW, FAR OUT IN THE MIDNIGHT SEA. IF YOU LIVE.' },
    veilpiercer:  { name: 'Veilpiercer', line: 'Black glass from the drowned tomb on Midnight Isle.', hint: 'A VIOLET TOMB ON MIDNIGHT ISLE, AND A WIGHT WHO CARRIES ITS KEY.' },
    drowned_bell: { name: 'The Drowned Bell', line: 'From the Undercroft. It rings, very faintly, when nobody touches it.', hint: 'THE UNDERCROFT, UNDER MIDNIGHT ISLE. EACH RELIC TURNS UP ONCE.' },
    wight_lantern: { name: 'A Wight\'s Lantern', line: 'From the Undercroft. The flame is cold, and violet, and doesn\'t go out.', hint: 'THE UNDERCROFT, UNDER MIDNIGHT ISLE.' },
    heron_coin:   { name: 'A Heron Coin', line: 'Silver, from the Heron\'s lost cargo.', hint: 'THE HERON WENT DOWN OFF CRIMSON REACH. THE TIDE BRINGS HER COINS IN.' },
    ferry_coin:   { name: 'The Ferryman\'s Coin', line: 'From the Undercroft. Someone paid their passage with it.', hint: 'THE UNDERCROFT, UNDER MIDNIGHT ISLE.' },
    barrow_crown: { name: 'The Barrow Crown', line: 'From the Undercroft. Too small for any head you know.', hint: 'THE UNDERCROFT, UNDER MIDNIGHT ISLE. THE DEEPER, THE LIKELIER.' },
    star_pearl:   { name: 'A Star Pearl', line: 'From the moon pool. There are stars moving inside it.', hint: 'THE MOON POOL ON MIDNIGHT ISLE. FISH IT.' }
  };
  var KIND = { board: 'BOARD', plinth: 'PLINTH', case: 'CASE', shelf: 'SHELF' };
  // the Cabinet of Wonders' shelves hold what you've made (js/wonders.js); everything else in the hall is a find
  function Wn() { return typeof BridgeWonders !== 'undefined' ? BridgeWonders : null; }
  function info(id, kind) {
    if (kind === 'shelf') { var w = Wn() && Wn().W[id]; return w ? { name: w.name, line: w.what, glow: w.glow, has: Wn().has(id), at: Wn()._state().made[id], where: Wn().where(id) } : null; }
    var t = T[id];
    return t ? { name: t.name, line: t.line, hint: t.hint, glow: t.glow, has: has(id), at: st.found[id] } : null;
  }

  var st = load();
  function load() {
    var d;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    return { found: (d && d.found) || {} };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode */ } }

  // ---- what you've found -------------------------------------------------------------------------------------------
  function sources() {
    var have = {};
    try {
      if (typeof BridgeCodex !== 'undefined' && BridgeCodex._st) Object.keys(BridgeCodex._st().found || {}).forEach(function (id) { have[id] = 1; });
      if (typeof BridgeFishing !== 'undefined' && BridgeFishing.journal) BridgeFishing.journal().fish.forEach(function (f) { if (f.id) have[f.id] = 1; });
      var dg = JSON.parse(localStorage.getItem('bridge_dungeon') || '{}');
      (dg.relics || []).forEach(function (id) { have[id] = 1; });
      if (typeof BridgeInventory !== 'undefined' && BridgeInventory.getCount) Object.keys(T).forEach(function (id) { if (BridgeInventory.getCount(id) > 0) have[id] = 1; });
    } catch (e) { /* a module not there yet */ }
    return have;
  }
  // quietly the first time (what you had already), with a word for anything new after
  function check(quiet) {
    var have = sources(), fresh = [];
    Object.keys(T).forEach(function (id) { if (have[id] && !st.found[id]) { st.found[id] = Date.now(); fresh.push(id); } });
    if (!fresh.length) return fresh;
    save();
    if (!quiet) fresh.forEach(function (id) {
      var built = typeof BridgeHolm !== 'undefined' && BridgeHolm.built && BridgeHolm.built('hall');
      if (typeof BridgeQuests !== 'undefined' && BridgeQuests.note)
        BridgeQuests.note('For the hall', T[id].name, built ? 'Its place in your hall of finds on the holm is ready' : 'Worth keeping somewhere: a hall on your own island, say');
    });
    if (here) refresh();
    return fresh;
  }
  function has(id) { return !!st.found[id]; }

  // ---- in the hall: a plate on every spot, the finds drawn on theirs -----------------------------------------------
  var here = null;                                       // { data, spots }
  function decorate(worldId, data) {
    if (worldId !== WID || !data || !data.hall) { if (worldId !== WID) here = null; return; }
    check(true);
    here = { data: data, spots: data.hall.spots || [] };
    data.interactions = (data.interactions || []).filter(function (it) { return it.type !== 'trophy'; });
    here.spots.forEach(function (s) {
      data.interactions.push({ x: Math.floor(s[1]), y: Math.floor(s[2]), type: 'trophy', id: s[0], kind: s[4], label: '', prompt: 'PRESS E TO LOOK' });
    });
    refresh();
  }
  function refresh() {
    if (!here) return;
    here.data.interactions.forEach(function (it) {
      if (it.type !== 'trophy') return;
      var f = info(it.id, it.kind);
      it.label = f && f.has ? f.name.toUpperCase() : 'EMPTY ' + (KIND[it.kind] || 'PLINTH');
    });
  }
  function look(it) {
    var t = info(it.id, it.kind), c = choose();
    if (!t || !c) return;
    if (it.kind === 'shelf' && !t.has) {
      return c({ title: 'An empty shelf', text: ('A card propped on it in the Cabinet of Wonders: "' + t.name + '." ' + t.line + ' Make it at your workshop - the plan is from ' + t.where + '.').toUpperCase(), closeLabel: 'Done' });
    }
    if (t.has) {
      var d = new Date(t.at);
      var woke = it.kind !== 'shelf' && Wn() ? Object.keys(Wn().W).filter(function (w) { return Wn().W[w].wakes === it.id && Wn().has(w); })[0] : null;   // a relic woken
      c({ title: t.name, text: (t.line + (it.kind === 'shelf' ? ' Made ' : ' Found ') + d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) + '.' +
                                (woke ? ' Woken since: ' + Wn().W[woke].name + ', in the Cabinet of Wonders.' : '')).toUpperCase(),
          art: function (cv) {                           // the find itself, big
            var p = pic(it.id, it.kind);
            if (!p) return;
            cv.width = p.width; cv.height = p.height;
            var g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(p, 0, 0);
            cv.style.width = p.width * 4 + 'px'; cv.style.imageRendering = 'pixelated';
          }, closeLabel: 'Done' });
    } else {
      c({ title: 'An empty ' + (it.kind === 'board' ? 'board' : it.kind === 'case' ? 'place in the case' : 'plinth'),
          text: 'THE PLATE IS BLANK. SOMEONE HAS PENCILLED UNDER IT: "' + t.hint + '"', closeLabel: 'Done' });
    }
  }
  function choose() { return typeof BridgeInteractions !== 'undefined' && BridgeInteractions.choose; }

  // each find's picture, made once: an item at 32 px (two to a tile's 16 units), a legend at its own length on its board
  var pics = {};
  function pic(id, kind) {
    var key = id + ':' + kind;
    if (pics[key]) return pics[key];
    var c = null;
    if (kind === 'board' && typeof BridgeFishArt !== 'undefined') {
      var big = id === 'nightglass';
      c = BridgeFishArt.canvas(id, big ? 64 : 52, big ? 26 : 22, 1);
    }
    if (!c) {
      var it = typeof BridgeItems !== 'undefined' && BridgeItems.get ? BridgeItems.get(kind === 'shelf' ? 'wonder_' + id : id) : null;
      if (!it || !it.draw) return null;
      var size = kind === 'case' ? 24 : kind === 'shelf' ? 26 : 32;
      c = document.createElement('canvas'); c.width = size; c.height = size;
      var g = c.getContext('2d'); g.imageSmoothingEnabled = false;
      it.draw(g, 0, 0, size);
    }
    pics[key] = c;
    return c;
  }
  function items(world, offX, offY, ts, now, sc) {
    if (!here || here.data !== world || !sc || typeof BridgeScene === 'undefined') return [];
    var out = [];
    here.spots.forEach(function (s) {
      var id = s[0], x = s[1], r = s[2], z = s[3], kind = s[4], t = info(id, kind);
      if (!t || !t.has) return;
      var c = pic(id, kind);
      if (!c) return;
      var foot = kind === 'board' ? r : kind === 'shelf' ? r + 0.3 : r + 0.02;
      out.push({ footRow: foot, draw: function (ctx) {
        // a board's fish hangs centred on it; a plinth's find stands on its top; a case's lies on the velvet
        var cx = Math.round(offX + x * ts), base = offY + (r - z * C45) * ts;
        var bob = t.glow ? Math.round(Math.sin(now / 900 + x) * 1) : 0;
        var dx = cx - Math.round(c.width / 2), dy = kind === 'board' ? Math.round(base - c.height / 2) : kind === 'case' ? Math.round(base - c.height * 0.6) : Math.round(base - c.height + 2) - 2 + bob;
        var tint = BridgeScene.tintAt ? BridgeScene.tintAt(sc, world, x, r, now) : null;
        if (t.glow) glow(ctx, cx, dy + c.height / 2, t.glow, now);
        BridgeScene.drawOccluded(ctx, sc, c, 0, 0, c.width, c.height, dx, dy, foot, offX, offY, t.glow ? null : tint, null);
        if (kind === 'case') glass(ctx, cx, Math.round(base), c.width);
        if (kind === 'shelf') pane(ctx, cx, Math.round(base), c.width, c.height);
      } });
    });
    return out;
  }
  // a soft light round something that gives it off, breathing
  function glow(ctx, x, y, rgb, now) {
    var a = 0.16 + 0.06 * Math.sin(now / 700);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(x, y, 0, x, y, 22);
    g.addColorStop(0, 'rgba(' + rgb + ',' + a.toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g; ctx.fillRect(x - 22, y - 22, 44, 44);
    ctx.restore();
  }
  // the case's glass over what lies in it: a pale sheen and a highlight along its edge
  function glass(ctx, x, y, w) {
    ctx.fillStyle = 'rgba(200,220,240,0.10)'; ctx.fillRect(x - w / 2 - 4, y - w * 0.6 - 2, w + 8, w * 0.6 + 4);
    ctx.fillStyle = 'rgba(240,248,255,0.35)'; ctx.fillRect(x - w / 2 - 2, y - w * 0.6 - 1, 6, 1); ctx.fillRect(x + w / 2 - 6, y + 1, 5, 1);
  }

  // ...and the cabinet's glazing in front of a wonder: a faint pane and a stripe of light across it
  function pane(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(200,220,240,0.08)'; ctx.fillRect(x - w / 2 - 3, y - h - 2, w + 6, h + 3);
    ctx.fillStyle = 'rgba(240,248,255,0.28)'; ctx.fillRect(x - w / 2 + 2, y - h, 1, Math.round(h * 0.6)); ctx.fillRect(x - w / 2 + 4, y - h + 2, 1, Math.round(h * 0.3));
  }

  // ---- start: watch for finds, register the plates, draw in every scene world (only the hall has spots) ------------
  function init() {
    check(true);
    setInterval(function () { check(false); }, 5000);
    if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.register) BridgeInteractions.register('trophy', look, 'Look');
    if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('*', { items: items });
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else setTimeout(init, 0);
  }

  /** How many of the hall's finds you have, of how many (the ledger, the holm's ledger). */
  function count() { var n = 0; Object.keys(T).forEach(function (id) { if (has(id)) n++; }); return { n: n, of: Object.keys(T).length }; }
  return { T: T, decorate: decorate, has: has, count: count, check: check, WID: WID, _state: function () { return st; }, _here: function () { return here; } };
})();
