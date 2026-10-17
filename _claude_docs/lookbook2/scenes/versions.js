// The four versions side by side: Millpond Farm (dioramas/millpond_farm.py, the purpose-made farm diorama),
// one render finished four ways. Each panel pins its version; the rest of the page follows the bar.
(function () {
  const LB = window.LB;
  const dirs = { 32: 'assets/millpond-main-32', 48: 'assets/millpond-main-48' };
  // native px at 32 px a tile for a point (tile column, row, height) in the diorama's crop (columns 1–16, rows −1.2–7.24)
  const at = (x, r, z) => [(x - 1) * 32, (r + 1.2 - (z || 0) * 0.7071) * 32];
  const people = (ctx, S) => {
    const k = S.scale, t = S.t, v = LB.state.chibi || 'round';
    const a = at(4.6, 3.86, 1.55), b = at(10.6, 3.86, 1.55);
    const u = (t % 30) / 30, f = u < 0.5 ? u * 2 : 2 - u * 2;
    LB.chibi(ctx, Math.round((a[0] + (b[0] - a[0]) * f) * k), Math.round((a[1] + (b[1] - a[1]) * f) * k), 'farmer', { dir: u < 0.5 ? 'right' : 'left', walk: true, t, variant: v, scale: k, sun: S.L.sun });
    const [fx, fy] = at(9.52, 5.55, 0.11);
    LB.chibi(ctx, Math.round(fx * k), Math.round(fy * k), 'fisher', { dir: 'up', t, variant: v, scale: k, sun: S.L.sun, seed: 7 });
    const [px, py] = at(7.15, 6.3, 0.03);
    LB.chibi(ctx, Math.round(px * k), Math.round(py * k), 'pilot', { dir: 'down', t, variant: v, scale: k, sun: S.L.sun, seed: 3 });
  };
  const V = [
    ['model', 'Model', 'Today\'s 32 pixels a tile, with smooth light in small steps and soft outlines. The closest to the game now, cleaned up.'],
    ['toy', 'Toy', '32 pixels a tile, with three or four bands of light, cool shadows and warm highlights, and clear outlines. The cutest read.'],
    ['modelhd', 'Model HD', '48 pixels a tile: half again as much detail in every model, smooth light. The most like a little 3D diorama.'],
    ['toyhd', 'Toy HD', '48 pixels a tile with the toy light and outlines: crisp like pixel art, detailed like a model.'],
  ];
  V.forEach(([v, name, blurb], i) => {
    LB.add(LB.relit.scene({
      id: 'v-' + v, order: 1 + i, section: 'versions', version: v, name, blurb, recommended: v === 'modelhd',
      dirs, live: people, ready: (v) => LB.chibi.ready(['farmer', 'fisher', 'pilot'], LB.state.chibi || 'round', v.ts / 32),
    }));
  });
})();
