// A kit smoke test (not in the page): a meadow, a pond with a tree on its far bank, shadows, a reflection, glints, a lamp.
(function () {
  const W = 320, H = 180;
  let pondMask = null, objLayer = null, pts = null;
  const spots = [[110, 92], [150, 88], [210, 94], [40, 150], [280, 140]];
  const pondTop = (x) => 92 + Math.round(6 * Math.sin(x * 0.05));
  const tree = (season) => LB.sprite('test-tree-' + season, 48, 64, (P) => {
    const leaf = { spring: '#6cb04c', summer: '#3f8a3c', autumn: '#c8702c', winter: '#5a6a5a' }[season];
    const R = LB.ramp(leaf, 5);
    P.rect(21, 40, 6, 24, '#5a3a24'); P.rect(21, 40, 2, 24, '#7a5234');
    const r = LB.rng(7);
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, d = r() * 13;
      const x = 24 + Math.cos(a) * d * 1.1, y = 24 + Math.sin(a) * d * 0.9;
      const lit = (24 - x) * 0.03 + (24 - y) * 0.05 + r() * 0.5;
      P.blob(x, y, 6 + r() * 3, R[LB.clamp(Math.round(1 + lit * 2), 0, 4)], i + 1, 0.3);
    }
  }, { outline: 'sel' });
  LB.add({
    id: 'test', order: 999, section: 'test', name: 'Kit test', w: W, h: H,
    init(S) {
      pondMask = LB.canvas(W, H);
      const P = LB.paint(LB.ctx2d(pondMask));
      for (let x = 70; x < 250; x++) {
        const half = Math.sqrt(Math.max(0, 1 - ((x - 160) / 90) ** 2));
        P.rect(x, pondTop(x), 1, Math.round(60 * half), '#fff');
      }
      pts = LB.maskPoints(pondMask, 60, 4);
    },
    ground(ctx, S, P) {
      const G = LB.ramp(S.season === 'winter' ? '#e8eef6' : '#5a9a48', 5);
      P.rect(0, 0, W, H, G[2]);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const n = LB.fbm(x * 0.05, y * 0.07, 3, 3);
        if (n > 0.62) P.px(x, y, G[3]); else if (n < 0.36) P.px(x, y, G[1]);
      }
      // the pond bed
      ctx.drawImage(LB.silhouette(pondMask, '#2c5a6a'), 0, 0);
    },
    water(ctx, S, P) {
      // sky colour on the water, then the trees upside down, wobbling
      const tmp = LB.memo('test-sky', () => LB.canvas(W, H)), tc = LB.ctx2d(tmp);
      tc.clearRect(0, 0, W, H); tc.fillStyle = LB.mix(S.L.skyTop, '#3a6a7a', 0.35); tc.fillRect(0, 0, W, H);
      tc.globalCompositeOperation = 'destination-in'; tc.drawImage(pondMask, 0, 0); tc.globalCompositeOperation = 'source-over';
      ctx.save(); ctx.globalAlpha = 0.7; ctx.drawImage(tmp, 0, 0); ctx.restore();
      const refl = LB.memo('test-refl:' + S.season + Math.round(S.time * 4), () => LB.mirror(objLayer, pondTop, 0, W));
      LB.ripple(ctx, refl, pondMask, S, { amp: 1, alpha: 0.55 });
      LB.glints(ctx, pts, S);
    },
    shadows(sh, S) {
      const t = tree(S.season);
      for (const [x, y] of spots) sh.cast(t, x, y);
      sh.pole(170, 150, 30, 2);
    },
    objects(ctx, S, P) {
      const t = tree(S.season);
      for (const [x, y] of spots) LB.blit(ctx, t, x, y);
      P.rect(169, 120, 3, 30, '#2a2a34'); P.rect(166, 116, 9, 6, '#2a2a34');
      objLayer = objLayer || LB.canvas(W, H);
      const oc = LB.ctx2d(objLayer); oc.clearRect(0, 0, W, H); oc.drawImage(ctx.canvas, 0, 0);
    },
    live(ctx, S) { LB.person(ctx, 140 + Math.round((S.t * 12) % 60), 160, 'farmer', { walk: true, t: S.t, dir: 'right' }); },
    emissive(ctx, S, P) { if (S.L.night > 0.3) P.rect(167, 118, 7, 3, '#ffe8a0'); },
    lights(S) { return [{ x: 170, y: 120, r: 40, c: '#ffb050', flicker: 1 }]; },
  });
})();
