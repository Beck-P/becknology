/**
 * BridgeForage — things worth picking up: crystals growing on the islands,
 * sea glass on the beaches, salvage by the wreck (assets/forage.json).
 *
 * Spots are added to a world's interactions when it loads (so re-rendering
 * a world never loses them). Gathering one bounces its items out as loot
 * and leaves it bare until it grows back (`regrow`, minutes; remembered in
 * localStorage). Ready spots glint so you can find them.
 */
var BridgeForage = (function () {
  var KEY = 'bridge_forage';
  var spots = {}, picked = {};
  try { picked = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { picked = {}; }
  fetch('/bridge/assets/forage.json?v=' + Date.now()).then(function (r) { return r.json(); })
    .then(function (d) { spots = d; }).catch(function () { spots = {}; });

  function idOf(worldId, s) { return worldId + ':' + s.x + ',' + s.y; }

  function decorate(worldId, data) {
    (spots[worldId] || []).forEach(function (s) {
      data.interactions = data.interactions || [];
      data.interactions.push({ x: s.x, y: s.y, type: 'forage', label: s.label, prompt: s.prompt || 'PRESS E TO GATHER',
                               item: s.item, min: s.min || 1, max: s.max || s.min || 1, regrow: s.regrow || 30,
                               forageId: idOf(worldId, s), note: s.note });
    });
  }

  function ready(inter) {
    var t = picked[inter.forageId];
    return !t || Date.now() - t > inter.regrow * 60000;
  }

  /** Returns a line to show if there's nothing to gather, else null. */
  function gather(inter) {
    if (!ready(inter)) return 'PICKED CLEAN FOR NOW.\n\nIT WILL GROW BACK.';
    var n = inter.min + Math.floor(Math.random() * (inter.max - inter.min + 1));
    if (typeof BridgeCrew !== 'undefined' && BridgeCrew.has('runner')) n += 1;      // Pip finds more
    if (typeof BridgeLoot !== 'undefined') BridgeLoot.spawn(inter.x, inter.y, inter.item, n);
    picked[inter.forageId] = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(picked)); } catch (e) { /* private mode */ }
    return null;
  }

  // a glint over every spot that's ready: a small four-point star, pulsing
  function draw(ctx, world, offX, offY, ts, now) {
    if (!world || !world.interactions) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < world.interactions.length; i++) {
      var it = world.interactions[i];
      if (it.type !== 'forage' || !ready(it)) continue;
      var ph = (now / 1400 + (it.x * 7 + it.y * 13) % 10 / 10) % 1;
      var a = Math.max(0, Math.sin(ph * Math.PI * 2));
      if (a < 0.05) continue;
      var x = Math.round(offX + (it.x + 0.5) * ts), y = Math.round(offY + (it.y + 0.25) * ts);
      var L = 1 + Math.round(a * 3);
      ctx.fillStyle = 'rgba(255,250,220,' + (0.85 * a).toFixed(2) + ')';
      ctx.fillRect(x - L, y, L * 2 + 1, 1);
      ctx.fillRect(x, y - L, 1, L * 2 + 1);
      ctx.fillStyle = 'rgba(255,240,200,' + (0.25 * a).toFixed(2) + ')';
      ctx.fillRect(x - 2, y - 2, 5, 5);
    }
    ctx.restore();
  }

  return { decorate: decorate, gather: gather, ready: ready, draw: draw };
})();
