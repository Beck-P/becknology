/**
 * BridgeFishArt — fish drawn from a description, as pixel art at any size: the big portrait on the catch card
 * (js/fishing.js) and the icons of the rarer fish (js/items.js).
 *
 * Each fish in SPECS is a body (how deep for its length, where it's deepest, a big jaw or not), a tail (fork,
 * crescent, round, fan, the coelacanth's three lobes; eels and rays are their own shapes), fins (a low dorsal,
 * spines, a sail, a crown of crystal), a bill or a lure or barbels, a pattern (spots, stripes, bars, bands, stars,
 * scales, moss) and its colours — back, flank, belly, fins, an accent — and what glows. The fish faces right.
 *
 * TIER says how rare each catch is, 0 common → 3 legendary (TIERS: the name and colour it's shown in); js/fishing.js
 * makes the rarer ones bite faster and fight longer.
 *
 *   BridgeFishArt.canvas(id, w, h, scale)   a cached canvas (null if there's no spec: crabs, boots, coins…)
 *   BridgeFishArt.icon(id)                  an item-style draw(ctx, x, y, size) for js/items.js
 *   BridgeFishArt.tier(id) / TIERS / has(id)
 */
var BridgeFishArt = (function () {
  var TIERS = [
    { name: 'Common', col: '#b8ccb0' },
    { name: 'Uncommon', col: '#80c8ff' },
    { name: 'Rare', col: '#d8a0ff' },
    { name: 'Legendary', col: '#ffd060' }
  ];
  var TIER = {
    silverfin: 0, spore_minnow: 0, harbour_crab: 0, rose_shrimp: 0, pond_perch: 0, arctic_char: 0, old_boot: 0, bottle: 0,
    bluefin: 1, glowtail: 1, ember_snapper: 1, spore_tuna: 1, frostfin: 1, heron_coin: 1,
    sapphire_ray: 2, moon_eel: 2, lantern_angler: 2, star_pearl: 2, sun_carp: 2,
    coral_dragonet: 2, cinder_grouper: 2, starfin: 2, jade_marlin: 2, glass_swordfish: 2,
    old_mossback: 3, crownfin: 3, dawnveil: 3, emberjaw: 3, nightglass: 3
  };
  // c: [back, flank, belly, fins, accent]
  var SPECS = {
    silverfin:      { depth: 0.34, tail: 'fork', dorsal: 'low', line: true, c: ['#4a5a6a', '#a8b8c8', '#e8f0f8', '#6a7a8a', '#d8e8f8'] },
    spore_minnow:   { depth: 0.3, tail: 'fork', dorsal: 'low', pattern: 'spots', glow: '#60f0c0', c: ['#2a4a3a', '#5a9078', '#b8e0c8', '#3a6a50', '#60f0c0'] },
    bluefin:        { depth: 0.34, peak: 0.48, tail: 'crescent', dorsal: 'low', finlets: true, line: true, c: ['#1a3a70', '#2a5aa0', '#c8d8f0', '#1a3a70', '#a0c0f0'] },
    glowtail:       { depth: 0.32, tail: 'fan', dorsal: 'low', glowTail: true, glow: '#80fff0', c: ['#1a2a4a', '#40608a', '#a0b8d0', '#40e0d0', '#80fff0'] },
    ember_snapper:  { depth: 0.42, tail: 'fork', dorsal: 'spines', pattern: 'bands', c: ['#6a1a10', '#c04a28', '#f0a070', '#a02a18', '#ffb040'] },
    spore_tuna:     { depth: 0.4, peak: 0.45, tail: 'crescent', dorsal: 'low', finlets: true, pattern: 'spots', glow: '#60f0c0', c: ['#1a3040', '#3a6070', '#c0d0d0', '#2a4a5a', '#60f0c0'] },
    pond_perch:     { depth: 0.4, tail: 'fork', dorsal: 'spines', pattern: 'stripes', c: ['#3a5a1a', '#6a8a3a', '#c0d080', '#c05a20', '#2a4010'] },
    arctic_char:    { depth: 0.33, tail: 'fork', dorsal: 'low', pattern: 'spots', c: ['#3a4a5a', '#5a6a7a', '#f0a0a0', '#e07070', '#f8d0c0'] },
    frostfin:       { depth: 0.3, tail: 'fan', dorsal: 'sail', glass: true, glow: '#c8f0ff', c: ['#6a9ac8', '#a0c8e8', '#e8f6ff', '#c8f0ff', '#ffffff'] },
    sun_carp:       { depth: 0.42, tail: 'fork', dorsal: 'low', pattern: 'scales', barbels: true, glow: '#fff0a0', c: ['#a06010', '#d8a020', '#ffe080', '#e08020', '#fff0a0'] },
    sapphire_ray:   { shape: 'ray', pattern: 'crystals', glow: '#80b0ff', c: ['#1a2a5a', '#3050a8', '#80a0e0', '#1a2a5a', '#c0e0ff'] },
    moon_eel:       { shape: 'eel', depth: 0.11, pattern: 'spots', glow: '#e0e0ff', c: ['#8a8ab0', '#c8c8e8', '#f0f0ff', '#a8a8d0', '#ffffff'] },
    lantern_angler: { depth: 0.5, peak: 0.66, tail: 'round', dorsal: 'none', lure: true, jaw: 'teeth', glow: '#ffe080', c: ['#1a1018', '#3a2a3a', '#5a4058', '#2a1a28', '#ffe080'] },
    coral_dragonet: { depth: 0.28, tail: 'fan', dorsal: 'sail', pattern: 'squiggles', c: ['#c03040', '#ff7040', '#ffd040', '#3aa0ff', '#60ffe0'] },
    cinder_grouper: { depth: 0.5, peak: 0.52, tail: 'round', dorsal: 'spines', jaw: 'big', pattern: 'spots', glow: '#ff7030', c: ['#2a1a18', '#5a3a30', '#a07060', '#3a2018', '#ff7030'] },
    starfin:        { depth: 0.34, tail: 'fork', dorsal: 'low', trailing: true, pattern: 'stars', glow: '#c0d0ff', c: ['#0a0a2a', '#1a1a4a', '#3a3a7a', '#2a2a6a', '#ffffff'] },
    jade_marlin:    { depth: 0.28, peak: 0.45, tail: 'crescent', dorsal: 'sail', bill: true, pattern: 'bars', c: ['#0a4a3a', '#1a8a6a', '#c0f0d8', '#2ac090', '#80ffd0'] },
    glass_swordfish:{ depth: 0.3, peak: 0.45, tail: 'crescent', dorsal: 'low', bill: true, glass: true, glow: '#c0e8ff', c: ['#3a6a9a', '#90c0e8', '#e0f4ff', '#b0e0ff', '#ffffff'] },
    old_mossback:   { depth: 0.52, peak: 0.5, tail: 'round', dorsal: 'spines', jaw: 'big', pattern: 'moss', glow: '#60f0c0', c: ['#2a3a20', '#4a5a38', '#8a9a70', '#3a4a2a', '#60f0c0'] },
    crownfin:       { depth: 0.32, peak: 0.45, tail: 'crescent', dorsal: 'crown', bill: true, line: true, glow: '#a0d0ff', c: ['#0a2a6a', '#2a5ac0', '#d0e8ff', '#4080e0', '#ffffff'] },
    dawnveil:       { shape: 'ray', veil: true, pattern: 'spots', glow: '#ffb0d8', c: ['#8a2a5a', '#e070a0', '#ffd0e8', '#ff90c0', '#fff0f8'] },
    emberjaw:       { depth: 0.22, peak: 0.4, tail: 'fork', dorsal: 'aft', jaw: 'fire', snout: true, pattern: 'flames', glow: '#ffa030', c: ['#3a0a08', '#8a1a10', '#e05a20', '#c02a10', '#ffd040'] },
    nightglass:     { depth: 0.4, tail: 'coel', dorsal: 'low', lobes: true, pattern: 'stars', glow: '#a0a0ff', c: ['#0a0818', '#2a2850', '#5a5a90', '#3a3a70', '#d0d0ff'] }
  };
  var INK = '#0a0810';

  function hash(x, y, n) { var h = Math.sin(x * 127.1 + y * 311.7 + n * 74.7) * 43758.5453; return h - Math.floor(h); }
  function mix(a, b, t) {
    var p = parseInt(a.slice(1), 16), q = parseInt(b.slice(1), 16), r = [16, 8, 0].map(function (s) { return Math.round(((p >> s) & 255) * (1 - t) + ((q >> s) & 255) * t); });
    return '#' + r.map(function (v) { return (v < 16 ? '0' : '') + v.toString(16); }).join('');
  }

  // paint a fish into a w × h grid of colours; returns { px, glow } (glow: cells that shine)
  function paint(id, w, h) {
    var S = SPECS[id], px = [], glow = {};
    for (var i = 0; i < w * h; i++) px.push(null);
    var c = S.c, seed = id.length * 7.3 + id.charCodeAt(0);
    function put(x, y, col, shine) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      px[y * w + x] = col;
      if (shine) glow[y * w + x] = shine === true ? S.glow : shine;
    }
    function get(x, y) { return x < 0 || y < 0 || x >= w || y >= h ? null : px[y * w + x]; }
    var big = w >= 32;
    if (S.shape === 'ray') paintRay(S, w, h, put, big, seed);
    else if (S.shape === 'eel') paintEel(S, w, h, put, big, seed);
    else paintFish(S, w, h, put, big, seed);
    // the outline: every empty cell beside the fish
    var ink = [];
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      if (px[y * w + x]) continue;
      if (get(x - 1, y) || get(x + 1, y) || get(x, y - 1) || get(x, y + 1)) ink.push(y * w + x);
    }
    ink.forEach(function (k) { px[k] = INK; });
    return { px: px, glow: glow };
  }

  function paintFish(S, w, h, put, big, seed) {
    var c = S.c, tailLen = { fork: 0.17, crescent: 0.19, round: 0.14, fan: 0.18, coel: 0.16 }[S.tail] || 0.16;
    var x0 = Math.round(w * 0.04), bx0 = Math.round(w * (0.04 + tailLen)), bx1 = Math.round(w * (S.bill ? 0.8 : 0.95));
    var len = bx1 - bx0, height = Math.max(3, S.depth * len), up = S.dorsal === 'sail' || S.dorsal === 'crown' || S.lure;
    var cy = h * (up ? 0.6 : 0.52), topH = height * 0.47, botH = height * 0.53, peak = S.peak || 0.55;
    function prof(t) {
      if (t < peak) { var k = t / peak; return 0.3 + 0.7 * (1 - (1 - k) * (1 - k)); }
      var q = (t - peak) / (1 - peak);
      if (S.snout) return Math.max(0.16, 1 - q * 0.86);
      return Math.max(S.jaw === 'big' ? 0.3 : 0.12, Math.sqrt(Math.max(0, 1 - Math.pow(q, S.jaw ? 3 : 2.2))));
    }
    var x, y, t, s, top, bot, v;
    // the tail first (the body goes over its root)
    var s0 = prof(0) * topH, tH = topH * (S.tail === 'crescent' ? 1.7 : S.tail === 'fan' ? 1.45 : 1.25);
    for (x = bx0; x >= x0; x--) {
      var k = (bx0 - x) / Math.max(1, bx0 - x0), sp, col = S.glowTail ? c[4] : c[3];
      if (S.tail === 'round' || S.tail === 'fan' || S.tail === 'coel') {
        sp = s0 + (tH - s0) * Math.sqrt(k);
        if (k > 0.8) sp *= Math.sqrt(Math.max(0, (1 - k) / 0.2)) * 0.6 + 0.4;
        for (y = Math.round(cy - sp); y <= Math.round(cy + sp); y++) put(x, y, S.tail === 'fan' && big && (y % 2) ? mix(col, '#ffffff', 0.18) : col, S.glowTail && hash(x, y, seed) > 0.4);
      } else {
        sp = s0 + (tH - s0) * Math.pow(k, S.tail === 'crescent' ? 0.6 : 1);
        var notch = S.tail === 'crescent' ? (k > 0.12 ? sp - 1 - (1 - k) * 2.2 : 0) : (k > 0.45 ? (k - 0.45) / 0.55 * sp * 0.85 : 0);
        for (y = Math.round(cy - sp); y <= Math.round(cy + sp); y++) if (Math.abs(y - cy) >= notch) put(x, y, col, S.glowTail && hash(x, y, seed) > 0.4);
      }
    }
    if (S.tail === 'coel') for (x = x0 - 3; x < x0 + 2; x++) for (y = Math.round(cy - 1); y <= Math.round(cy + 1); y++) put(x, y, c[3]);
    // the dorsal fin (behind the body: drawn before it)
    var d0 = { low: 0.36, spines: 0.24, sail: 0.18, crown: 0.2, aft: 0.06 }[S.dorsal], d1 = { low: 0.62, spines: 0.72, sail: 0.78, crown: 0.76, aft: 0.3 }[S.dorsal];
    if (d0 != null) for (x = Math.round(bx0 + d0 * len); x <= Math.round(bx0 + d1 * len); x++) {
      t = (x - bx0) / len; var u = (t - d0) / (d1 - d0), base = cy - topH * prof(t) + 1, fh;
      if (S.dorsal === 'low') fh = topH * 0.55 * Math.sin(Math.PI * Math.min(1, u * 1.4));
      else if (S.dorsal === 'aft') fh = topH * 1.1 * Math.sin(Math.PI * Math.min(1, u * 1.2));
      else if (S.dorsal === 'spines') fh = topH * (0.45 + 0.25 * ((x % 2) ? 1 : 0)) * Math.sin(Math.PI * u);
      else if (S.dorsal === 'sail') fh = topH * 1.7 * (u < 0.25 ? u / 0.25 : 1 - (u - 0.25) * 0.75) * (1 - Math.pow(u, 6));
      else fh = topH * (0.5 + 1.3 * [1, 0.45, 0.7][x % 3]) * Math.sin(Math.PI * Math.min(1, 0.08 + u * 0.95));   // a crown of crystal points
      for (y = Math.round(base - fh); y <= Math.round(base); y++) {
        var fc = c[3];
        if (S.dorsal === 'sail' && big && x % 3 === 0) fc = mix(c[3], INK, 0.35);
        if (S.dorsal === 'sail' && hash(x, y, seed + 3) > 0.86) fc = c[4];
        if (S.dorsal === 'crown') fc = (y < base - fh * 0.5) ? c[4] : c[3];
        put(x, y, fc, (S.dorsal === 'crown' && y < base - fh * 0.5) || (S.dorsal === 'spines' && S.pattern === 'moss' && hash(x, y, seed) > 0.8));
      }
    }
    if (S.finlets) for (x = Math.round(bx0 + 0.04 * len); x < Math.round(bx0 + 0.22 * len); x += 2) {
      t = (x - bx0) / len;
      put(x, cy - topH * prof(t) - 1, c[4]); put(x, cy + botH * prof(t) + 1, c[4]);
    }
    // the body
    for (x = bx0; x <= bx1; x++) {
      t = (x - bx0) / len; s = prof(t); top = Math.round(cy - topH * s); bot = Math.round(cy + botH * s);
      for (y = top; y <= bot; y++) {
        v = (y - top) / Math.max(1, bot - top);
        var col = v < 0.3 ? c[0] : v < 0.68 ? c[1] : c[2], shine = false;
        if (big && y === top + 1 && t > 0.1 && t < 0.85) col = mix(col, '#ffffff', 0.18);               // the light along the back
        if (S.glass && v > 0.3 && v < 0.62 && Math.abs(y - cy) < 0.6) col = mix(c[0], c[3], 0.4);      // the spine through glass
        if (S.glass && big && v > 0.3 && v < 0.8 && x % 3 === 0 && t < 0.75) col = mix(col, c[0], 0.25); // and the ribs
        if (S.line && v > 0.44 && v < 0.52 && x % 2 === 0 && t < 0.78) col = c[4];
        var p = S.pattern, hh = hash(x, y, seed);
        if (p === 'spots' && v > 0.08 && v < 0.62 && hh > 0.82 && t < 0.8) { col = c[4]; shine = !!S.glow; }
        if (p === 'stars' && v < 0.85 && hh > 0.87) { col = hh > 0.95 ? '#ffffff' : c[4]; shine = true; }
        if (p === 'stripes' && v < 0.75 && t > 0.08 && t < 0.78 && Math.floor((x - bx0) / Math.max(2, len * 0.11)) % 2 === 0) col = mix(col, c[4], 0.6);
        if (p === 'bars' && v > 0.18 && v < 0.72 && t > 0.1 && t < 0.72 && x % 4 === 0) col = c[4];
        if (p === 'bands' && v < 0.8 && t < 0.8 && ((x + y) % 6) < 2) col = mix(col, c[4], 0.55);
        if (p === 'scales' && v < 0.78 && t < 0.8 && ((x + (y % 2) * 2) % 4) === 0) col = mix(col, c[4], 0.5);
        if (p === 'flames' && v < 0.7 && t < 0.85 && Math.sin(x * 0.7 - y * 1.1) > 0.75) { col = mix(c[4], c[3], v); shine = v < 0.35; }
        if (p === 'squiggles' && v < 0.75 && t < 0.8 && Math.abs(Math.sin(x * 0.9 + y * 1.3)) > 0.86) col = c[3];
        if (p === 'moss' && v < 0.4 && hh > 0.45) { col = hh > 0.9 ? c[4] : mix(c[3], c[4], 0.25); shine = hh > 0.9; }
        put(x, y, col, shine);
      }
      if (S.jaw === 'fire' && t > 0.8) { put(x, cy + botH * 0.1, c[4], true); if (big) put(x, cy + botH * 0.1 + 1, '#fff0b0', true); }   // the glowing maw
    }
    // the gill, the eye, the mouth
    var gx = Math.round(bx0 + 0.74 * len), gs = prof(0.74);
    for (y = Math.round(cy - topH * gs * 0.55); y <= Math.round(cy + botH * gs * 0.6); y++) put(gx, y, mix(c[0], INK, 0.3));
    var ex = Math.round(bx0 + (S.jaw ? 0.84 : 0.87) * len), ey = Math.round(cy - topH * prof(0.87) * 0.4);
    put(ex, ey, '#f8f0d0'); if (big) { put(ex + 1, ey, '#f8f0d0'); put(ex, ey + 1, '#f8f0d0'); put(ex + 1, ey + 1, INK); }
    var my = Math.round(cy + botH * 0.15);
    put(bx1, my, INK); if (big) put(bx1 - 1, my, INK);
    if (S.jaw === 'teeth' || S.jaw === 'big' || S.jaw === 'fire') for (x = bx1 - (big ? 5 : 2); x <= bx1; x += 2) put(x, my + 1, S.jaw === 'fire' ? c[4] : '#e8e0d0', S.jaw === 'fire');
    // the pectoral fin, behind the gill, and the one beneath
    for (var j = 0; j < (big ? 4 : 2); j++) for (var q = 0; q <= j; q++) put(gx - 1 - j, cy + botH * 0.2 + q, c[3]);
    var ax = Math.round(bx0 + 0.3 * len);
    for (j = 0; j < (big ? 3 : 2); j++) for (q = 0; q < (big ? 3 : 2) - j; q++) put(ax - j + q, cy + botH * prof(0.3) + 1 + j, c[3]);
    if (S.trailing) for (j = 0; j < (big ? 7 : 3); j++) { put(ax - 2 - j, cy + botH * prof(0.3) + 2 + j * 0.4, c[3]); }
    // a bill, a lure, whiskers
    if (S.bill) for (x = bx1; x <= w - 1; x++) { put(x, cy - topH * 0.12, c[0]); if (big && x < bx1 + (w - bx1) * 0.4) put(x, cy - topH * 0.12 + 1, c[1]); }
    if (S.lure) {
      var lx = Math.round(bx0 + 0.82 * len), ly = Math.round(cy - topH * prof(0.82));
      var tx = Math.min(w - 3, bx1 + (big ? 3 : 1)), ty = Math.max(1, Math.round(h * 0.12));
      for (j = 0; j <= 10; j++) { var a = j / 10; put(lx + (tx - lx) * a, ly + (ty - ly) * Math.sin(a * Math.PI / 2) - (big ? 2 : 0) * Math.sin(a * Math.PI), c[3]); }
      put(tx, ty, c[4], true); put(tx + 1, ty, c[4], true); if (big) { put(tx, ty + 1, c[4], true); put(tx + 1, ty + 1, '#fff8d0', true); }
    }
    if (S.barbels) for (j = 1; j <= (big ? 4 : 2); j++) { put(bx1 - j, my + j, c[3]); }
  }

  function paintEel(S, w, h, put, big, seed) {
    var c = S.c, x0 = Math.round(w * 0.03), x1 = Math.round(w * 0.95), len = x1 - x0, cy = h * 0.52, half = Math.max(1.5, S.depth * len * 0.5);
    for (var x = x0; x <= x1; x++) {
      var t = (x - x0) / len, wav = Math.sin(t * Math.PI * 2.4) * h * 0.17 * (1 - t * 0.85), s = t < 0.86 ? 0.2 + 0.8 * Math.min(1, t * 1.7) : Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.86) / 0.14, 2))) * 0.85 + 0.15;
      var top = Math.round(cy + wav - half * s), bot = Math.round(cy + wav + half * s);
      if (t < 0.8) { put(x, top - 1, c[3]); put(x, bot + 1, c[3]); }                       // the ribbon of fin, top and bottom
      for (var y = top; y <= bot; y++) {
        var v = (y - top) / Math.max(1, bot - top), col = v < 0.35 ? c[0] : v < 0.7 ? c[1] : c[2], shine = false;
        if (S.pattern === 'spots' && v < 0.6 && hash(x, y, seed) > 0.8) { col = c[4]; shine = true; }
        put(x, y, col, shine);
      }
      if (x === Math.round(x0 + 0.91 * len) || (big && x === Math.round(x0 + 0.91 * len) + 1)) { put(x, top + 1, '#f8f0d0'); if (big) put(x, top + 2, x % 2 ? INK : '#f8f0d0'); }
      if (x === x1) put(x, Math.round(cy + wav + half * 0.3), INK);                                       // the mouth
    }
    put(x1 - (big ? 6 : 3), cy + half * 0.6, c[3]); put(x1 - (big ? 7 : 3), cy + half * 0.6 + 1, c[3]);
  }

  function paintRay(S, w, h, put, big, seed) {
    var c = S.c, x0 = Math.round(w * 0.34), x1 = Math.round(w * 0.86), len = x1 - x0, cy = h * 0.5, hs = h * (S.veil ? 0.44 : 0.4);
    // the tail, a whip out behind with a glint at its tip
    for (var x = Math.round(w * 0.03); x < x0 + 2; x++) { var tt = (x0 - x) / (x0 - w * 0.03); put(x, cy + Math.sin(tt * 4) * h * 0.04, tt > 0.92 ? c[4] : c[3], tt > 0.92); }
    for (x = x0; x <= x1; x++) {
      var t = (x - x0) / len, half = hs * (t < 0.5 ? Math.sin(Math.PI / 2 * t / 0.5) : Math.pow(1 - (t - 0.5) / 0.5, 0.75));
      if (S.veil) half += Math.sin(x * 0.9) * 0.8 * (t < 0.7 ? 1 : 0);
      for (var y = Math.round(cy - half); y <= Math.round(cy + half); y++) {
        var r = Math.abs(y - cy) / Math.max(1, half), col = r < 0.12 ? mix(c[0], c[1], 0.4) : r < 0.7 ? c[1] : c[2], shine = false;
        if (S.veil && r > 0.82) { col = c[3]; shine = hash(x, y, seed) > 0.7; }
        if (S.pattern === 'crystals' && r < 0.18 && x % 3 === 0 && t > 0.15 && t < 0.85) { col = c[4]; shine = true; }
        if (S.pattern === 'spots' && r > 0.25 && r < 0.75 && hash(x, y, seed) > 0.86) { col = c[4]; shine = true; }
        put(x, y, col, shine);
      }
    }
    var ex = Math.round(x0 + 0.78 * len);
    put(ex, cy - (big ? 3 : 1), '#f8f0d0'); put(ex, cy + (big ? 3 : 1), '#f8f0d0');
  }

  // ---- canvases ---------------------------------------------------------------------------------------------------
  var cache = {};
  function canvas(id, w, h, scale) {
    if (!SPECS[id] || typeof document === 'undefined') return null;
    scale = scale || 1;
    var key = id + ':' + w + 'x' + h + '@' + scale;
    if (cache[key]) return cache[key];
    var P = paint(id, w, h), cv = document.createElement('canvas');
    cv.width = w * scale; cv.height = h * scale;
    var g = cv.getContext('2d');
    if (scale > 1 && SPECS[id].glow) {                                  // what shines, glowing softly under the pixels
      g.save(); g.globalCompositeOperation = 'lighter';
      Object.keys(P.glow).forEach(function (k) {
        var x = (k % w + 0.5) * scale, y = (Math.floor(k / w) + 0.5) * scale, r = scale * 2.6;
        var gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, hexA(P.glow[k], 0.35)); gr.addColorStop(1, hexA(P.glow[k], 0));
        g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
      });
      g.restore();
    }
    for (var i = 0; i < P.px.length; i++) if (P.px[i]) { g.fillStyle = P.px[i]; g.fillRect((i % w) * scale, Math.floor(i / w) * scale, scale, scale); }
    cache[key] = cv;
    return cv;
  }
  function hexA(hex, a) { var p = parseInt(hex.slice(1), 16); return 'rgba(' + ((p >> 16) & 255) + ',' + ((p >> 8) & 255) + ',' + (p & 255) + ',' + a + ')'; }
  // an item icon: the fish at 16 × 16, drawn to whatever size the slot wants
  function icon(id) {
    return function (ctx, x, y, s) {
      var cv = canvas(id, 16, 16, 1);
      if (!cv) return;
      var was = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(cv, x, y, s, s);
      ctx.imageSmoothingEnabled = was;
    };
  }

  return { TIERS: TIERS, tier: function (id) { return TIER[id] || 0; }, has: function (id) { return !!SPECS[id]; },
           canvas: canvas, icon: icon, SPECS: SPECS };
})();
