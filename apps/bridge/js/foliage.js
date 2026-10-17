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
        if (leaves[k4] > 127) { hl[bin]++; nl++; } else if (leaves[k4 + 2] > 127) { hn[bin]++; nn++; }   // (grass and water: not trees)
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

  // ---- the ground through the year: the grass the leaf pass marks (R 64), wherever it is ----------------------------------
  // spring freshens it and sprinkles wildflowers; autumn turns it toward straw and drops each turned tree's leaves round
  // its foot, in its own colour; winter: on Lumar the grass lies dormant, olive and tan, with the brown litter under the
  // trees; on Verdance snow lies on it. Decided on the day image and carried into each state's light like the trees.
  var WILD = [[0, 0, 0.94], [52, 0.85, 0.62], [330, 0.55, 0.78], [270, 0.45, 0.72]];   // daisy, buttercup, campion, violet
  function grassy(leaves) {
    if (!leaves) return false;
    for (var i = 0; i < leaves.length; i += 64) if (leaves[i] > 32 && leaves[i] <= 160) return true;
    return false;
  }
  function hash2(x, y) { var v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return v - Math.floor(v); }
  function ground(season, frac, snow, seed) {
    var fallen = null, turn = 0.45 + 0.55 * Math.max(0, Math.min(1, frac));
    // where leaves lie: round the foot of each turned tree (its crown is drawn above its foot), by 8-px cells
    function fallMap(w, h, leaves) {
      var cw = Math.ceil(w / 8), ch = Math.ceil(h / 8), dens = new Float32Array(cw * ch), code = new Int32Array(cw * ch).fill(-1);
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        if (leaves[i] <= 160) continue;                                    // leaves only: needles don't drop
        var tree = (leaves[i + 1] >> 4) + seed * 15;
        if (season === 'autumn' && hash(tree) > turn) continue;            // not turned yet
        var c = (y >> 3) * cw + (x >> 3);
        dens[c] += 1 / 64; code[c] = tree;
      }
      var F = new Float32Array(cw * ch), T = new Int32Array(cw * ch).fill(-1);
      for (var cy = 0; cy < ch; cy++) for (var cx = 0; cx < cw; cx++) {
        var best = 0, bt = -1;
        for (var dy = 0; dy <= 5; dy++) for (var dx = -2; dx <= 2; dx++) {
          var X = cx + dx, Y = cy - dy;
          if (X < 0 || Y < 0 || X >= cw) continue;
          var v = Math.min(1, dens[Y * cw + X] * 1.6) / (1 + Math.abs(dx) * 0.6 + Math.max(0, dy - 2) * 0.5);
          if (v > best) { best = v; bt = code[Y * cw + X]; }
        }
        F[cy * cw + cx] = best; T[cy * cw + cx] = bt;
      }
      return { F: F, T: T, cw: cw };
    }
    return function (px, w, h, leaves, state, ref) {
      if (!grassy(leaves) || season === 'summer') return;
      var t = [0, 0, 0], o = [0, 0, 0], L = [0, 0, 0], src = ref || px;
      var drop = season === 'autumn' ? 0.16 + 0.3 * frac : season === 'winter' && !snow ? 0.12 : 0;
      if (drop && !fallen) fallen = fallMap(w, h, leaves);
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        if (!(leaves[i] > 32 && leaves[i] <= 160) || !px[i + 3]) {       // only the grass: (and on Verdance in winter, a cold light on all else)
          if (snow && season === 'winter' && px[i + 3] && !(leaves[i] > 160 || leaves[i + 2] > 160)) {
            var r0 = src[i] / 255 * 0.96, g0 = src[i + 1] / 255 * 0.98, b0 = Math.min(1, src[i + 2] / 255 * 1.04);
            if (ref) { BridgeScene.relight(px, ref, i, r0, g0, b0, L); r0 = L[0]; g0 = L[1]; b0 = L[2]; }
            px[i] = Math.round(Math.max(0, Math.min(1, r0)) * 255); px[i + 1] = Math.round(Math.max(0, Math.min(1, g0)) * 255); px[i + 2] = Math.round(Math.max(0, Math.min(1, b0)) * 255);
          }
          continue;
        }
        var r = src[i] / 255, g = src[i + 1] / 255, b = src[i + 2] / 255;
        hsl(r, g, b, t);
        var hu = t[0], sa = t[1], li = t[2], green = hu > 45 && hu < 175 && sa > 0.08, d = bayer(x, y);
        var fl = null;
        if (drop) {
          var c = (y >> 3) * fallen.cw + (x >> 3), f = fallen.F[c] * drop;
          if (f > 0.02 && hash2(x >> 1, y) < f) fl = fallen.T[c];
        }
        if (season === 'winter' && snow) {
          var k = Math.min(1, Math.max(0, (li - 0.12) / 0.35));
          r = 0.72 + 0.2 * k; g = 0.76 + 0.19 * k; b = 0.86 + 0.11 * k;
        } else if (fl != null && fl >= 0) {                              // a fallen leaf
          if (season === 'autumn') { var A = AUTUMN[Math.floor(hash(fl + 7) * AUTUMN.length)]; rgb(A[0] + (d - 0.5) * 16, A[1] * 0.85, Math.max(0.2, li * A[2] * 1.05 + 0.04), o); }
          else rgb(24 + (d - 0.5) * 10, 0.35, Math.max(0.16, li * 0.85), o);
          r = o[0]; g = o[1]; b = o[2];
        } else if (season === 'spring') {
          if (green && hash2(x, y + seed) < 0.0035) { var W2 = WILD[Math.floor(hash2(y, x) * WILD.length)]; rgb(W2[0], W2[1], Math.max(W2[2] * (0.7 + li * 0.6), 0.4), o); }
          else if (green) rgb(hu * 0.94 + 6, Math.min(1, sa * 1.05), li * 1.03, o);
          else continue;
          r = o[0]; g = o[1]; b = o[2];
        } else if (season === 'autumn') {
          if (green) {
            if (snow) { var n = (Math.sin(x * 0.093 + y * 0.051) + Math.sin(x * 0.031 - y * 0.077) * 0.7 + Math.sin((x + y) * 0.017)) / 2.7; rgb(50 + n * 7, sa * 0.85, li * 1.04, o); }   // Verdance: the meadow gone gold
            else rgb(hu + (52 - hu) * (0.22 + 0.25 * frac), sa * 0.86, li * 1.02, o);                                                      // Lumar: toward straw
          } else if (hash2(x >> 1, y >> 1) < 0.5) continue;              // half the flowers still out
          else rgb(48, 0.3, li * 0.9, o);
          r = o[0]; g = o[1]; b = o[2];
        } else if (season === 'winter') {                               // Lumar: dormant
          rgb(green ? hu + (56 - hu) * 0.55 : 50, green ? sa * 0.52 : 0.25, li * 0.93, o);
          r = o[0]; g = o[1]; b = o[2];
        } else continue;
        if (ref) { BridgeScene.relight(px, ref, i, r, g, b, L); r = L[0]; g = L[1]; b = L[2]; }
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
    var fn = trees(S.id, S.frac, verd, seed), gr = ground(S.id, S.frac, verd, seed);
    BridgeScene.setGrade(worldId, S.id === 'summer' ? null : function (px, w, h, leaves, state, ref) {
      if (grassy(leaves)) gr(px, w, h, leaves, state, ref);            // the render marks its grass: the ground through the year
      else if (meadow) meadow(px, w, h, leaves, state, ref);           // an older render on Verdance: everything green turns
      fn(px, w, h, leaves, state, ref);
    }, S.id + ':' + step);
  }

  return { apply: apply, season: seasonFor, _force: function (s) { forced = s || null; } };
})();
