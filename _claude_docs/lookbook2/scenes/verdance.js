// Verdance: Millpond Farm — a purpose-made diorama in the game's own Blender kit (dioramas/millpond_farm.py), relit live.
// Positions below are in native px of the 32-px version (crop: columns 1–16, rows −1.2–7.24); × S.scale for 48 px.
(function () {
  const LB = window.LB;
  const dirs = { 32: 'assets/millpond-main-32', 48: 'assets/millpond-main-48' };
  // a point in the diorama (tile column, row, height) → native px at 32 px a tile
  const at = (x, r, z) => [(x - 1) * 32, (r + 1.2 - (z || 0) * 0.7071) * 32];
  const FALL = { x0: at(12.05, 4, 0)[0], x1: at(12.95, 4, 0)[0], y0: at(12, 3.95, 1.51)[1], y1: at(12, 4.62, -0.08)[1] };
  const POND = { x0: at(8.2, 0, 0)[0], x1: at(14.6, 0, 0)[0], y0: at(0, 4.5, -0.1)[1], y1: at(0, 6.9, -0.1)[1] };
  const JETTY = at(9.52, 5.55, 0.11);
  const WALK = [at(4.6, 3.86, 1.55), at(10.6, 3.86, 1.55)];        // along the top of the wall, in front of the farmhouse
  const LOW = [at(7.05, 5.5, 0.03), at(7.05, 6.25, 0.03), at(7.55, 6.95, 0.03)];   // the path below the steps

  function people(ctx, S) {
    const k = S.scale, t = S.t, v = LB.state.chibi || 'round';
    // the farmer strolls along the house front and back
    const u = (t % 30) / 30, f = u < 0.5 ? u * 2 : 2 - u * 2;
    const x = WALK[0][0] + (WALK[1][0] - WALK[0][0]) * f, y = WALK[0][1] + (WALK[1][1] - WALK[0][1]) * f;
    LB.chibi(ctx, Math.round(x * k), Math.round(y * k), 'farmer', { dir: u < 0.5 ? 'right' : 'left', walk: true, t, variant: v, scale: k, sun: S.L.sun });
    // the baker comes down the steps' path now and then, stands a while, goes back
    const w = (t % 26) / 26, g = w < 0.35 ? w / 0.35 : w < 0.65 ? 1 : 1 - (w - 0.65) / 0.35;
    const seg = g * (LOW.length - 1), i = Math.min(LOW.length - 2, Math.floor(seg)), fr = seg - i;
    const bx = LOW[i][0] + (LOW[i + 1][0] - LOW[i][0]) * fr, by = LOW[i][1] + (LOW[i + 1][1] - LOW[i][1]) * fr;
    const moving = w < 0.35 || w > 0.65;
    LB.chibi(ctx, Math.round(bx * k), Math.round(by * k), 'baker', { dir: moving ? (w < 0.35 ? 'down' : 'up') : 'right', walk: moving, t, variant: v, scale: k, sun: S.L.sun, seed: 4 });
    // the fisher at the end of the jetty, facing the falls, a line out
    const [fx, fy] = JETTY;
    LB.chibi(ctx, Math.round(fx * k), Math.round(fy * k), 'fisher', { dir: 'up', t, variant: v, scale: k, sun: S.L.sun, seed: 7 });
    const P = LB.paint(ctx);
    const hx = Math.round((fx + 5) * k), hy = Math.round((fy - 19) * k), tx = Math.round((fx + 15) * k), ty = Math.round((fy - 40) * k);
    P.line(hx, hy, tx, ty, '#5a3a20');
    const bob = Math.round(Math.sin(t * 1.3) * 0.7 * k), bxx = Math.round((fx + 19) * k), byy = Math.round((fy - 30) * k) + bob;
    ctx.save(); ctx.globalAlpha = 0.55; P.line(tx, ty, bxx, byy - 1, '#eef2f6'); ctx.restore();
    if (S.season !== 'winter') { P.px(bxx, byy, '#e83a2a'); P.px(bxx, byy - 1, '#f8f8f8'); LB.rings(ctx, [[bxx, byy + 1, 0.2]], S, { period: 3.4, r: Math.round(5 * k), alpha: 0.4 }); }
  }

  // the falling water: light streaks running down the fall, foam churning where it lands (not in a hard frost)
  function waterfall(ctx, S, P) {
    const k = S.scale, t = S.t, frozen = S.season === 'winter';
    const x0 = Math.round(FALL.x0 * k), x1 = Math.round(FALL.x1 * k), y0 = Math.round(FALL.y0 * k), y1 = Math.round(FALL.y1 * k);
    const night = S.L.night;
    const hi = night > 0.6 ? '#a8b8e0' : '#ffffff', mid = night > 0.6 ? '#6c80b4' : '#cfeaf2';
    ctx.save();
    for (let x = x0; x < x1; x++) {
      if (frozen && Math.abs(x - (x0 + x1) / 2) > (x1 - x0) * 0.18) continue;     // in winter only a thread still runs
      const sp = (55 + LB.hash(x, 0, 1) * 30) * k, L = Math.round((3 + LB.hash(x, 1, 1) * 5) * k);
      for (let y = y0; y < y1; y += 1) {
        const h = LB.hash(x, Math.floor((y - t * sp) / L), 77);
        if (h > 0.78) { ctx.globalAlpha = 0.75; P.px(x, y, h > 0.93 ? hi : mid); }
      }
    }
    if (!frozen) {
      for (let n = 0; n < 14 * k; n++) {
        const ph = LB.hash(n, 3, 5), a = (t * 1.6 + ph * 7) % 1;
        const fx = x0 - 3 * k + LB.hash(n, 4, 5) * (x1 - x0 + 6 * k), fy = y1 - a * 4 * k;
        ctx.globalAlpha = (1 - a) * 0.8;
        P.rect(Math.round(fx), Math.round(fy), Math.max(1, Math.round(k)), Math.max(1, Math.round(k)), hi);
      }
      LB.rings(ctx, [[Math.round((x0 + x1) / 2 - 4 * k), y1 + Math.round(3 * k), 0], [Math.round((x0 + x1) / 2 + 5 * k), y1 + Math.round(5 * k), 0.4]], S,
        { period: 2.2, r: Math.round(9 * k), alpha: 0.45 });
    }
    ctx.restore();
  }

  // ducks paddling about the pond (not when it's frozen)
  function ducks(ctx, S, P) {
    if (S.season === 'winter' || S.L.night > 0.7) return;
    const k = S.scale, t = S.t;
    for (let i = 0; i < 2; i++) {
      const a = t * 0.05 + i * 2.6;
      const x = Math.round(((POND.x0 + POND.x1) / 2 + Math.cos(a) * (POND.x1 - POND.x0) * 0.22 + 14) * k);
      const y = Math.round(((POND.y0 + POND.y1) / 2 + Math.sin(a * 1.3) * (POND.y1 - POND.y0) * 0.16 + 6) * k);
      const dir = Math.sin(a) > 0 ? -1 : 1, s = Math.max(1, Math.round(k));
      const body = i ? '#8a6a48' : '#f2f0ea', head = i ? '#2e6a3a' : '#f2f0ea';
      P.rect(x - 2 * s, y, 5 * s, 2 * s, body); P.rect(x - 2 * s, y + 2 * s, 5 * s, s, LB.mix(body, '#3a4a5a', 0.4));
      P.rect(x + dir * 2 * s, y - 2 * s, 2 * s, 2 * s, head); P.px(x + dir * 4 * s, y - s, '#e8a030');
      ctx.save(); ctx.globalAlpha = 0.35; P.hline(x - 4 * s, x + 4 * s, y + 3 * s, '#e8f4f8'); ctx.restore();
    }
  }

  LB.add(LB.relit.scene({
    id: 'verdance', order: 20, section: 'place', world: 'Verdance', name: 'Millpond Farm',
    blurb: 'The farm rebuilt as a proper little diorama in our own Blender kit: a stone terrace with the farmhouse on top, a stream that drops over the wall into a millpond, a field below. Same camera, same models, same people; far more to it.',
    see: [
      'The land has shape: a dry-stone terrace with ivy and ferns, a pond sunk into the meadow with muddy, pebbly banks, a cove and a point',
      'The waterfall running into the pond, and the wall, the falls and the bank mirrored in the water',
      'The richer farmhouse: a clay-tiled roof with a dormer, shutters, flower boxes, tubs of flowers and flagstones to the steps',
      'Rows of cabbages, corn and carrots, reeds and cattails in clumps, lily pads, a jetty and a rowboat, beehives by the orchard',
      'Shadows from every model swinging with the sun; snow on the roof, the wall top and the field in winter, ice creeping in from the shore',
    ],
    build: 'This is a scene script like the game\'s own (tools/bridge-art/scenes), built from the existing kit plus a richer house kit and a shaped heightfield for the land. Each world would get its places remade this way, then rendered with the extra light passes.',
    now: 'verdance.jpg',
    dirs,
    ready: (v) => LB.chibi.ready(['farmer', 'baker', 'fisher'], LB.state.chibi || 'round', v.ts / 32),
    water(ctx, S, P) { ducks(ctx, S, P); },
    live(ctx, S, P) {
      waterfall(ctx, S, P);
      people(ctx, S);
      const k = S.scale, t = S.t, night = S.L.night;
      // birds crossing by day
      if (night < 0.4 && S.weather !== 'rain') {
        const cyc = (t % 28) / 28;
        for (let i = 0; i < 3; i++) {
          const bx = Math.round((-30 + cyc * 540 - i * 9) * k), by = Math.round((26 + i * 5 + Math.sin(t * 0.8 + i) * 3) * k), up = Math.floor(t * 6 + i) % 2;
          P.px(bx, by, '#2a2a3a'); P.px(bx - 1, by - up, '#2a2a3a'); P.px(bx + 1, by - up, '#2a2a3a');
          if (up) { P.px(bx - 2, by - 1, '#2a2a3a'); P.px(bx + 2, by - 1, '#2a2a3a'); }
        }
      }
      // fireflies over the pond on summer nights; leaves in autumn; petals in spring
      if (S.season === 'summer' && night > 0.5 && S.weather === 'clear') LB.motes(ctx, S, { n: Math.round(24 * k), x: POND.x0 * k, y: (POND.y0 - 30) * k, w: (POND.x1 - POND.x0 + 60) * k, h: (POND.y1 - POND.y0 + 40) * k, blink: true, colors: ['#fff6a0', '#d8ff8a'], seed: 3 });
      if (S.season === 'autumn') LB.motes(ctx, S, { n: Math.round(18 * k), fall: 14 * k, colors: ['#d87a2a', '#c44a2a', '#e8b03a'], seed: 6 });
      if (S.season === 'spring' && night < 0.5) LB.motes(ctx, S, { n: Math.round(10 * k), x: 380 * k, y: 0, w: 100 * k, h: 140 * k, fall: 9 * k, colors: ['#f6c2d2', '#fff4f6'], seed: 7 });
      // dawn mist lying low on the pond: soft drifting banks (the fog weather adds its own over everything)
      const dawn = Math.max(0, 1 - Math.abs(S.time - 6.8) / 1.6) * (S.weather === 'clear' ? 1 : 0.4);
      if (dawn > 0.02) {
        ctx.save();
        const cxp = (POND.x0 + POND.x1) / 2, cyp = (POND.y0 + POND.y1) / 2;
        for (let i = 0; i < 7; i++) {
          const x = (cxp + Math.sin(t * 0.08 + i * 2.1) * (POND.x1 - POND.x0) * 0.3) * k, y = (cyp + (i - 3) * 5) * k;
          ctx.globalAlpha = dawn * 0.16;
          P.ellipse(x, y, (POND.x1 - POND.x0) * (0.22 + 0.06 * Math.sin(i)) * k, 5 * k, '#eef2f4');
          ctx.globalAlpha = dawn * 0.12;
          P.ellipse(x + 8 * k, y - 2 * k, (POND.x1 - POND.x0) * 0.14 * k, 3 * k, '#ffffff');
        }
        ctx.restore();
      }
    },
  }));
})();
