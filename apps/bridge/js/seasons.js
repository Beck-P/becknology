/**
 * BridgeSeasons — the year on Verdance.
 *
 * Four seasons of a week each (Monday to Sunday, by the date), turning
 * spring → summer → autumn → winter; the week of 12 Oct 2026 is autumn, as
 * it is outside. The farm's render is regraded for the season as it loads
 * (BridgeScene.setGrade, once — never per frame): autumn turns the meadow
 * gold with rust drifts of leaves and the hedges and trees orange, winter
 * lays snow over every green thing but the pines, spring freshens it. Over
 * it drift blossom petals, falling leaves or snow (the verdance `over`
 * hook); the bees and butterflies stay in for the winter (js/farm.js asks
 * `quiet()`), and a rainy day in winter is a snowy one (js/weather.js).
 *
 * Each season favours some crops — they grow 30% quicker (`FAVOURS`) — and
 * in winter everything grows at three-quarters pace (`growth`, read by
 * js/farm.js). You're told as you land, once a season.
 *
 *   BridgeSeasons.now() → {id, name, day, left} / .growth(crop) / .quiet() / .decorate(worldId)
 */
var BridgeSeasons = (function () {
  var SEASONS = [
    { id: 'spring', name: 'Spring', line: 'Blossom on the orchard, the meadow at its greenest' },
    { id: 'summer', name: 'Summer', line: 'Long days, bees in the skeps' },
    { id: 'autumn', name: 'Autumn', line: 'The leaves turning, the hedges gone to rust' },
    { id: 'winter', name: 'Winter', line: 'Snow on the meadow; the field grows slow' }
  ];
  var FAVOURS = { spring: ['turnip', 'strawberry', 'carrot'], summer: ['sunflower', 'starfruit', 'strawberry'], autumn: ['pumpkin', 'carrot', 'turnip'], winter: [] };
  var forced = null, told = null;

  function dayNum() { return Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000); }
  function current() {
    var d = dayNum(), w = Math.floor((d + 3) / 7);                   // weeks start on a Monday
    var i = forced != null ? forced : ((w + 3) % 4 + 4) % 4;
    return { id: SEASONS[i].id, name: SEASONS[i].name, line: SEASONS[i].line, day: (d + 3) % 7 + 1, left: 7 - (d + 3) % 7, index: i };
  }
  function growth(crop) {
    var s = current().id;
    if (FAVOURS[s].indexOf(crop) >= 0) return 1.3;
    return s === 'winter' ? 0.75 : 1;
  }
  function favours() { return FAVOURS[current().id].slice(); }
  function quiet() { return current().id === 'winter'; }

  // ---- the regrade: a pixel at a time, from its hue and lightness -----------------------------------------------------
  function hsl(r, g, b, out) {
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn, h = 0, s = 0;
    if (d > 1e-6) {
      s = d / (1 - Math.abs(2 * l - 1) + 1e-6);
      if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    out[0] = h; out[1] = s; out[2] = l;
  }
  function rgb(h, s, l, out) {
    h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
    var c = (1 - Math.abs(2 * l - 1)) * s, hp = h / 60, x = c * (1 - Math.abs(hp % 2 - 1)), m = l - c / 2, r = 0, g = 0, b = 0;
    if (hp < 1) { r = c; g = x; } else if (hp < 2) { r = x; g = c; } else if (hp < 3) { g = c; b = x; }
    else if (hp < 4) { g = x; b = c; } else if (hp < 5) { r = x; b = c; } else { r = c; b = x; }
    out[0] = r + m; out[1] = g + m; out[2] = b + m;
  }
  function grade(season) {
    return function (px, w, h) {
      var t = [0, 0, 0], o = [0, 0, 0];
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        if (!px[i + 3]) continue;
        var r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255;
        hsl(r, g, b, t);
        var hu = t[0], sa = t[1], li = t[2], green = hu > 55 && hu < 170 && sa > 0.12;
        if (season === 'winter') {
          if (green) {
            if (li < 0.17) { rgb(150, sa * 0.45, li * 0.95, o); r = o[0]; g = o[1]; b = o[2]; }      // the pines, dark under their snow
            else { var k = Math.min(1, Math.max(0, (li - 0.17) / 0.35)); r = 0.72 + 0.2 * k; g = 0.76 + 0.19 * k; b = 0.86 + 0.11 * k; }
          }
          r *= 0.96; g *= 0.98; b = Math.min(1, b * 1.04);
        } else if (season === 'autumn') {
          if (green && li >= 0.15) {
            var n = (Math.sin(x * 0.093 + y * 0.051) + Math.sin(x * 0.031 - y * 0.077) * 0.7 + Math.sin((x + y) * 0.017)) / 2.7;
            if (li < 0.31) rgb(24 + n * 16, sa * 1.25 + 0.1, li * 1.05, o);                          // hedges and trees turned
            else rgb(50 + n * 7, sa * 0.85, li * 1.04, o);                                             // the meadow gone gold
            r = o[0]; g = o[1]; b = o[2];
          }
        } else if (season === 'spring') {
          if (green) { rgb(hu * 0.94 + 6, sa * 0.96, li * 1.03, o); r = o[0]; g = o[1]; b = o[2]; }
        } else continue;
        px[i] = Math.round(Math.max(0, Math.min(1, r)) * 255); px[i + 1] = Math.round(Math.max(0, Math.min(1, g)) * 255); px[i + 2] = Math.round(Math.max(0, Math.min(1, b)) * 255);
      }
    };
  }
  function apply() {
    if (typeof BridgeScene === 'undefined' || !BridgeScene.setGrade) return;
    var s = current().id;
    BridgeScene.setGrade('verdance', s === 'summer' ? null : grade(s), s);
  }

  function decorate(worldId) {
    if (worldId !== 'verdance') return;
    apply();
    var s = current();
    if (told === s.id) return;
    told = s.id;
    setTimeout(function () {
      var fav = FAVOURS[s.id].map(function (c) { return c + 's'; });
      if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(s.name + ' on Verdance', s.line,
        fav.length ? fav.slice(0, -1).join(', ') + ' and ' + fav[fav.length - 1] + ' grow quicker' : 'Everything grows slower till spring');
    }, 1200);
  }
  apply();

  // ---- what drifts over the farm: petals, leaves, snow ------------------------------------------------------------------
  var PETAL = ['#ffd8e8', '#f8b8d0', '#fff0f4'], LEAF = ['#d8682a', '#e8a030', '#b83a1e', '#c88a28'];
  function over(ctx, world, offX, offY, ts, now) {
    var s = current().id, W = ctx.canvas.width, H = ctx.canvas.height;
    if (s === 'summer') return;
    if (s === 'winter' && typeof BridgeWeather !== 'undefined' && BridgeWeather.raining()) return;   // the snow day draws its own
    var n = s === 'winter' ? 70 : 26;
    for (var i = 0; i < n; i++) {
      var sp = s === 'winter' ? 0.014 + (i % 5) * 0.004 : 0.018 + (i % 4) * 0.006;
      var y = ((i * 71.3 + now * sp) % (H + 20)) - 10;
      var drift = s === 'winter' ? 0.006 : 0.012;
      var x = ((i * 137.9 + now * drift * (1 + (i % 3)) + Math.sin(now / (700 + i * 13) + i) * 14) % (W + 20) + W + 20) % (W + 20) - 10;
      if (s === 'winter') {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.55 + (i % 4) * 0.1).toFixed(2) + ')';
        ctx.fillRect(Math.round(x), Math.round(y), i % 6 === 0 ? 2 : 1, i % 6 === 0 ? 2 : 1);
      } else {
        var flip = Math.sin(now / (260 + i * 7) + i) > 0;              // tumbling: wide, then edge-on
        ctx.fillStyle = (s === 'spring' ? PETAL : LEAF)[i % (s === 'spring' ? 3 : 4)];
        if (flip) ctx.fillRect(Math.round(x), Math.round(y), 3, 2); else ctx.fillRect(Math.round(x) + 1, Math.round(y), 1, 2);
      }
    }
  }
  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('verdance', { over: over });

  return { now: current, growth: growth, favours: favours, quiet: quiet, decorate: decorate, apply: apply,
           _force: function (i) { forced = i; told = null; apply(); } };
})();
