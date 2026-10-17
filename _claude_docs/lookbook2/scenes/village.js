// Brambleford's main street (tools/bridge-art/scenes/verdance_village.py): the Crusty Loaf and the Hayloft, as the game
// builds them today and with a richer kit of house parts (village/richer.py), both relit live.
(function () {
  const LB = window.LB;
  // the frame's top-left in the scene, in tiles (the renders' crop)
  const C0 = 2.0, R0 = 4.2;
  const px = (c, r) => [(c - C0) * 32, (r - R0) * 32];          // a place in the scene → 32-px native px

  function smoke(ctx, S, P, G, k) {
    const pts = (G.meta && G.meta.smoke) || [];
    if (!pts.length) return;
    const wind = S.weather === 'rain' ? 0.6 : 1;
    ctx.save();
    for (const [sx, sy] of pts) {
      for (let n = 0; n < 9; n++) {
        const u = ((S.t * 0.2 + n / 9) % 1);
        const x = (sx + u * u * 20 * wind + Math.sin(u * 7 + n) * 1.4) * k, y = (sy - u * 32) * k;
        if (y < -6 * k) continue;
        ctx.globalAlpha = (1 - u) * (S.L.night > 0.5 ? 0.35 : 0.5);
        P.disc(x, y, (1.4 + u * 3.6) * k, u < 0.3 ? '#ece8e4' : '#d4d4dc');
      }
    }
    ctx.restore();
  }

  function people(ctx, S, P, G) {
    const k = S.scale, t = S.t, sun = S.L.sun;
    // the baker out front of the Crusty Loaf, the farmer walking the street and back
    const [bx, by] = px(6.2, 11.55);
    LB.chibi(ctx, Math.round(bx * k), Math.round(by * k), 'baker', { dir: 'down', t, scale: k, sun, seed: 2 });
    const u = (t % 30) / 30, f = u < 0.5 ? u * 2 : 2 - u * 2;
    const [fx0] = px(2.6, 0), [fx1] = px(16.4, 0), [, fy] = px(0, 11.95);
    LB.chibi(ctx, Math.round((fx0 + (fx1 - fx0) * f) * k), Math.round(fy * k), 'farmer', { dir: u < 0.5 ? 'right' : 'left', walk: true, t, scale: k, sun, seed: 5 });
  }

  const common = {
    section: 'building', world: 'Verdance',
    live(ctx, S, P, G) { smoke(ctx, S, P, G, S.scale); people(ctx, S, P, G); },
  };

  LB.add(LB.relit.scene(Object.assign({}, common, {
    id: 'village-today', order: 80, name: 'Brambleford today',
    blurb: 'The main street as the game builds it now: the Crusty Loaf bakery and the Hayloft inn, from the same Blender kit as every village, only relit live.',
    see: [
      'Every roof is the same shingle kit in a different colour, so the bakery and the inn read alike from above',
      'The fronts are plain: a door, a few windows, the shop sign',
      'Even so, the light by the hour, the night windows and the snow already lift it',
    ],
    build: 'This is the scene the game already has, rendered with the extra light passes. Nothing new to build.',
    now: 'brambleford.jpg',
    dirs: { 32: 'assets/village-today-street-32', 48: 'assets/village-today-street-48' },
  })));

  LB.add(LB.relit.scene(Object.assign({}, common, {
    id: 'village-richer', order: 81, name: 'Brambleford, richer kit', recommended: true,
    blurb: 'The same street from the same scene script, built with a richer kit of house parts. Each roof is its own material now, and the fronts have more to look at, while it stays the same little model world.',
    see: [
      'A hipped thatch on the inn: streaky straw that sweeps round the corners, a rolled eave, a scalloped ridge pinned with crossed spars, moss low down',
      'Clay pantiles on the bakery: rounded tiles in columns, and a gabled porch with its own little tiled roof',
      'A bow-fronted shop window, windows with sills, lintels, shutters and flower boxes, lanterns either side of the inn door, rafter ends under the eaves',
      'A cobbled street with stone kerbs and a flagged pavement, a walled garden with a gate and an apple tree, the pump, tubs of flowers, barrels, a cat on the step',
      'Every house picks its own plaster, trim, shutter and stone colours',
    ],
    build: 'A new part of the Blender kit (village/housekit.py): houses, shop fronts, the street and street life. The inn gets thatch and the bakery tiles because of their roof colours, so the scene script itself barely changes; every village picks the kit up when it is re-rendered.',
    dirs: { 32: 'assets/village-richer-street-32', 48: 'assets/village-richer-street-48' },
  })));
})();
