/**
 * BridgeWeather — rain on Verdance.
 *
 * About one day in four (by the date) it rains on the farm: the light goes
 * grey, rain slants across everything, the pond and the puddles ring with
 * drops, and the birdsong gives way to the rain bed (js/audio.js). Every
 * planted tile counts as watered until midnight (js/homestead.js keptWet), so
 * a rainy day is a day off from the watering can. You're told as you land.
 *
 *   BridgeWeather.rainDay() / .raining(worldId) / .endOfDay()
 */
var BridgeWeather = (function () {
  var told = 0, forced = null;
  function day() { return Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000); }
  function rainDay(d) {
    if (forced !== null && d == null) return forced;
    d = d == null ? day() : d;
    var h = Math.sin(d * 12.9898 + 4.1) * 43758.5453;
    return h - Math.floor(h) < 0.27;
  }
  function endOfDay() { var t = new Date(); t.setHours(24, 0, 0, 0); return t.getTime(); }
  function raining(worldId) { return /^verdance(-village)?$/.test(worldId || (typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId()) || '') && rainDay(); }

  function decorate(worldId) {
    if (worldId !== 'verdance' || !rainDay() || told === day()) return;
    told = day();
    setTimeout(function () {
      var snow = typeof BridgeSeasons !== 'undefined' && BridgeSeasons.quiet();
      if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(snow ? 'Snow on Verdance' : 'Rain on Verdance', snow ? 'The snowmelt waters the field today' : 'The field waters itself today', 'Leave the can in the shed');
    }, 2400);
  }

  // the rain: the light greyed, streaks slanting down, rings where it lands
  function over(ctx, world, offX, offY, ts, now) {
    if (!raining()) return;
    var W = ctx.canvas.width, H = ctx.canvas.height;
    if (typeof BridgeSeasons !== 'undefined' && BridgeSeasons.quiet()) return snow(ctx, W, H, now);
    ctx.fillStyle = 'rgba(36,52,78,0.2)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(190,210,235,0.5)';
    for (var i = 0; i < 160; i++) {
      var sp = 0.32 + (i % 5) * 0.05;
      var y = ((i * 97.3 + now * sp) % (H + 40)) - 20, x = ((i * 53.7 - now * sp * 0.35) % (W + 40) + W + 40) % (W + 40) - 20;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 5 + (i % 3));
      ctx.fillRect(Math.round(x) - 1, Math.round(y) + 5 + (i % 3), 1, 2);
    }
    ctx.fillStyle = 'rgba(210,225,245,0.55)';                       // drops landing
    for (var j = 0; j < 40; j++) {
      var ph = ((now / 600) + j * 0.137) % 1, rx = (j * 211.7 + Math.floor(now / 600 + j * 0.137) * 97) % W, ry = (j * 131.3 + Math.floor(now / 600 + j * 0.137) * 53) % H;
      var r = Math.round(1 + ph * 3);
      if (ph < 0.7) { ctx.fillRect(Math.round(rx) - r, Math.round(ry), r * 2 + 1, 1); }
    }
  }
  // a winter's wet day: the light low and white, snow coming down thick and slow
  function snow(ctx, W, H, now) {
    ctx.fillStyle = 'rgba(200,210,230,0.16)';
    ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < 190; i++) {
      var sp = 0.02 + (i % 5) * 0.006;
      var y = (i * 53.71 + now * sp) % (H + 10) - 5, x = ((i * 97.13 + now * 0.012 * (1 + (i % 3))) % (W + 20)) - 10 + Math.sin(now / 900 + i) * 4;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.6 + (i % 4) * 0.1).toFixed(2) + ')';
      ctx.fillRect(Math.round(x), Math.round(y), i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
    }
  }
  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('verdance', { over: over });

  return { rainDay: rainDay, raining: raining, endOfDay: endOfDay, decorate: decorate, _force: function (v) { forced = v; } };
})();
