/**
 * BridgeFoliage — the trees through the year.
 *
 * Every outdoor scene's render carries a leaf pass (scenekit k.foliage → leaves.png: R a leaf, B a needle, G which
 * tree), and this recolours the leaves for the season on their planet as the scene loads (BridgeScene.setGrade, once —
 * never per frame), keeping the light and shade the render gave them:
 *   - autumn: each tree turns its own way — gold, orange, red, russet, yellow — more of them as the season goes on;
 *   - winter: on Lumar the leafy trees go bare (twigs, a few dead leaves hanging on); on Verdance snow lies on them;
 *   - spring: fresher, yellower green, and some trees in blossom, pink or white;
 *   - summer: as rendered.
 * Evergreens (needles) keep their colour all year; where snow falls (Verdance's winter) it lies on their tops.
 * Verdance's meadow and hedgerow regrade (js/seasons.js `meadow`) runs first and leaves the trees to this. Both decide on
 * the day image and carry each state's light over (BridgeScene.relight), so dusk and night turn with the day.
 *
 *   BridgeFoliage.apply(worldId) — set the grade for a world's scene (world.js calls it as each world loads)
 *   BridgeFoliage._force(season | null) — preview a season everywhere (tests)
 */
var BridgeFoliage = (function () {
  var forced = null;
  // the worlds whose trees keep a planet's seasons (Sylvara's wood keeps the moon's time, not a year; Hoarfell is firs)
  var PLANET = { lumar: true, verdance: true };

  function seasonFor(worldId) {
    if (typeof BridgeClock === 'undefined') return null;
    var planet = BridgeClock.planet(worldId);
    if (!PLANET[planet] || !BridgeClock.outdoor(worldId)) return null;
    if (forced) return { id: forced, frac: 0.6, planet: planet };
    if (planet === 'verdance' && typeof BridgeSeasons !== 'undefined') return { id: BridgeSeasons.now().id, frac: 0.6, planet: planet };
    var s = BridgeClock.season(planet);
    return s ? { id: s.id, frac: s.frac, planet: planet } : null;
  }

  function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function bayer(x, y) { return (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16; }

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

  // autumn's colours, a tree's pick by its hash: hue, saturation, lightness lift
  var AUTUMN = [[42, 0.78, 1.12], [30, 0.82, 1.06], [14, 0.74, 0.98], [22, 0.62, 0.95], [52, 0.72, 1.14], [6, 0.66, 0.92]];
  var BLOSSOM = [[338, 0.62, 0.86], [350, 0.5, 0.9], [40, 0.3, 0.94]];       // pink, pale pink, white

  /** The grade for a season: (px, w, h, leaves) recolours the leaf pixels in place. seed varies the trees by scene. */
  function trees(season, frac, snow, seed) {
    return function (px, w, h, leaves, state, ref) {
      if (!leaves || season === 'summer') return;
      var t = [0, 0, 0], o = [0, 0, 0], L = [0, 0, 0], src = ref || px, turn = 0.45 + 0.55 * Math.max(0, Math.min(1, frac));
      // where the light falls on each crown, from this scene's own leaves: the lit clumps carry snow and blossom (so they
      // follow the leaves, not a pattern), the shaded ones show twigs; a fir's lit tier-tops take the snow
      var hl = new Uint32Array(64), hn = new Uint32Array(64), nl = 0, nn = 0;
      for (var j = 0; j < w * h; j++) {
        var k4 = j * 4;
        if (!leaves[k4 + 3]) continue;
        var lj = (Math.max(src[k4], src[k4 + 1], src[k4 + 2]) + Math.min(src[k4], src[k4 + 1], src[k4 + 2])) / 510, bin = Math.min(63, Math.floor(lj * 64));
        if (leaves[k4] > 127) { hl[bin]++; nl++; } else { hn[bin]++; nn++; }
      }
      function pct(hh, n, q) { var c = 0; for (var b2 = 0; b2 < 64; b2++) { c += hh[b2]; if (c >= n * q) return (b2 + 0.5) / 64; } return 1; }
      var leafSnow = pct(hl, nl, 0.55), bloomAt = pct(hl, nl, 0.6), needleSnow = pct(hn, nn, 0.74), twigAt = pct(hl, nl, 0.2);
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        if (!leaves[i + 3] || !px[i + 3]) continue;
        var leaf = leaves[i] > 127, needle = leaves[i + 2] > 127, tree = (leaves[i + 1] >> 4) + seed * 15, k = hash(tree);
        var r = src[i] / 255, g = src[i + 1] / 255, b = src[i + 2] / 255;     // decided on the day's colours
        hsl(r, g, b, t);
        var li = t[2], d = bayer(x, y);
        if (needle) {
          if (season !== 'winter' || !snow) continue;                     // evergreens keep their colour
          if (li + (d - 0.5) * 0.03 > needleSnow) { var sk = Math.min(1, (li - needleSnow) * 6 + 0.55); r = 0.66 + 0.28 * sk; g = 0.71 + 0.26 * sk; b = 0.8 + 0.18 * sk; }   // snow on the tier tops
          else { rgb(t[0] + 8, t[1] * 0.75, li * 0.82, o); r = o[0]; g = o[1]; b = o[2]; }      // and dark under it
        } else if (leaf) {
          if (season === 'autumn') {
            if (k > turn) { rgb(t[0] - 18 * (1 - k), t[1] * 0.9, li * 1.02, o); }           // not turned yet: going yellow
            else {
              var A = AUTUMN[Math.floor(hash(tree + 7) * AUTUMN.length)];
              rgb(A[0] + (li - 0.25) * 30, A[1], li * A[2] + 0.02, o);
            }
            r = o[0]; g = o[1]; b = o[2];
          } else if (season === 'winter') {
            if (snow && li + (d - 0.5) * 0.04 > leafSnow) {                // snow lying on the lit clumps
              var s2 = Math.min(1, (li - leafSnow) * 5 + 0.6);
              r = 0.68 + 0.28 * s2; g = 0.72 + 0.26 * s2; b = 0.81 + 0.17 * s2;
            } else if (!snow && li > leafSnow && d < 0.3) { rgb(28, 0.42, li * 0.9, o); r = o[0]; g = o[1]; b = o[2]; }   // a dead leaf hanging on
            else { rgb(22, 0.2, 0.15 + (li - twigAt) * 0.8 + (snow ? 0.02 : 0.05), o); r = o[0]; g = o[1]; b = o[2]; }    // bare twigs
          } else if (season === 'spring') {
            var bloom = hash(tree + 3) < 0.4;
            if (bloom && li + (d - 0.5) * 0.05 > bloomAt) {                 // blossom on the lit clumps
              var B = BLOSSOM[Math.floor(hash(tree + 11) * BLOSSOM.length)];
              rgb(B[0], B[1], Math.min(0.95, B[2] * (0.8 + (li - bloomAt) * 1.6)), o);
            } else rgb(t[0] - 10, Math.min(1, t[1] * 1.08), li * 1.06, o);
            r = o[0]; g = o[1]; b = o[2];
          } else continue;
        } else continue;
        if (ref) { BridgeScene.relight(px, ref, i, r, g, b, L); r = L[0]; g = L[1]; b = L[2]; }   // in this state's own light
        px[i] = Math.round(Math.max(0, Math.min(1, r)) * 255);
        px[i + 1] = Math.round(Math.max(0, Math.min(1, g)) * 255);
        px[i + 2] = Math.round(Math.max(0, Math.min(1, b)) * 255);
      }
    };
  }

  function apply(worldId) {
    if (typeof BridgeScene === 'undefined' || !BridgeScene.setGrade) return;
    var S = seasonFor(worldId);
    if (!S) return;
    var verd = S.planet === 'verdance', step = Math.round(S.frac * 4);
    var meadow = verd && typeof BridgeSeasons !== 'undefined' && BridgeSeasons.meadow ? BridgeSeasons.meadow(S.id) : null;
    var seed = 0;
    for (var c = 0; c < worldId.length; c++) seed = (seed * 31 + worldId.charCodeAt(c)) % 997;
    var fn = trees(S.id, S.frac, verd, seed);
    BridgeScene.setGrade(worldId, S.id === 'summer' ? null : function (px, w, h, leaves, state) {
      if (meadow) meadow(px, w, h, leaves, state);
      fn(px, w, h, leaves, state);
    }, S.id + ':' + step);
  }

  return { apply: apply, season: seasonFor, _force: function (s) { forced = s || null; } };
})();
