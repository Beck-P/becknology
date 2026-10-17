// Becknology Look Book — people. Hand-built pixel characters on a paper doll: a base body (skin, face), then hair,
// outfit, hat and a held thing laid over it, each with its own hue-shifted ramp. Four directions, a four-frame walk with
// a bob and an arm swing, breathing and blinking when idle, sitting. Every frame is built once and cached, so a call is
// one drawImage. Replaces the kit's placeholder LB.person.
(function () {
  'use strict';
  const LB = window.LB;
  const FW = 48, FH = 66, CX = 24, G = 63; // frame size, centre column (the body sits on CX-0.5), ground row (soles)

  // ---------- palettes ----------
  const ramps = new Map();
  const R = (c, o) => {
    const k = c + (o ? o.k : '');
    if (!ramps.has(k)) ramps.set(k, LB.ramp(c, 5, o));
    return ramps.get(k);
  };
  const SKIN_O = { k: 'skin', cool: 350, warm: 38, shift: 12, dark: 0.26 };
  const SKINS = ['#f4d0b0', '#e8b690', '#cc946a', '#a06a48', '#6e4834'];
  const sk = (s) => R(SKINS[s.skin || 0], SKIN_O);
  const HAIR = {
    black: '#33293a', brown: '#6e4630', chestnut: '#934e2c', blonde: '#dcb45e', red: '#bc5630', grey: '#a6a2ac',
    white: '#e4e0dc', platinum: '#ece0b6', teal: '#2e6070', pink: '#f2609e', green: '#5a8c3c', auburn: '#7a3424',
  };
  const EYES = { brown: '#5c3a26', blue: '#3a6cb0', green: '#3c7c48', grey: '#566274', amber: '#b0742a', violet: '#6c4aa6' };
  const hr = (s) => R(HAIR[s.hairC] || s.hairC || HAIR.brown);
  const LASH = '#2c1f2c', WHITE = '#fdf8ef';
  const mouthC = (s) => LB.mix(sk(s)[0], '#9c2e3a', 0.55);

  // A row of a rounded part lit from the upper left: a light edge, the base, a shaded edge.
  function run(P, xa, xb, y, r, l, d) {
    if (xb < xa) return;
    const w = xb - xa + 1;
    l = l == null ? (w >= 6 ? 2 : 1) : l; d = d == null ? (w >= 6 ? 2 : 1) : d;
    P.rect(xa, y, w, 1, r[2]);
    if (w >= 3 && l) P.rect(xa, y, Math.min(l, w - 2), 1, r[3]);
    if (w >= 2 && d) P.rect(xb - Math.min(d, w - 1) + 1, y, Math.min(d, w - 1), 1, r[1]);
  }
  // a thick line (limbs, poles): each row a short run centred on the line
  function limb(P, x0, y0, x1, y1, w, r, far) {
    const n = Math.max(1, y1 - y0);
    for (let y = y0; y <= y1; y++) {
      const x = Math.round(x0 + ((x1 - x0) * (y - y0)) / n);
      const xa = x - Math.floor(w / 2);
      P.rect(xa, y, w, 1, far ? r[1] : r[2]);
      P.px(xa, y, far ? r[1] : r[3]);
      P.px(xa + w - 1, y, far ? r[0] : r[1]);
    }
  }

  // ---------- body proportions ----------
  const ADULT = { head: 15, torso: 13, leg: 10, tw: 14 };
  const CHILD = { head: 14, torso: 9, leg: 6, tw: 12 };
  function geom(s, pose) {
    const b = s.child ? CHILD : ADULT;
    const u = pose.u || 0;
    const legTop = G - 2 - b.leg;
    const tBot = legTop - 1 + u, tTop = legTop - b.torso + u;
    const hBot = tTop - 2, hTop = hBot - b.head + 1;
    const half = b.tw / 2 + (s.broad || 0);
    return { b, u, legTop, tTop, tBot, hTop, hBot, half, sit: !!pose.sit, ey: hTop + 7 };
  }

  // ---------- heads & faces ----------
  const HEAD_W = [10, 12, 14, 14, 14, 14, 14, 14, 14, 14, 14, 12, 12, 10, 8];
  const headW = (g, i) => HEAD_W[Math.min(14, Math.round((i * 14) / (g.b.head - 1)))];
  function headFront(P, g, s, back) {
    const k = sk(s);
    for (let i = 0; i < g.b.head; i++) {
      const w = headW(g, i), y = g.hTop + i, xa = CX - w / 2, xb = CX + w / 2 - 1;
      P.rect(xa, y, w, 1, k[2]);
      if (i >= 2 && i <= 10) P.rect(xa, y, 2, 1, k[3]);
      if (i >= 1) P.rect(xb - 1, y, 2, 1, k[1]);
      if (i === g.b.head - 1) P.rect(xa, y, w, 1, k[1]);
    }
    if (s.ears === 'elf') {
      for (const sd of [-1, 1]) {
        const x0 = sd < 0 ? CX - 8 : CX + 7;
        P.rect(x0, g.hTop + 7, 1, 3, sd < 0 ? k[2] : k[1]);
        P.rect(x0 + sd, g.hTop + 6, 1, 3, sd < 0 ? k[3] : k[1]);
        P.rect(x0 + 2 * sd, g.hTop + 5, 1, 2, sd < 0 ? k[2] : k[1]);
        P.px(x0 + 3 * sd, g.hTop + 4, k[1]);
      }
    } else if (!s.hideEars) {
      P.rect(CX - 8, g.hTop + 7, 1, 3, k[2]); P.px(CX - 8, g.hTop + 8, k[1]);
      P.rect(CX + 7, g.hTop + 7, 1, 3, k[1]);
    }
    if (back) return;
  }
  function eye(P, x, y, s, closed) {
    if (closed) { P.rect(x, y + 1, 2, 1, LASH); return; }
    const e = R(EYES[s.eyes] || EYES.brown);
    P.rect(x, y, 2, 1, LASH);
    P.px(x, y + 1, WHITE); P.px(x + 1, y + 1, e[1]);
    P.rect(x, y + 2, 2, 1, e[0]);
  }
  function faceFront(P, g, s, pose) {
    const k = sk(s), ey = g.ey, h = hr(s);
    // brows (a shade of the hair) — a little lift on the outer end
    P.rect(CX - 5, ey - 2, 3, 1, h[1]); P.px(CX - 5, ey - 3, h[1]);
    P.rect(CX + 2, ey - 2, 3, 1, h[1]); P.px(CX + 4, ey - 3, h[1]);
    eye(P, CX - 4, ey, s, pose.blink);
    eye(P, CX + 2, ey, s, pose.blink);
    // nose: a pixel of shade, a pixel of light
    P.px(CX, ey + 3, k[1]); P.px(CX - 1, ey + 2, k[3]);
    // mouth
    const m = mouthC(s);
    P.rect(CX - 1, ey + 5, 2, 1, m);
    if (s.smile) { P.px(CX - 2, ey + 4, m); P.px(CX + 1, ey + 4, m); P.rect(CX - 1, ey + 5, 2, 1, m); }
    if (s.blush) {
      const b = LB.mix(k[2], '#ff5a6e', 0.4);
      P.rect(CX - 6, ey + 3, 2, 1, b); P.rect(CX + 3, ey + 3, 2, 1, b);
    }
    if (s.glasses) {
      const gc = s.glasses;
      for (const ex of [CX - 5, CX + 1]) {
        P.rect(ex, ey - 1, 4, 1, gc); P.rect(ex, ey + 3, 4, 1, gc);
        P.rect(ex, ey, 1, 3, gc); P.rect(ex + 3, ey, 1, 3, gc);
      }
      P.rect(CX - 1, ey, 2, 1, gc);
    }
  }
  // the head in profile, facing left
  const SIDE_HEAD = [[-3, 3], [-5, 4], [-6, 5], [-6, 5], [-6, 5], [-6, 5], [-6, 5], [-6, 5], [-6, 5], [-6, 5], [-6, 5], [-6, 4], [-6, 4], [-5, 3], [-4, 2]];
  function headSide(P, g, s) {
    const k = sk(s);
    for (let i = 0; i < g.b.head; i++) {
      const [a, b] = SIDE_HEAD[Math.min(14, Math.round((i * 14) / (g.b.head - 1)))];
      const y = g.hTop + i;
      P.rect(CX + a, y, b - a + 1, 1, k[2]);
      if (i >= 2 && i <= 11) P.rect(CX + a, y, 2, 1, k[3]);
      P.px(CX + b, y, k[1]);
      if (i === g.b.head - 1) P.rect(CX + a, y, b - a + 1, 1, k[1]);
    }
    // jaw shade under the cheek, the ear
    P.rect(CX - 1, g.hTop + 11, 3, 1, k[1]);
    if (s.ears === 'elf') {
      P.rect(CX + 1, g.hTop + 7, 2, 3, k[2]); P.px(CX + 2, g.hTop + 8, k[1]);
      P.rect(CX + 3, g.hTop + 5, 1, 3, k[2]); P.px(CX + 4, g.hTop + 4, k[2]); P.px(CX + 5, g.hTop + 3, k[1]);
    } else if (!s.hideEars) {
      P.rect(CX + 1, g.hTop + 7, 2, 3, k[2]); P.px(CX + 2, g.hTop + 8, k[1]); P.px(CX + 1, g.hTop + 9, k[1]);
    }
  }
  function faceSide(P, g, s, pose) {
    const k = sk(s), ey = g.ey, h = hr(s);
    P.rect(CX - 5, ey - 2, 3, 1, h[1]);
    if (pose.blink) P.rect(CX - 4, ey + 1, 2, 1, LASH);
    else {
      const e = R(EYES[s.eyes] || EYES.brown);
      P.rect(CX - 4, ey, 2, 1, LASH); P.px(CX - 4, ey + 1, e[1]); P.px(CX - 3, ey + 1, WHITE); P.rect(CX - 4, ey + 2, 2, 1, e[0]);
    }
    // the nose stands out a pixel; the mouth
    P.px(CX - 7, ey + 2, k[2]); P.px(CX - 7, ey + 3, k[1]);
    P.px(CX - 6, ey + 5, mouthC(s)); P.px(CX - 5, ey + 5, mouthC(s));
    if (s.blush) P.rect(CX - 4, ey + 3, 2, 1, LB.mix(k[2], '#ff5a6e', 0.4));
    if (s.glasses) { P.rect(CX - 6, ey - 1, 4, 1, s.glasses); P.rect(CX - 6, ey + 3, 4, 1, s.glasses); P.rect(CX - 6, ey, 1, 3, s.glasses); P.rect(CX - 2, ey, 4, 1, s.glasses); }
  }

  // ---------- hair ----------
  // fringe patterns: how far each column's lock hangs below the hairline (14 columns, left to right)
  const FRINGE = {
    short: [3, 3, 2, 3, 1, 2, 2, 1, 2, 1, 2, 3, 3, 3],
    curly: [4, 3, 4, 2, 3, 2, 3, 2, 3, 2, 3, 4, 3, 4],
    long: [5, 4, 3, 2, 1, 1, 0, 0, 1, 1, 2, 3, 4, 5],
    bun: [3, 2, 2, 1, 1, 0, 0, 0, 0, 1, 1, 2, 2, 3],
    ponytail: [3, 3, 2, 2, 3, 2, 1, 2, 1, 1, 2, 2, 3, 3],
    undercut: [5, 5, 4, 4, 3, 3, 2, 2, 1, 0, 0, 0, 0, 0],
    wavy: [4, 3, 3, 2, 2, 1, 1, 1, 1, 2, 2, 3, 3, 4],
  };
  function hairShine(P, g, s, x0, y0) {
    const h = hr(s);
    P.rect(x0, y0, 4, 1, h[3]); P.rect(x0 + 1, y0 - 1, 3, 1, h[3]); P.px(x0 + 1, y0, h[4]); P.px(x0 + 2, y0 - 1, h[4]);
  }
  function hairFront(P, g, s) {
    const st = s.hair || 'short', h = hr(s), k = sk(s), top = g.hTop;
    if (st === 'bald') { P.px(CX - 4, top + 1, k[4]); P.px(CX - 3, top + 1, k[4]); P.px(CX - 4, top + 2, k[3]); return; }
    if (st === 'mohawk') {
      // shaved sides: a shadow of stubble
      const stub = LB.mix(k[1], h[1], 0.35);
      for (let i = 1; i < 6; i++) { const w = headW(g, i); P.rect(CX - w / 2, top + i, 3, 1, stub); P.rect(CX + w / 2 - 3, top + i, 3, 1, stub); }
      const spikes = [3, 5, 4, 6];
      for (let j = 0; j < 4; j++) {
        const x = CX - 2 + j, hh = spikes[j];
        P.rect(x, top - hh, 1, hh + 4, j < 2 ? h[3] : h[1]);
        P.px(x, top - hh, h[j < 2 ? 4 : 2]);
      }
      P.rect(CX - 2, top + 1, 4, 3, h[2]); P.px(CX - 2, top + 1, h[3]);
      return;
    }
    const vol = st === 'curly' ? 2 : st === 'bun' || st === 'undercut' ? 0 : 1;
    const up = st === 'curly' ? 3 : st === 'bun' ? 1 : 2;
    // shadow the hair casts on the forehead
    const fr = FRINGE[st] || FRINGE.short;
    for (let i = 0; i < 14; i++) P.px(CX - 7 + i, top + 4 + fr[i], k[1]);
    // the dome
    for (let y = top - up; y <= top + 3; y++) {
      const r = y - (top - up);
      let a, b;
      if (y < top) { const w = [8, 12, 14][Math.min(2, r + (3 - up))] + (vol > 1 ? 2 : 0); a = CX - w / 2; b = CX + w / 2 - 1; }
      else { a = CX - 7 - vol; b = CX + 6 + vol; }
      if (st === 'undercut' && y >= top) b = CX + 4;
      run(P, a, b, y, h, 2, 2);
    }
    // the locks hanging over the forehead
    for (let i = 0; i < 14; i++) {
      const x = CX - 7 + i, n = fr[i];
      if (n <= 0) continue;
      P.rect(x, top + 4, 1, n, i < 5 ? h[2] : h[1]);
      P.px(x, top + 3 + n, i < 7 ? h[1] : h[0]);
    }
    // lock partings, a strand of shine
    for (let i = 1; i < 13; i++) if (fr[i] < fr[i - 1] - 1 || fr[i] < fr[i + 1] - 1) P.px(CX - 7 + i, top + 3, h[1]);
    hairShine(P, g, s, CX - 5, top - up + 2);
    // sides over the ears
    const sideLen = st === 'long' || st === 'wavy' ? 0 : st === 'curly' ? 7 : st === 'bun' || st === 'undercut' ? 4 : 5;
    if (sideLen) {
      P.rect(CX - 7 - vol, top + 4, 1 + vol, sideLen, h[2]); P.px(CX - 7 - vol, top + 4, h[3]);
      if (st !== 'undercut') P.rect(CX + 6, top + 4, 1 + vol, sideLen, h[1]);
    }
    if (st === 'curly') {
      // curls: small lit arcs across the dome, bumps on the outline
      for (const [dx, dy] of [[-6, -2], [-3, -3], [1, -2], [4, -1], [-5, 1], [-1, 0], [3, 2], [-7, 4], [6, 4]]) {
        P.px(CX + dx, top + dy, h[3]); P.px(CX + dx + 1, top + dy + 1, h[1]);
      }
      for (const dx of [-8, -5, -1, 3, 6]) P.px(CX + dx, top - up - (dx === -1 ? 1 : 0), h[2]);
    }
    if (st === 'long' || st === 'wavy') {
      // curtains framing the face, down over the shoulders
      const bot = g.tTop + 7;
      for (let y = top + 3; y <= bot; y++) {
        const taper = y > bot - 2 ? 1 : 0;
        const wav = st === 'wavy' ? (Math.floor((y - top) / 3) % 2) : 0;
        P.rect(CX - 9 + taper + wav, y, 3 - taper, 1, h[2]); P.px(CX - 9 + taper + wav, y, h[3]);
        P.rect(CX + 6 + wav, y, 3 - taper, 1, h[1]); P.px(CX + 8 - taper + wav, y, h[0]);
      }
    }
    if (st === 'bun') {
      // the bun on top
      P.disc(CX - 1, top - 4, 3, h[2]);
      P.rect(CX - 3, top - 5, 2, 1, h[3]); P.px(CX - 2, top - 6, h[4]); P.rect(CX, top - 3, 2, 1, h[1]);
      P.rect(CX - 2, top - 1, 3, 1, h[1]);
    }
    if (st === 'ponytail') P.rect(CX + 6, top + 1, 2, 2, h[1]);
  }
  function hairBack(P, g, s, ph) {
    const st = s.hair || 'short', h = hr(s), k = sk(s), top = g.hTop;
    if (st === 'bald') { P.px(CX - 3, top + 1, k[4]); P.px(CX - 2, top + 1, k[3]); return; }
    if (st === 'mohawk') {
      for (let y = top - 5; y <= top + 10; y++) { const hh = y < top ? 3 : 4; P.rect(CX - 2, y, hh, 1, h[2]); P.px(CX - 2, y, h[3]); }
      for (const [x, hh] of [[CX - 2, 3], [CX - 1, 5], [CX, 4], [CX + 1, 6]]) P.rect(x, top - hh, 1, hh, h[2]);
      return;
    }
    const vol = st === 'curly' ? 2 : st === 'bun' || st === 'undercut' ? 0 : 1;
    const up = st === 'curly' ? 3 : st === 'bun' ? 1 : 2;
    const nape = st === 'curly' ? top + 12 : st === 'short' || st === 'undercut' ? top + 10 : top + 11;
    for (let y = top - up; y <= nape; y++) {
      let a, b;
      if (y < top) { const r = y - (top - up), w = [8, 12, 14][Math.min(2, r + (3 - up))] + (vol > 1 ? 2 : 0); a = CX - w / 2; b = CX + w / 2 - 1; }
      else if (y > top + 9) { a = CX - 6; b = CX + 5; }
      else { a = CX - 7 - vol; b = CX + 6 + vol; }
      run(P, a, b, y, h, 2, 2);
    }
    // strands: darker lines down the back of the head
    for (const [dx, y0] of [[-4, 4], [-1, 2], [2, 3], [5, 5]]) for (let y = top + y0; y <= nape - 1; y++) P.px(CX + dx, y, h[1]);
    for (const [dx, y0] of [[-3, 3], [0, 5], [3, 6]]) for (let y = top + y0; y <= top + y0 + 3; y++) P.px(CX + dx, y, h[3]);
    hairShine(P, g, s, CX - 5, top - up + 2);
    // jagged nape
    for (let i = -6; i <= 5; i += 2) P.px(CX + i, nape + 1, h[1]);
    if (st === 'curly') for (const [dx, dy] of [[-6, 0], [-2, -2], [3, 0], [-4, 5], [1, 4], [5, 7], [-6, 9]]) { P.px(CX + dx, top + dy, h[3]); P.px(CX + dx + 1, top + dy + 1, h[1]); }
    if (st === 'long' || st === 'wavy') {
      const bot = g.tTop + 9;
      for (let y = nape; y <= bot; y++) {
        const w = y > bot - 2 ? 10 : 14, wav = st === 'wavy' ? (Math.floor((y - top) / 3) % 2) : 0;
        run(P, CX - w / 2 + wav, CX + w / 2 - 1 + wav, y, h, 2, 2);
        if ((y + 1) % 3 === 0) P.px(CX - 2 + wav, y, h[1]);
      }
      for (let i = -4; i <= 3; i += 2) P.px(CX + i, bot + 1, h[1]);
    }
    if (st === 'bun') { P.disc(CX - 1, top - 3, 3, h[2]); P.rect(CX - 3, top - 4, 2, 1, h[3]); P.rect(CX - 2, top - 1, 3, 1, h[1]); }
    if (st === 'ponytail') {
      const sw = ph === 1 ? 1 : ph === 3 ? -1 : 0;
      P.rect(CX - 2, top + 3, 3, 2, h[0]); // the tie
      for (let y = top + 5; y <= top + 18; y++) {
        const w = y > top + 15 ? 2 : 3, x = CX - 2 + Math.round((sw * (y - top - 5)) / 10);
        P.rect(x, y, w, 1, h[2]); P.px(x, y, h[3]); P.px(x + w - 1, y, h[1]);
      }
    }
  }
  function hairSide(P, g, s, ph) {
    const st = s.hair || 'short', h = hr(s), k = sk(s), top = g.hTop;
    if (st === 'bald') { P.px(CX - 3, top + 1, k[4]); P.px(CX - 2, top + 1, k[3]); return; }
    if (st === 'mohawk') {
      for (let x = CX - 4; x <= CX + 5; x++) { const hh = 3 + ((x * 7) % 3); P.rect(x, top - hh + 1, 1, hh + 1, (x - CX) < 0 ? h[3] : h[2]); }
      const stub = LB.mix(k[1], h[1], 0.35);
      P.rect(CX - 1, top + 2, 6, 4, stub);
      return;
    }
    const vol = st === 'curly' ? 2 : st === 'bun' || st === 'undercut' ? 0 : 1;
    const up = st === 'curly' ? 3 : st === 'bun' ? 1 : 2;
    for (let y = top - up; y <= top + 10; y++) {
      let a, b;
      if (y < top) { const r = y - (top - up), w = [8, 12, 14][Math.min(2, r + (3 - up))]; a = CX - w / 2 - 1; b = CX + w / 2 - 1 + vol; }
      else if (y <= top + 3) { a = CX - 6; b = CX + 5 + vol; }
      else { a = st === 'short' || st === 'undercut' ? CX + 3 : CX + 2; b = CX + 5 + vol; if (y > top + 8) a = CX + 3; }
      if (st === 'undercut' && y > top + 3) { a = CX + 4; }
      run(P, a, b, y, h, 2, 1);
    }
    // the fringe at the front, the hair over the ear's top
    const fl = st === 'undercut' ? 5 : st === 'long' || st === 'wavy' ? 4 : st === 'bun' ? 2 : 3;
    P.rect(CX - 6, top + 4, 2, fl - 1, h[2]); P.px(CX - 6, top + 4, h[3]); P.px(CX - 5, top + 3 + fl, h[1]);
    P.rect(CX - 1, top + 4, 3, 2, h[1]);
    hairShine(P, g, s, CX - 4, top - up + 2);
    if (st === 'curly') for (const [dx, dy] of [[-4, -2], [0, -3], [3, -1], [5, 3], [3, 7], [-2, 1]]) { P.px(CX + dx, top + dy, h[3]); P.px(CX + dx + 1, top + dy + 1, h[1]); }
    if (st === 'long' || st === 'wavy') {
      const bot = g.tTop + 8;
      for (let y = top + 10; y <= bot; y++) { const wav = st === 'wavy' ? (Math.floor((y - top) / 3) % 2) : 0; P.rect(CX + 1 + wav, y, 5, 1, h[2]); P.px(CX + 1 + wav, y, h[3]); P.px(CX + 5 + wav, y, h[1]); }
    }
    if (st === 'bun') { P.disc(CX + 4, top - 1, 3, h[2]); P.rect(CX + 2, top - 2, 2, 1, h[3]); P.rect(CX + 4, top + 1, 2, 1, h[1]); }
    if (st === 'ponytail') {
      const sw = ph === 0 || ph === 2 ? 1 : 0;
      P.rect(CX + 6, top + 3, 2, 2, h[0]);
      for (let y = top + 4; y <= top + 15; y++) {
        const x = CX + 7 + Math.round(((y - top - 4) * (2 + sw)) / 11);
        P.rect(x, y, 3, 1, h[2]); P.px(x, y, h[3]); P.px(x + 2, y, h[1]);
      }
    }
  }
  function beard(P, g, s, view) {
    const h = R(HAIR[s.beardC || s.hairC] || HAIR.brown), top = g.hTop, ey = g.ey;
    if (view === 'back') { P.rect(CX - 8, top + 9, 1, 3, h[1]); P.rect(CX + 7, top + 9, 1, 3, h[1]); return; }
    if (s.beard === 'stubble') {
      const st = LB.mix(sk(s)[1], h[1], 0.3);
      if (view === 'front') { for (const [dx, dy] of [[-6, 4], [-6, 5], [5, 4], [5, 5], [-5, 6], [4, 6], [-3, 7], [-1, 7], [1, 7], [2, 7]]) P.px(CX + dx, ey + dy, st); }
      else for (const [dx, dy] of [[-4, 7], [-2, 7], [0, 6], [1, 5], [-5, 6]]) P.px(CX + dx, ey + dy, st);
      return;
    }
    const long = s.beard === 'long';
    if (view === 'front') {
      // sideburns into the jaw, a moustache, the chin
      P.rect(CX - 7, top + 8, 1, 4, h[2]); P.rect(CX + 6, top + 8, 1, 4, h[1]);
      for (let y = ey + 3; y <= g.hBot + (long ? 4 : 1); y++) {
        const i = y - (ey + 3);
        const w = y <= g.hBot - 2 ? 14 : y <= g.hBot ? 12 - (y - g.hBot + 2) * 2 : Math.max(4, (long ? 10 : 6) - (y - g.hBot) * 2);
        const a = CX - w / 2, b = CX + w / 2 - 1;
        if (i === 0) { P.rect(CX - 7, y, 2, 1, h[2]); P.rect(CX + 5, y, 2, 1, h[1]); continue; }
        run(P, a, b, y, h, 1, 2);
      }
      // moustache, the mouth showing through
      P.rect(CX - 3, ey + 4, 6, 1, h[2]); P.px(CX - 3, ey + 4, h[3]); P.px(CX + 2, ey + 4, h[1]);
      P.rect(CX - 1, ey + 5, 2, 1, mouthC(s));
      P.px(CX - 2, ey + 6, h[3]);
      if (long) for (let y = g.hBot + 1; y <= g.hBot + 4; y++) P.px(CX - 1 + (y % 2), y, h[1]);
    } else {
      for (let y = ey + 4; y <= g.hBot + (long ? 3 : 1); y++) {
        const a = CX - 6 + (y > g.hBot ? 1 : 0), b = y > g.hBot ? CX - 2 : CX + 1;
        run(P, a, b, y, h, 1, 1);
      }
      P.rect(CX + 1, top + 8, 1, 4, h[2]);
      P.rect(CX - 6, ey + 4, 3, 1, h[2]); P.px(CX - 6, ey + 5, mouthC(s));
    }
  }

  // ---------- hats ----------
  function hat(P, g, s, view) {
    const top = g.hTop, kind = s.hat;
    if (!kind || kind === 'dome') return;
    const side = view === 'side';
    if (kind === 'straw') {
      const r = R('#e2c070');
      // crown
      for (let y = top - 4; y <= top + 1; y++) { const w = y === top - 4 ? 8 : 12; const a = side ? CX - 5 : CX - w / 2; run(P, a, a + (side ? 10 : w - 1), y, r, 2, 2); }
      P.rect(side ? CX - 5 : CX - 6, top + 1, side ? 11 : 12, 1, '#b8402e'); // the band
      // brim seen from above
      const bw = side ? 11 : 11, by = top + 2;
      P.ellipse(CX - (side ? 1 : 0.5), by + 1, bw, 2, r[2]);
      P.rect(CX - bw + 1, by + 2, bw * 2 - 2, 1, r[1]);
      P.rect(CX - bw + 2, by, 6, 1, r[3]);
      for (let i = -bw + 2; i < bw - 1; i += 3) P.px(CX + i, by + 1, r[1]); // weave
      if (view !== 'back') { const k = sk(s); P.rect(CX - 6, top + 5, 12, 1, k[1]); }
    } else if (kind === 'chef') {
      const r = R('#f4f0e8');
      for (let y = top; y <= top + 2; y++) run(P, side ? CX - 6 : CX - 7, side ? CX + 5 : CX + 6, y, r, 2, 2);
      for (let x = (side ? CX - 6 : CX - 7) + 1; x < CX + 6; x += 2) P.px(x, top + 1, r[1]);
      const puffs = side ? [[-3, -4, 5], [2, -5, 5]] : [[-4, -4, 5], [0, -6, 5], [4, -4, 4]];
      for (const [dx, dy, rr] of puffs) P.disc(CX + dx, top + dy, rr, r[2]);
      for (const [dx, dy, rr] of puffs) { P.px(CX + dx - 2, top + dy - rr + 2, r[3]); P.px(CX + dx - 1, top + dy - rr + 1, r[4]); P.px(CX + dx + rr - 1, top + dy + 1, r[1]); }
      P.rect(CX - 6, top - 1, 12, 1, r[1]);
    } else if (kind === 'cap' || kind === 'watch') {
      const r = R(s.hatC || '#2a3c5e');
      for (let y = top - 2; y <= top + 2; y++) { const w = y === top - 2 ? 10 : 14; run(P, CX - w / 2, CX + w / 2 - 1, y, r, 2, 2); }
      if (kind === 'watch') { // a folded knit cuff
        for (let x = CX - 7; x < CX + 7; x++) { P.rect(x, top + 2, 1, 2, (x - CX) % 2 ? r[2] : r[1]); }
        P.rect(CX - 7, top + 2, 2, 1, r[3]);
      } else { // a peak
        if (side) { P.rect(CX - 10, top + 3, 5, 1, r[1]); P.rect(CX - 9, top + 2, 4, 1, r[0]); }
        else if (view === 'front') { P.rect(CX - 6, top + 3, 12, 1, r[0]); P.rect(CX - 5, top + 3, 3, 1, r[2]); }
        P.rect(CX - 4, top - 1, 3, 1, r[3]);
        if (s.hatBadge) P.rect(CX - 1, top, 2, 1, s.hatBadge);
      }
    } else if (kind === 'beanie') {
      const r = R(s.hatC || '#e2583e'), cuff = R(s.hatC2 || '#f2ecdc');
      for (let y = top - 3; y <= top + 1; y++) { const w = y === top - 3 ? 8 : y === top - 2 ? 12 : 14; run(P, CX - w / 2, CX + w / 2 - 1, y, r, 2, 2); }
      for (let y = top - 2; y <= top + 1; y++) for (let x = CX - 5; x < CX + 6; x += 3) P.px(x, y, r[1]);
      for (let x = CX - 7; x < CX + 7; x++) P.rect(x, top + 2, 1, 2, (x - CX) % 2 ? cuff[2] : cuff[1]);
      P.disc(CX - 1, top - 5, 2, cuff[2]); P.px(CX - 2, top - 6, cuff[4]); P.px(CX, top - 4, cuff[1]);
      if (s.goggles && view !== 'back') {
        const lens = R('#f0a040');
        if (side) { P.rect(CX - 7, top, 3, 2, lens[2]); P.px(CX - 7, top, lens[4]); }
        else { P.rect(CX - 5, top - 1, 4, 2, lens[2]); P.rect(CX + 1, top - 1, 4, 2, lens[1]); P.px(CX - 5, top - 1, lens[4]); P.px(CX + 1, top - 1, lens[3]); P.rect(CX - 1, top - 1, 2, 1, '#2a2a34'); }
      }
    } else if (kind === 'bandana') {
      const r = R(s.hatC || '#d44a46');
      for (let y = top - 2; y <= top + 2; y++) { const w = y === top - 2 ? 10 : 14; run(P, CX - w / 2, CX + w / 2 - 1, y, r, 2, 2); }
      for (const [dx, dy] of [[-5, -1], [-1, 0], [3, -1], [-3, 2], [1, 2], [5, 1]]) P.px(CX + dx, top + dy, '#fbf2e6');
      if (view === 'back' || side) { const kx = side ? CX + 6 : CX - 1; P.rect(kx, top + 2, 2, 2, r[1]); P.px(kx + 1, top + 4, r[1]); P.px(kx - 1, top + 4, r[2]); }
    } else if (kind === 'hood') {
      // a rounded hood, the face looking out through a ring of fur
      const r = R(s.hatC || s.top.c), fur = R('#ece4d8');
      const y0 = top - 3, y1 = g.hBot + 1;
      const ocx = side ? CX - 6 : CX - 0.5, ocy = top + 8, orx = side ? 4.2 : 6.3, ory = 7.6;
      const shellW = (y) => { const i = y - y0, j = y1 - y; return Math.min(9, [5, 7, 8][i] || 9, [7, 8][j] || 9); };
      for (let y = y0; y <= y1; y++) {
        const hw = shellW(y);
        const a = side ? CX - Math.min(hw, 7) : CX - hw, b = side ? CX + hw - 1 : CX + hw - 1;
        for (let x = a; x <= b; x++) {
          const e = ((x + 0.5 - ocx - 0.5) / orx) ** 2 + ((y + 0.5 - ocy) / ory) ** 2;
          if (view !== 'back' && e <= 1) continue;
          const lit = x - a < 2 ? 3 : b - x < 2 ? 1 : 2;
          P.px(x, y, r[y < y0 + 2 && lit === 2 && x - a < 6 ? 3 : lit]);
          if (view !== 'back' && e <= 1.55) P.px(x, y, fur[(x * 7 + y * 3) % 5 === 0 ? 1 : (x + y) % 2 ? 3 : 2]);
        }
      }
      if (view === 'back') { for (let x = CX - 7; x <= CX + 6; x++) if ((x + 1) % 2) P.px(x, y0 + 1, fur[2]); P.rect(CX - 1, y0 + 3, 2, y1 - y0 - 4, r[1]); }
      else { P.px(Math.round(ocx) - 4, ocy - 6, fur[4]); P.px(Math.round(ocx) - 5, ocy - 5, fur[4]); }
    } else if (kind === 'helmet') {
      const r = R('#a8b2c0');
      for (let y = top - 3; y <= top + 3; y++) { const w = y === top - 3 ? 8 : y === top - 2 ? 12 : 16; run(P, CX - w / 2, CX + w / 2 - 1, y, r, 3, 2); }
      P.rect(CX - 1, top - 3, 2, 6, r[3]); // the ridge
      P.ellipse(CX - 0.5, top + 4, side ? 9 : 10, 1, r[1]);
      P.rect(CX - 9, top + 4, 6, 1, r[2]);
      P.px(CX - 4, top - 1, r[4]); P.px(CX - 5, top, r[4]);
      if (view !== 'back') P.rect(CX - 6, top + 6, 12, 1, sk(s)[1]);
    } else if (kind === 'turban') {
      const r = R(s.hatC || '#c4443a');
      for (let y = top - 4; y <= top + 3; y++) { const w = y === top - 4 ? 10 : y === top - 3 ? 14 : 16; run(P, CX - w / 2, CX + w / 2 - 1, y, r, 2, 2); }
      for (let i = 0; i < 4; i++) for (let x = CX - 7; x <= CX + 6; x++) if ((x + i * 3) % 6 === 0) P.px(x, top - 3 + i * 2, r[1]); // wraps
      for (let x = CX - 7; x <= CX + 6; x++) P.px(x, top - 2 + ((x + 9) % 5 === 0 ? 1 : 0) + Math.floor((x - CX + 7) / 4), r[1]);
      if (view !== 'back') {
        const gx = side ? CX - 6 : CX - 1;
        P.rect(gx, top, 2, 2, '#3ab890'); P.px(gx, top, '#a8f0d0'); P.rect(gx - 1, top - 1, 4, 1, '#e0b23c');
        P.rect(gx + (side ? 0 : 1), top - 6, 1, 5, '#f2ecdc'); P.px(gx + (side ? -1 : 2), top - 7, '#f2ecdc');
      }
    } else if (kind === 'circlet') {
      if (view === 'back') { P.rect(CX - 7, top + 3, 14, 1, '#d8b450'); return; }
      if (side) { P.rect(CX - 6, top + 3, 9, 1, '#d8b450'); P.px(CX - 6, top + 3, '#f6e49a'); return; }
      P.rect(CX - 7, top + 3, 14, 1, '#d8b450'); P.rect(CX - 1, top + 2, 2, 2, '#46c890'); P.px(CX - 1, top + 2, '#c0f8e0'); P.px(CX - 6, top + 3, '#f6e49a');
    }
  }
  // the pilot's glass dome — drawn after the outline so the glass stays clear
  function dome(P, g, view) {
    const cx = CX - 0.5, cy = g.hTop + 7, r = 11;
    const ctx = P.ctx, id = ctx.getImageData(0, 0, FW, FH), d = id.data;
    const glass = LB.rgb('#c4ecf6');
    for (let y = cy - r; y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dd = Math.hypot(x + 0.5 - CX, y - cy);
      if (dd > r - 0.5) continue;
      const i = (y * FW + x) * 4;
      if (d[i + 3] < 128) { d[i] = glass[0]; d[i + 1] = glass[1]; d[i + 2] = glass[2]; d[i + 3] = dd > r - 2 ? 120 : 64; }
    }
    ctx.putImageData(id, 0, 0);
    // rim: light on the upper left, darker lower right
    for (let a = 0; a < 96; a++) {
      const th = (a / 96) * Math.PI * 2, x = Math.floor(CX + Math.cos(th) * r), y = Math.floor(cy + 0.5 + Math.sin(th) * r);
      const lit = Math.cos(th + Math.PI * 0.75);
      P.px(x, y, lit > 0.3 ? '#f2fbff' : lit > -0.4 ? '#9ccbdc' : '#5a8296');
    }
    // the shine
    for (const [dx, dy] of [[-7, -5], [-6, -6], [-5, -7], [-8, -3], [-8, -2]]) P.px(CX + dx, cy + dy, '#ffffff');
    P.px(CX + 6, cy + 5, '#e8f8ff'); P.px(CX + 7, cy + 4, '#e8f8ff');
    // the collar ring the dome seats in
    const c = R('#c8903a');
    const y0 = g.hBot + 1;
    P.rect(CX - 8, y0, 16, 2, c[2]); P.rect(CX - 8, y0, 3, 1, c[3]); P.rect(CX + 5, y0, 3, 2, c[1]); P.rect(CX - 8, y0 + 2, 16, 1, c[0]);
    if (view === 'front') { P.px(CX - 3, y0 + 1, '#5af0c0'); P.px(CX + 2, y0 + 1, '#ff7a5a'); }
  }

  // ---------- body: torso, arms, legs, feet ----------
  function sleeveR(s) { return R(s.sleeve || s.top.c); }
  function torso(P, g, s, view) {
    const t = s.top, r = R(t.c), half = g.half, n = g.b.torso;
    const side = view === 'side';
    for (let i = 0; i < n; i++) {
      const y = g.tTop + i, narrow = i === 0 || i >= n - 4;
      let a, b;
      if (side) { a = CX - half + 2 + (i === 0 ? 1 : 0); b = CX + half - 3 - (i === 0 ? 1 : 0); }
      else { a = narrow ? CX - half + 1 : CX - half; b = narrow ? CX + half - 2 : CX + half - 1; }
      run(P, a, b, y, r, 2, 2);
    }
    const T = g.tTop, B = g.tBot, k = sk(s);
    const kind = t.k, c2 = t.c2 && R(t.c2), trim = t.trim;
    const front = view === 'front', back = view === 'back';
    // neckline / collar for plain tops
    if (front && ['shirt', 'overalls', 'dress', 'apron', 'tee', 'tunic', 'cardigan'].includes(kind)) {
      P.rect(CX - 2, T, 4, 1, k[1]); P.rect(CX - 1, T + 1, 2, 1, k[1]);
      if (kind === 'shirt' || kind === 'overalls' || kind === 'apron') { P.rect(CX - 4, T, 2, 2, r[3]); P.rect(CX + 2, T, 2, 2, r[2]); }
    }
    if (kind === 'shirt') {
      if (front) for (let y = T + 3; y < B; y += 3) P.px(CX, y, r[1]);
      if (t.check) for (let y = T + 1; y <= B; y++) for (let x = CX - half; x < CX + half; x++) if ((x % 4 === 0) || (y % 4 === 0)) P.px(x, y, LB.mix(r[2], r[0], 0.35));
    }
    if (kind === 'overalls' || kind === 'dress') {
      const d = c2;
      if (front || back) {
        const y0 = kind === 'dress' ? T + 3 : T + 4;
        for (let y = y0; y <= B; y++) run(P, CX - 4 - (kind === 'dress' ? 1 : 0), CX + 3 + (kind === 'dress' ? 1 : 0), y, d, 1, 1);
        for (let y = T; y < y0; y++) { P.rect(CX - 5, y, 2, 1, d[2]); P.rect(CX + 3, y, 2, 1, d[1]); }
        if (front && kind === 'overalls') {
          P.px(CX - 4, y0, '#f0c850'); P.px(CX + 3, y0, '#f0c850');
          P.rect(CX - 2, y0 + 2, 4, 3, d[1]); P.rect(CX - 2, y0 + 2, 4, 1, d[3]);
        }
        if (front && kind === 'dress') { for (let x = CX - 4; x <= CX + 4; x += 2) P.px(x, B, d[3]); }
        if (back) { P.line(CX - 5, T, CX + 2, y0, d[1]); P.line(CX + 4, T, CX - 3, y0, d[1]); }
      } else {
        for (let y = T + 4; y <= B; y++) P.rect(CX - half + 2, y, 3, 1, d[2]);
        for (let y = T; y < T + 4; y++) P.rect(CX - 1, y, 2, 1, d[2]);
      }
    }
    if (kind === 'apron') {
      const w = c2;
      if (front) {
        for (let y = T + 3; y <= B; y++) run(P, CX - 4, CX + 3, y, w, 1, 1);
        P.rect(CX - 3, T, 1, 3, w[2]); P.rect(CX + 2, T, 1, 3, w[1]);
        P.rect(CX - 2, T + 7, 4, 2, w[1]); P.rect(CX - 2, T + 7, 4, 1, w[3]); // a pocket
        P.px(CX - half, B - 3, w[2]); P.px(CX + half - 1, B - 3, w[1]);
      } else if (back) {
        P.rect(CX - half + 1, B - 3, half * 2 - 2, 1, w[2]);
        P.rect(CX - 3, B - 4, 2, 2, w[3]); P.rect(CX + 1, B - 4, 2, 2, w[2]); P.rect(CX - 1, B - 3, 2, 1, w[1]); // the bow
        P.px(CX - 2, B - 2, w[2]); P.px(CX + 1, B - 1, w[1]);
      } else {
        for (let y = T + 3; y <= B; y++) P.rect(CX - half + 1, y, 3, 1, w[2]);
        P.rect(CX + half - 4, B - 3, 2, 2, w[2]);
      }
    }
    if (kind === 'sweater') {
      for (let y = B - 1; y <= B; y++) for (let x = CX - half + 1; x < CX + half - 1; x++) if (x % 2) P.px(x, y, r[1]);
      if (front || back) for (const dx of [-4, 3]) for (let y = T + 2; y < B - 1; y++) P.px(CX + dx, y, (y % 2) ? r[3] : r[1]);
      if (!back) { const a = side ? CX - 4 : CX - 3; P.rect(a, T - 1, side ? 5 : 6, 2, r[3]); P.rect(a, T + 1, side ? 5 : 6, 1, r[1]); }
    }
    if (kind === 'stripes') {
      const st = c2;
      for (let y = T + 1; y <= B; y += 3) {
        const a = side ? CX - half + 2 : CX - half, b = side ? CX + half - 3 : CX + half - 1;
        run(P, a + (y >= B - 3 ? 1 : 0), b - (y >= B - 3 ? 1 : 0), y, st, 1, 1);
      }
      if (front) { // a sailor's collar and a red kerchief
        for (let y = T; y <= T + 2; y++) { P.rect(CX - 5 + (y - T), y, 2, 1, st[1]); P.rect(CX + 3 - (y - T), y, 2, 1, st[0]); }
        P.rect(CX - 1, T + 3, 2, 2, '#c63a3a'); P.px(CX - 2, T + 5, '#a82e30'); P.px(CX + 1, T + 5, '#a82e30');
      } else if (back) { for (let y = T; y <= T + 4; y++) run(P, CX - 5, CX + 4, y, st, 1, 1); P.rect(CX - 5, T + 4, 10, 1, '#f2efe6'); }
    }
    if (kind === 'tunic') {
      const tr = R(trim || '#d8b450');
      if (front) { for (let i = 0; i < 4; i++) { P.px(CX - 2 - i + 1, T + i, tr[2]); P.px(CX + 1 + i - 1, T + i, tr[1]); } P.rect(CX - 1, T, 2, 3, sk(s)[1]); }
      const belt = R('#5c3a22');
      const ba = side ? CX - half + 2 : CX - half + 1, bb = side ? CX + half - 3 : CX + half - 2;
      run(P, ba, bb, B - 3, belt, 1, 1);
      if (!back) { P.rect(side ? CX - half + 2 : CX - 1, B - 3, 2, 1, '#f0cc60'); }
      // a leafy hem over the hips
      for (let y = B + 1; y <= B + 3; y++) run(P, ba - (y - B > 1 ? 1 : 0), bb + (y - B > 1 ? 1 : 0), y, r, 2, 2);
      for (let x = ba - 1; x <= bb + 1; x++) if ((x + 1) % 3) P.px(x, B + 3, tr[2]); else P.px(x, B + 4, r[1]);
    }
    if (kind === 'coat') {
      const tr = trim, inner = c2;
      const ta = side ? CX - half + 2 : CX - half, tb = side ? CX + half - 3 : CX + half - 1;
      // tails over the legs
      for (let y = B + 1; y <= B + 7; y++) {
        if (front) { run(P, ta + 1, CX - 1, y, r, 2, 0); run(P, CX, tb - 1, y, r, 0, 2); P.px(CX - 1, y, tr); P.px(CX, y, tr); }
        else run(P, ta + 1, tb - 1, y, r, 2, 2);
      }
      P.rect(ta + 1, B + 7, tb - ta - 1, 1, tr);
      if (back) for (let y = B - 2; y <= B + 7; y++) P.px(CX - 1, y, r[1]);
      if (front) {
        for (let y = T; y <= B; y++) { P.rect(CX - 1, y, 2, 1, inner[2]); P.px(CX - 2, y, tr); P.px(CX + 1, y, tr); }
        for (let i = 0; i < 4; i++) { P.px(CX - 3 - i, T + i, r[3]); P.px(CX + 2 + i, T + i, r[1]); }
        P.px(CX - 3, T + 6, tr); P.px(CX + 2, T + 6, tr); P.px(CX - 3, T + 9, tr); P.px(CX + 2, T + 9, tr);
      }
      if (side) { for (let y = T; y <= B + 7; y++) P.px(CX - half + 2, y, tr); }
      if (t.sash) { const sa = R(t.sash); run(P, ta + 1, tb - 1, B - 3, sa, 1, 1); run(P, ta + 1, tb - 1, B - 2, sa, 1, 1); if (front) P.rect(CX + 3, B - 1, 2, 4, sa[1]); }
    }
    if (kind === 'puffer' || kind === 'parka') {
      const a = side ? CX - half + 2 : CX - half, b = side ? CX + half - 3 : CX + half - 1;
      for (let y = T + 2; y <= B; y += 3) { P.rect(a + 1, y, b - a - 1, 1, r[1]); P.rect(a + 1, y - 1, 3, 1, r[3]); }
      if (front) for (let y = T; y <= B; y++) P.px(CX - 1, y, (y % 2) ? '#d8dce4' : r[1]);
      if (kind === 'parka') {
        for (let y = B + 1; y <= B + 4; y++) run(P, a, b, y, r, 2, 2);
        const fur = R('#e8e0d4');
        for (let x = a; x <= b; x++) P.px(x, B + 4 + (x % 2), fur[2 + (x % 2)]);
        if (front) { P.rect(CX - 6, B - 2, 4, 1, r[0]); P.rect(CX + 2, B - 2, 4, 1, r[0]); }
      } else if (!back) { P.rect(side ? CX - 4 : CX - 4, T - 1, 8, 2, r[2]); P.rect(side ? CX - 4 : CX - 4, T - 1, 3, 1, r[3]); }
    }
    if (kind === 'jacket') {
      const tr = trim;
      if (front) {
        for (let y = T + 1; y <= B; y++) run(P, CX - 2, CX + 1, y, c2, 1, 1);
        for (let y = T + 1; y <= B; y++) { P.px(CX - 3, y, tr); P.px(CX + 2, y, LB.mix(tr, '#000', 0.25)); }
        P.rect(CX - 6, T - 1, 3, 2, r[3]); P.rect(CX + 3, T - 1, 3, 2, r[1]);
        P.px(CX - 1, T + 4, '#f2f0f8'); P.px(CX, T + 5, '#f2f0f8'); // a print on the tee
      } else if (back) {
        P.rect(CX - 3, T + 4, 6, 1, tr); P.rect(CX - 2, T + 5, 4, 1, tr); P.px(CX - 1, T + 6, tr); P.px(CX, T + 6, tr);
      } else { for (let y = T + 1; y <= B; y++) P.px(CX - half + 2, y, tr); P.rect(CX - half + 2, T - 1, 3, 2, r[3]); }
      P.rect(side ? CX - half + 2 : CX - half + 1, B, side ? half * 2 - 4 : half * 2 - 2, 1, tr);
    }
    if (kind === 'hoodie') {
      const tr = trim;
      if (front) {
        P.rect(CX - 5, T - 1, 10, 2, r[1]); P.rect(CX - 3, T - 1, 6, 1, r[0]); P.rect(CX - 5, T - 1, 2, 1, r[3]);
        P.rect(CX - 2, T + 1, 1, 4, '#ecebf2'); P.rect(CX + 1, T + 1, 1, 3, '#ecebf2');
        for (let y = B - 4; y <= B - 1; y++) run(P, CX - 4, CX + 3, y, r, 0, 1);
        P.rect(CX - 4, B - 4, 8, 1, r[1]);
        P.rect(CX - half, T + 2, 1, B - T - 2, tr); P.rect(CX + half - 1, T + 2, 1, B - T - 2, LB.mix(tr, '#000', 0.2));
      } else if (back) {
        for (let y = T; y <= T + 5; y++) run(P, CX - 4 + (y > T + 3 ? 1 : 0), CX + 3 - (y > T + 3 ? 1 : 0), y, r, 1, 1);
        P.rect(CX - 3, T + 1, 6, 3, r[0]); P.rect(CX - 3, T + 1, 6, 1, r[1]);
        P.rect(CX - 4, T + 7, 8, 1, tr);
      } else { P.rect(CX + 1, T - 1, 4, 4, r[1]); P.rect(CX - half + 2, T + 3, 1, B - T - 3, tr); }
      for (let x = CX - half + 1; x < CX + half - 1; x++) if (x % 2) P.px(x, B, r[1]);
    }
    if (kind === 'suit') {
      const pnl = c2, tr = R(trim || '#f2e2bc');
      if (front) {
        for (let y = T + 2; y <= T + 7; y++) run(P, CX - 4, CX + 3, y, pnl, 1, 1);
        P.px(CX - 3, T + 3, '#5af0c0'); P.px(CX - 1, T + 3, '#ffd25a'); P.px(CX + 1, T + 3, '#ff6a5a');
        P.rect(CX - 3, T + 5, 6, 1, pnl[3]);
        P.rect(CX - half + 1, T + 1, 3, 1, tr[2]); P.rect(CX + half - 4, T + 1, 3, 1, tr[1]);
      }
      if (side) { for (let y = T + 2; y <= T + 7; y++) P.rect(CX - half + 2, y, 3, 1, pnl[2]); P.px(CX - half + 3, T + 3, '#5af0c0'); }
      const ba = side ? CX - half + 2 : CX - half + 1, bb = side ? CX + half - 3 : CX + half - 2;
      run(P, ba, bb, B - 2, pnl, 1, 1); run(P, ba, bb, B - 1, pnl, 1, 1);
      if (!back) P.rect(side ? ba : CX - 1, B - 2, 2, 2, tr[2]);
      // knee and elbow pads come from the legs/arms; seam lines
      if (front || back) for (let y = T + 8; y < B - 2; y++) P.px(CX - half + 3, y, r[1]);
    }
    if (kind === 'armor') {
      const tab = c2;
      if (front || back) {
        for (let y = T + 1; y <= T + 7; y++) { P.rect(CX - half + 2, y, 3, 1, r[3]); }
        P.px(CX - half + 3, T + 2, r[4]); P.px(CX - half + 2, T + 3, r[4]);
        for (let y = T + 2; y <= B + 4; y++) {
          const a = CX - 3, b = CX + 2;
          run(P, a, b, y, tab, 1, 1);
        }
        P.rect(CX - 3, B + 4, 6, 1, tab[0]);
        if (front) { P.rect(CX - 1, T + 5, 2, 3, '#e8c45a'); P.rect(CX - 2, T + 6, 4, 1, '#e8c45a'); P.px(CX - 1, T + 5, '#fff0b0'); }
        P.rect(CX - half + 1, B - 2, half * 2 - 2, 1, '#5c3a22'); P.rect(CX - half + 1, B - 2, 1, 1, '#7a5030');
      } else { for (let y = T + 2; y <= B + 4; y++) P.rect(CX - half + 2, y, 3, 1, tab[2]); P.rect(CX - half + 2, B - 2, half * 2 - 4, 1, '#5c3a22'); }
      // pauldrons
      const pr = r;
      if (!side) for (const sd of [-1, 1]) {
        const xa = sd < 0 ? CX - half - 3 : CX + half - 2;
        for (let y = T - 1; y <= T + 3; y++) { const w = y === T - 1 ? 4 : 5; run(P, xa + (sd < 0 && y === T - 1 ? 1 : 0), xa + w - 1 + (sd < 0 && y === T - 1 ? 1 : 0), y, pr, 1, 2); }
        P.px(xa + 2, T + 1, pr[4]);
      } else { for (let y = T - 1; y <= T + 3; y++) run(P, CX - 3, CX + 3, y, pr, 2, 1); P.px(CX - 1, T, pr[4]); }
    }
    if (kind === 'tee') {
      if (front) { P.rect(CX - 1, T + 4, 2, 2, t.print || '#f4f0e0'); P.px(CX - 2, T + 4, t.print || '#f4f0e0'); P.px(CX + 1, T + 4, t.print || '#f4f0e0'); }
    }
    if (kind === 'cardigan') {
      const bl = c2;
      if (front) {
        for (let y = T + 1; y <= B; y++) run(P, CX - 2, CX + 1, y, bl, 1, 1);
        for (let y = T + 3; y <= B; y += 3) P.px(CX - 3, y, '#e8d8a0');
        P.rect(CX - 6, B - 4, 3, 3, r[1]); P.rect(CX + 3, B - 4, 3, 3, r[1]); P.rect(CX - 6, B - 4, 3, 1, r[3]);
      }
      for (let x = CX - half + 1; x < CX + half - 1; x++) if (x % 2) P.px(x, B, r[1]);
    }
    if (s.pack && back) {
      const pk = R(s.pack);
      for (let y = T + 1; y <= T + 11; y++) run(P, CX - 6, CX + 5, y, pk, 2, 2);
      P.rect(CX - 6, T + 1, 12, 3, pk[3]); P.rect(CX - 6, T + 4, 12, 1, pk[0]); P.rect(CX - 2, T + 5, 4, 2, pk[1]);
      if (s.bedroll) { const br = R(s.bedroll); for (let y = T - 2; y <= T; y++) run(P, CX - 7, CX + 6, y, br, 2, 2); P.px(CX - 4, T - 1, br[0]); P.px(CX + 3, T - 1, br[0]); }
      if (s.top.k === 'suit') { P.rect(CX - 3, T + 7, 2, 2, '#5af0c0'); P.rect(CX + 1, T + 7, 2, 2, '#ffd25a'); }
    }
    if (s.pack && front) { const pk = R(s.pack); P.rect(CX - half + 1, T, 2, 7, pk[1]); P.rect(CX + half - 3, T, 2, 7, pk[0]); P.px(CX - half + 1, T, pk[3]); }
    if (s.satchel && front) { const sa = R(s.satchel); P.line(CX - half + 1, T, CX + half - 2, B - 1, sa[1]); }
  }
  function armFront(P, g, s, sd, swing, back) {
    const half = g.half, sl = sleeveR(s), k = sk(s);
    const xa = sd < 0 ? CX - half - 3 : CX + half, xb = xa + 2;
    const top = g.tTop + 1, handY = g.tBot - 1 + swing;
    const shortS = s.top.short ? top + 3 : handY;
    // shoulder cap
    P.rect(sd < 0 ? xa + 1 : xa, g.tTop, 2, 1, sd < 0 ? sl[3] : sl[2]);
    for (let y = top; y < handY; y++) {
      const r = y < shortS ? sl : k;
      P.rect(xa, y, 3, 1, r[2]);
      P.px(xa, y, sd < 0 ? r[3] : r[2]);
      P.px(xb, y, r[1]);
    }
    // the crease where arm meets body
    for (let y = top + 1; y < Math.min(handY, shortS); y++) P.px(sd < 0 ? xb : xa, y, sl[1]);
    if (shortS < handY) P.rect(xa, shortS - 1, 3, 1, sl[1]);
    else P.rect(xa, handY - 1, 3, 1, sd < 0 ? sl[2] : sl[1]); // cuff
    if (s.top.k === 'hoodie' && s.top.trim) P.rect(sd < 0 ? xa : xb, top + 1, 1, handY - top - 2, s.top.trim);
    if (s.top.k === 'suit') { P.rect(xa, top + 5, 3, 1, R(s.top.c2)[2]); }
    const hc = s.gloves ? R(s.gloves) : k;
    P.rect(xa, handY, 3, 2, hc[2]); P.px(xa, handY, hc[3]); P.px(xb, handY + 1, hc[1]);
    P.rect(xa + (sd < 0 ? 1 : 0), handY + 2, 2, 1, hc[1]);
    if (back) P.px(sd < 0 ? xa : xb, handY + 1, hc[1]);
  }
  function armSide(P, g, s, swing, far) {
    const sl = sleeveR(s), k = sk(s), hc = s.gloves ? R(s.gloves) : k;
    const sx = CX - 1 + (far ? 2 : 0), top = g.tTop + 1;
    const hx = sx + swing * 4, hy = g.tBot - 1 - Math.abs(swing);
    const shortS = s.top.short ? top + 3 : hy;
    const n = Math.max(1, hy - top);
    for (let y = top; y < hy; y++) {
      const x = Math.round(sx + ((hx - sx) * (y - top)) / n);
      const r = y < shortS ? sl : k;
      if (far) { P.rect(x - 1, y, 3, 1, r[1]); P.px(x + 1, y, r[0]); }
      else { P.rect(x - 1, y, 3, 1, r[2]); P.px(x - 1, y, r[3]); P.px(x + 1, y, r[1]); P.px(x + 2, y, r[0]); }
    }
    if (!far && s.top.k === 'hoodie' && s.top.trim) for (let y = top + 2; y < hy - 1; y++) P.px(Math.round(sx + ((hx - sx) * (y - top)) / n) + 1, y, s.top.trim);
    P.rect(hx - 1, hy, 3, 2, far ? hc[1] : hc[2]); P.px(hx - 1, hy, far ? hc[1] : hc[3]); P.rect(hx - 1, hy + 2, 2, 1, hc[1]);
    if (!far) P.rect(Math.round(sx + ((hx - sx) * (hy - 1 - top)) / n) - 1, hy - 1, 3, 1, sl[1]);
  }
  function shoeFront(P, s, xa, y, sd) {
    const f = s.feet, r = R(f.c);
    if (f.k === 'boots' || f.k === 'skiboots') { P.rect(xa + 1, y - 1, 4, 1, r[3]); if (f.k === 'skiboots') { P.rect(xa + 1, y - 2, 4, 1, r[2]); P.px(xa + 2, y - 1, '#5a6070'); } }
    P.rect(xa + 1, y, 3, 1, r[2]); P.px(xa + 1, y, r[3]);
    P.rect(xa, y + 1, 5, 1, r[2]); P.px(sd < 0 ? xa : xa + 4, y + 1, r[3]);
    P.rect(xa, y + 2, 5, 1, f.k === 'sneakers' ? '#f4f2ee' : r[0]);
    if (f.k === 'sneakers') P.px(sd < 0 ? xa : xa + 4, y + 1, '#f4f2ee');
  }
  function shoeSide(P, s, fx, y, far) {
    const f = s.feet, r = R(f.c);
    const base = far ? r[1] : r[2];
    if (f.k === 'boots' || f.k === 'skiboots') P.rect(fx - 2, y - 1, 4, 1, far ? r[1] : r[3]);
    P.rect(fx - 2, y, 4, 1, base); P.px(fx - 2, y, far ? r[1] : r[3]);
    P.rect(fx - 3, y + 1, 5, 1, base); P.px(fx - 3, y + 1, far ? r[1] : r[3]);
    P.rect(fx - 3, y + 2, 5, 1, f.k === 'sneakers' ? '#f4f2ee' : r[0]);
  }
  function legColour(s, y, top) {
    const L = s.legs;
    if (L.k === 'shorts' && y > top + 3) return sk(s);
    if (L.k === 'skirt' && y > top + 5) return R(L.stock || '#e8e0d0');
    return R(L.c);
  }
  function legsFront(P, g, s, lift) {
    const top = g.tBot + 1, L = s.legs;
    const pr = R(L.c);
    run(P, CX - 6, CX + 5, top, pr, 2, 2); run(P, CX - 6, CX + 5, top + 1, pr, 2, 2);
    for (const [i, xa] of [[0, CX - 5], [1, CX + 1]]) {
      const lb = G - 3 - lift[i];
      for (let y = top + 2; y <= lb; y++) {
        const r = legColour(s, y, top);
        P.rect(xa, y, 4, 1, r[2]); P.px(xa, y, i === 0 ? r[3] : r[2]); P.px(xa + 3, y, r[1]);
        if (i === 1) P.px(xa + 2, y, r[1]);
      }
      if (s.top.k === 'suit') P.rect(xa, lb - 3, 4, 2, R(s.top.c2)[i === 0 ? 2 : 1]); // knee pads
      shoeFront(P, s, i === 0 ? CX - 6 : CX + 1, G - 2 - lift[i], i === 0 ? -1 : 1);
    }
    if (L.k === 'skirt') skirt(P, g, s, 'front');
    if (s.top.k === 'apron') { const w = R(s.top.c2); for (let y = top; y <= top + 6; y++) run(P, CX - 5 - (y > top + 3 ? 1 : 0), CX + 4 + (y > top + 3 ? 1 : 0), y, w, 1, 2); P.rect(CX - 6, top + 6, 12, 1, w[1]); }
  }
  function skirt(P, g, s, view) {
    const r = R(s.legs.c), top = g.tBot;
    const W = [12, 13, 14, 15, 16, 16, 17];
    for (let i = 0; i < W.length; i++) {
      const w = view === 'side' ? Math.min(12, 10 + (i >> 1)) : W[i], y = top + i;
      const a = view === 'side' ? CX - 6 - (i >> 2) : CX - Math.ceil(w / 2), b = a + w - 1;
      run(P, a, b, y, r, 2, 2);
      if (i > 2) for (let x = a + 3; x < b - 1; x += 4) P.px(x, y, r[1]); // folds
    }
    const y = top + W.length - 1;
    P.rect(view === 'side' ? CX - 7 : CX - 8, y, view === 'side' ? 13 : 17, 1, r[0]);
  }
  function legsSide(P, g, s, ph, lift) {
    const top = g.tBot + 1, pr = R(s.legs.c);
    // near/far foot offsets through the stride (negative = forward, to the left)
    let near = -1, far = 1, nl = 0, fl = 0;
    if (ph === 0) { near = -4; far = 3; }
    else if (ph === 1) { near = 0; far = 0; fl = 2; }
    else if (ph === 2) { near = 3; far = -4; }
    else if (ph === 3) { near = 0; far = 0; nl = 2; }
    const leg = (fx, l, isFar) => {
      const y1 = G - 3 - l;
      const n = Math.max(1, y1 - top - 1);
      for (let y = top + 1; y <= y1; y++) {
        const x = Math.round(CX - 1 + ((fx - (CX - 1)) * (y - top - 1)) / n);
        const r = legColour(s, y, top);
        if (isFar) { P.rect(x - 2, y, 4, 1, r[1]); P.px(x + 1, y, r[0]); }
        else { P.rect(x - 2, y, 4, 1, r[2]); P.px(x - 2, y, r[3]); P.px(x + 1, y, r[1]); }
      }
      if (s.top.k === 'suit') { const yk = y1 - 4, x = Math.round(CX - 1 + ((fx - (CX - 1)) * (yk - top - 1)) / n); P.rect(x - 2, yk, 3, 2, R(s.top.c2)[isFar ? 1 : 2]); }
      shoeSide(P, s, fx, G - 2 - l, isFar);
    };
    leg(CX - 1 + far, fl, true);
    leg(CX - 1 + near, nl, false);
    // hips
    for (let y = top; y <= top + 1; y++) run(P, CX - 5, CX + 3, y, pr, 2, 1);
    if (s.legs.k === 'skirt') skirt(P, g, s, 'side');
    if (s.top.k === 'apron') { const w = R(s.top.c2); for (let y = top; y <= top + 6; y++) P.rect(CX - 7, y, 3, 1, w[2]); }
  }
  function legsSit(P, g, s, view) {
    // seated, facing out: thighs come toward us, shins hang down to the ground
    const top = g.tBot + 1, pr = R(s.legs.c);
    if (view === 'back') { run(P, CX - 6, CX + 5, top, pr, 2, 2); return; }
    if (view === 'side') {
      for (let y = top; y <= top + 3; y++) run(P, CX - 9, CX + 3, y, legColour(s, y, top - 2), 2, 1);
      const r = legColour(s, top + 6, top);
      for (let y = top + 4; y <= G - 3; y++) { P.rect(CX - 9, y, 4, 1, r[2]); P.px(CX - 9, y, r[3]); P.px(CX - 6, y, r[1]); }
      shoeSide(P, s, CX - 7, G - 2, false);
      if (s.legs.k === 'skirt') { const sr = R(s.legs.c); for (let y = top - 1; y <= top + 4; y++) run(P, CX - 10, CX + 3, y, sr, 2, 2); }
      return;
    }
    for (const [i, xa] of [[0, CX - 6], [1, CX]]) {
      for (let y = top; y <= top + 3; y++) { const r = legColour(s, top, top); P.rect(xa, y, 6, 1, r[2]); if (y === top) P.rect(xa, y, 6, 1, r[3]); P.px(xa + 5, y, r[1]); }
      for (let y = top + 4; y <= G - 3; y++) { const r = legColour(s, y + 4, top); P.rect(xa + 1, y, 4, 1, r[2]); P.px(xa + 1, y, i === 0 ? r[3] : r[2]); P.px(xa + 4, y, r[1]); }
      shoeFront(P, s, i === 0 ? CX - 6 : CX + 1, G - 2, i === 0 ? -1 : 1);
    }
    P.rect(CX - 1, top + 1, 2, 3, pr[0]);
    if (s.legs.k === 'skirt') { const sr = R(s.legs.c); for (let y = top - 1; y <= top + 4; y++) run(P, CX - 8, CX + 7, y, sr, 2, 2); P.rect(CX - 8, top + 4, 16, 1, sr[0]); }
    if (s.top.k === 'apron') { const w = R(s.top.c2); for (let y = top; y <= top + 4; y++) run(P, CX - 5, CX + 4, y, w, 1, 2); }
  }
  function neck(P, g, s) { const k = sk(s); P.rect(CX - 2, g.tTop - 1, 4, 1, k[1]); P.px(CX - 2, g.tTop - 1, k[2]); }

  // ---------- things people carry ----------
  function item(P, g, s, view, hands, layer) {
    const it = s.item;
    if (!it) return;
    const [lh, rh] = hands; // [x, y] of each hand (screen left, right)
    if (it === 'rod') {
      if (layer !== (view === 'back' ? 'behind' : 'front')) return;
      const h = view === 'side' ? lh : rh;
      const tip = view === 'side' ? [h[0] - 16, g.hTop - 14] : view === 'back' ? [h[0] - 12, g.hTop - 16] : [h[0] + 10, g.hTop - 16];
      P.line(h[0], h[1] + 1, tip[0], tip[1], '#6a4428');
      P.line(h[0], h[1] + 1, h[0] + Math.sign(tip[0] - h[0]) * 2, h[1] - 2, '#d0a870');
      P.rect(h[0] + (tip[0] > h[0] ? 1 : -2), h[1] - 1, 2, 2, '#9aa0aa');
      // the line and a red bobber
      for (let i = 1; i <= 7; i++) P.px(tip[0] + (tip[0] > h[0] ? 1 : -1), tip[1] + i, i % 2 ? '#e8ecf0' : '#c8d0d8');
      P.rect(tip[0] + (tip[0] > h[0] ? 0 : -2), tip[1] + 8, 2, 2, '#e04a3a'); P.px(tip[0] + (tip[0] > h[0] ? 0 : -2), tip[1] + 8, '#ffffff');
    } else if (it === 'skis') {
      if (layer !== (view === 'front' ? 'front' : 'behind')) return;
      const r = R('#d8443a'), w = R('#f0eee8');
      const x0 = view === 'side' ? CX + 5 : view === 'back' ? CX - 11 : CX + 10;
      for (let y = g.hTop - 10; y <= G - 6; y++) {
        P.rect(x0, y, 2, 1, r[2]); P.px(x0, y, r[3]);
        P.rect(x0 + 2, y, 2, 1, w[2]); P.px(x0 + 3, y, w[1]);
        if ((y - g.hTop) % 9 === 0) { P.px(x0, y, '#2a2a34'); P.px(x0 + 2, y, '#2a2a34'); }
      }
      P.rect(x0 + 1, g.hTop - 11, 3, 1, r[2]); P.px(x0 + 2, g.hTop - 12, w[2]);
      P.rect(x0 - 1, g.tTop + 4, 6, 1, '#3a3a46');
    } else if (it === 'lute') {
      const want = view === 'back' ? 'over' : 'front';
      if (layer !== want) return;
      const wd = R('#c08040'), dk = R('#6a3a1c');
      const bx = view === 'side' ? CX - 5 : view === 'back' ? CX + 1 : CX + 2, by = g.tTop + (view === 'back' ? 6 : 8);
      const nx = view === 'side' ? CX - 12 : view === 'back' ? CX + 7 : CX - 8, ny = g.tTop - (view === 'back' ? 6 : 2);
      P.line(bx, by, nx, ny, dk[1]); P.line(bx, by - 1, nx, ny - 1, dk[2]);
      P.rect(nx - 1, ny - 2, 2, 3, dk[0]); P.px(nx - 2, ny - 1, '#e8d8a0'); P.px(nx + 1, ny - 2, '#e8d8a0');
      P.ellipse(bx, by, 4, 5, wd[2]); P.ellipse(bx + 1, by + 1, 3, 4, wd[1]); P.ellipse(bx, by, 3, 4, wd[2]);
      P.px(bx - 2, by - 3, wd[4]); P.px(bx - 3, by - 2, wd[3]);
      if (view !== 'back') { P.disc(bx, by - 1, 1, dk[0]); P.line(bx, by + 3, nx, ny, '#efe2c0'); }
    } else if (it === 'basket') {
      if (layer !== 'front') return;
      const h = view === 'front' ? lh : view === 'back' ? rh : lh;
      const r = R('#c8945a'), x = h[0] - 3, y = h[1] + 1;
      P.rect(x, y, 8, 5, r[2]); P.rect(x, y, 8, 1, r[3]); P.rect(x + 7, y, 1, 5, r[1]); P.rect(x, y + 4, 8, 1, r[1]);
      for (let i = 0; i < 8; i += 2) P.px(x + i, y + 2, r[1]);
      P.px(x, y - 1, r[2]); P.px(x + 7, y - 1, r[1]); P.rect(x + 1, y - 3, 6, 1, r[2]); P.px(x, y - 2, r[2]); P.px(x + 7, y - 2, r[1]);
      if (s.basket === 'bread') { P.rect(x + 1, y - 1, 3, 2, '#d89a48'); P.px(x + 1, y - 1, '#f0c47a'); P.rect(x + 4, y - 1, 3, 2, '#c8843a'); }
      else { P.rect(x + 1, y - 1, 2, 2, '#e04a46'); P.px(x + 1, y - 1, '#ff9a8a'); P.rect(x + 4, y - 1, 2, 2, '#f0c040'); P.px(x + 6, y - 1, '#7ac04a'); }
    } else if (it === 'cane') {
      if (layer !== 'front') return;
      const h = view === 'side' ? [lh[0] - 1, lh[1]] : rh;
      const r = R('#7a4a2a');
      P.rect(h[0] + 1, h[1] - 1, 1, G - h[1] + 1, r[2]); P.rect(h[0] + 2, h[1] - 1, 1, G - h[1] + 1, r[1]);
      P.rect(h[0] - 1, h[1] - 2, 4, 1, r[3]); P.px(h[0] - 1, h[1] - 1, r[2]);
    } else if (it === 'spear') {
      if (layer !== (view === 'front' ? 'front' : 'behind')) return;
      const h = view === 'side' ? [CX + 3, 0] : view === 'back' ? lh : rh;
      const x = h[0] + 1, r = R('#7a5232'), st = R('#c8d0dc');
      for (let y = g.hTop - 16; y <= G; y++) { P.px(x, y, r[2]); P.px(x + 1, y, r[1]); }
      P.rect(x, g.hTop - 22, 2, 6, st[2]); P.px(x, g.hTop - 22, st[4]); P.rect(x - 1, g.hTop - 19, 4, 2, st[1]); P.px(x, g.hTop - 23, st[3]);
      P.rect(x - 1, g.hTop - 15, 4, 2, '#c63a3a'); P.px(x - 1, g.hTop - 13, '#a82e30'); P.px(x + 2, g.hTop - 13, '#a82e30');
    } else if (it === 'iceaxe') {
      if (layer !== 'front') return;
      const h = view === 'side' ? lh : rh;
      const r = R('#5a5a66'), st = R('#c8d0dc');
      P.rect(h[0] + 1, h[1] - 2, 1, 10, r[2]); P.px(h[0] + 2, h[1] + 7, st[2]);
      P.rect(h[0] - 1, h[1] - 3, 5, 1, st[2]); P.px(h[0] - 1, h[1] - 2, st[1]); P.px(h[0] - 1, h[1] - 3, st[4]);
    } else if (it === 'umbrella') {
      if (layer !== 'over') return;
      const r = R(s.umbrellaC || '#3c6ab0');
      const h = view === 'side' ? lh : rh, x = h[0] + 1;
      for (let y = g.hTop - 6; y <= h[1]; y++) P.px(x, y, '#3a3440');
      const cy = g.hTop - 7;
      for (let y = 0; y < 6; y++) { const w = [8, 14, 18, 20, 22, 22][y]; run(P, CX - w / 2, CX + w / 2 - 1, cy + y, r, 3, 3); }
      for (let x2 = CX - 11; x2 < CX + 11; x2 += 4) { P.px(x2 + 2, cy + 6, r[1]); P.px(x2, cy + 5, r[0]); }
      for (const dx of [-6, 0, 6]) P.line(CX + dx / 3, cy, CX + dx, cy + 5, r[1]);
      P.px(CX - 1, cy - 1, '#3a3440');
    }
  }

  // ---------- assembling a frame ----------
  function drawFront(P, g, s, pose) {
    const ph = pose.walk == null ? -1 : pose.walk;
    const lift = ph === 0 ? [0, 2] : ph === 2 ? [2, 0] : [0, 0];
    const swing = g.sit ? [0, 0] : ph === 0 ? [1, -1] : ph === 2 ? [-1, 1] : [0, 0];
    const half = g.half;
    const hands = [[CX - half - 2, g.tBot - 1 + swing[0]], [CX + half + 1, g.tBot - 1 + swing[1]]];
    if (s.cape) { const c = R(s.cape); for (let y = g.tTop; y <= g.tBot + 6; y++) { P.rect(CX - half - 2, y, 2, 1, c[1]); P.rect(CX + half, y, 2, 1, c[0]); } }
    item(P, g, s, 'front', hands, 'behind');
    if (g.sit) legsSit(P, g, s, 'front'); else legsFront(P, g, s, lift);
    torso(P, g, s, 'front');
    armFront(P, g, s, -1, swing[0]);
    armFront(P, g, s, 1, swing[1]);
    neck(P, g, s);
    headFront(P, g, s);
    faceFront(P, g, s, pose);
    hairFront(P, g, s);
    if (s.beard) beard(P, g, s, 'front');
    hat(P, g, s, 'front');
    if (s.visor) { const v = R(s.visor); P.rect(CX - 7, g.ey, 14, 2, v[2]); P.rect(CX - 7, g.ey, 4, 1, v[4]); P.rect(CX + 4, g.ey + 1, 3, 1, v[1]); }
    if (s.top.k === 'suit' || s.hat === 'dome') {} // the dome comes after the outline
    item(P, g, s, 'front', hands, 'front');
    item(P, g, s, 'front', hands, 'over');
  }
  function drawBack(P, g, s, pose) {
    const ph = pose.walk == null ? -1 : pose.walk;
    const lift = ph === 0 ? [0, 2] : ph === 2 ? [2, 0] : [0, 0];
    const swing = g.sit ? [0, 0] : ph === 0 ? [-1, 1] : ph === 2 ? [1, -1] : [0, 0];
    const half = g.half;
    const hands = [[CX - half - 2, g.tBot - 1 + swing[0]], [CX + half + 1, g.tBot - 1 + swing[1]]];
    item(P, g, s, 'back', hands, 'behind');
    if (g.sit) legsSit(P, g, s, 'back'); else legsFront(P, g, s, lift);
    torso(P, g, s, 'back');
    armFront(P, g, s, -1, swing[0], true);
    armFront(P, g, s, 1, swing[1], true);
    neck(P, g, s);
    headFront(P, g, s, true);
    hairBack(P, g, s, ph);
    if (s.beard) beard(P, g, s, 'back');
    hat(P, g, s, 'back');
    if (s.visor) { const v = R(s.visor); P.rect(CX - 7, g.ey, 14, 1, v[1]); }
    if (s.cape) { const c = R(s.cape); for (let y = g.tTop; y <= g.tBot + 6; y++) { const w = half * 2 + (y > g.tBot ? 2 : 0); run(P, CX - w / 2, CX + w / 2 - 1, y, c, 2, 2); if ((y + 1) % 4 === 0) for (let x = CX - 4; x <= CX + 3; x += 4) P.px(x, y, c[1]); } P.rect(CX - half - 1, g.tBot + 6, half * 2 + 2, 1, c[0]); }
    item(P, g, s, 'back', hands, 'front');
    item(P, g, s, 'back', hands, 'over');
  }
  function drawSide(P, g, s, pose) {
    const ph = pose.walk == null ? -1 : pose.walk;
    const sw = g.sit ? 0 : ph === 0 ? 1 : ph === 2 ? -1 : 0; // near arm: back when the near leg is forward
    const top = g.tTop + 1;
    const nearHand = [CX - 1 + sw * 4, g.tBot - 1 - Math.abs(sw)];
    if (g.sit) { nearHand[0] = CX - 7; nearHand[1] = g.tBot; }
    const hands = [nearHand, nearHand];
    if (s.cape) { const c = R(s.cape); for (let y = g.tTop; y <= g.tBot + 7; y++) { const x0 = CX + 2, w = 3 + Math.floor((y - g.tTop) / 4) + (ph >= 0 ? 1 : 0); P.rect(x0, y, w, 1, c[1]); P.px(x0 + w - 1, y, c[0]); } }
    item(P, g, s, 'side', hands, 'behind');
    armSide(P, g, s, -sw, true);
    if (g.sit) legsSit(P, g, s, 'side'); else legsSide(P, g, s, ph);
    torso(P, g, s, 'side');
    if (s.pack) { const pk = R(s.pack); for (let y = g.tTop + 1; y <= g.tTop + 11; y++) run(P, CX + g.half - 3, CX + g.half + 1, y, pk, 1, 2); P.rect(CX + g.half - 3, g.tTop + 1, 5, 2, pk[3]); if (s.bedroll) { const br = R(s.bedroll); P.rect(CX + g.half - 4, g.tTop - 2, 7, 3, br[2]); P.px(CX + g.half - 4, g.tTop - 2, br[3]); } }
    if (s.satchel) { const sa = R(s.satchel); for (let y = g.tBot - 4; y <= g.tBot; y++) run(P, CX - 1, CX + 4, y, sa, 1, 1); P.rect(CX - 1, g.tBot - 4, 6, 1, sa[3]); }
    if (g.sit) { // the near arm rests on the knee
      const sl = sleeveR(s), hc = s.gloves ? R(s.gloves) : sk(s);
      limb(P, CX - 1, top, CX - 5, g.tBot - 1, 3, sl);
      P.rect(CX - 8, g.tBot, 3, 2, hc[2]); P.px(CX - 8, g.tBot, hc[3]);
    } else armSide(P, g, s, sw, false);
    neck(P, g, s);
    headSide(P, g, s);
    faceSide(P, g, s, pose);
    hairSide(P, g, s, ph);
    if (s.beard) beard(P, g, s, 'side');
    hat(P, g, s, 'side');
    if (s.visor) { const v = R(s.visor); P.rect(CX - 7, g.ey, 9, 2, v[2]); P.rect(CX - 7, g.ey, 3, 1, v[4]); }
    item(P, g, s, 'side', hands, 'front');
    item(P, g, s, 'side', hands, 'over');
  }
  const OUT = LB.rgb('#24182c');
  function outline(src) {
    const w = src.width, h = src.height, sc = LB.ctx2d(src), sd = sc.getImageData(0, 0, w, h).data;
    const out = LB.canvas(w, h), oc = LB.ctx2d(out);
    oc.drawImage(src, 0, 0);
    const od = oc.getImageData(0, 0, w, h), d = od.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (sd[i + 3] >= 128) continue;
      let ni = -1;
      if (y < h - 1 && sd[i + w * 4 + 3] >= 128) ni = i + w * 4;
      else if (x > 0 && sd[i - 4 + 3] >= 128) ni = i - 4;
      else if (x < w - 1 && sd[i + 4 + 3] >= 128) ni = i + 4;
      else if (y > 0 && sd[i - w * 4 + 3] >= 128) ni = i - w * 4;
      if (ni < 0) continue;
      for (let c = 0; c < 3; c++) d[i + c] = sd[ni + c] * 0.36 + OUT[c] * 0.5;
      d[i + 3] = 255;
    }
    oc.putImageData(od, 0, 0);
    return out;
  }
  function build(s, dir, pose) {
    let cv = LB.canvas(FW, FH);
    const P = LB.paint(LB.ctx2d(cv));
    const g = geom(s, pose);
    const view = dir === 'up' ? 'back' : dir === 'down' ? 'front' : 'side';
    if (view === 'front') drawFront(P, g, s, pose);
    else if (view === 'back') drawBack(P, g, s, pose);
    else drawSide(P, g, s, pose);
    cv = outline(cv);
    if (s.hat === 'dome') dome(LB.paint(LB.ctx2d(cv)), g, view);
    return cv;
  }

  // ---------- the cast ----------
  const LOOKS = {
    farmer: { skin: 1, eyes: 'brown', hair: 'short', hairC: 'brown', hat: 'straw', blush: 1, smile: 1, beard: 'stubble', top: { k: 'overalls', c: '#c6513c', c2: '#4a6c9e' }, legs: { k: 'trousers', c: '#4a6c9e' }, feet: { k: 'boots', c: '#6e4428' } },
    'farmer-f': { skin: 0, eyes: 'green', hair: 'ponytail', hairC: 'chestnut', hat: 'bandana', hatC: '#d4484a', blush: 1, smile: 1, top: { k: 'dress', c: '#f2e6c8', c2: '#62904c' }, legs: { k: 'skirt', c: '#62904c', stock: '#efe2cc' }, feet: { k: 'boots', c: '#7a4a2a' }, item: 'basket' },
    fisher: { skin: 2, eyes: 'grey', hair: 'short', hairC: 'grey', beard: 'full', hat: 'watch', hatC: '#b8463a', top: { k: 'sweater', c: '#3e5e82' }, legs: { k: 'trousers', c: '#6c6852' }, feet: { k: 'boots', c: '#3e3e48' }, item: 'rod' },
    sailor: { skin: 1, eyes: 'blue', hair: 'short', hairC: 'black', hat: 'cap', hatC: '#2a3c5e', beard: 'stubble', top: { k: 'stripes', c: '#f2efe6', c2: '#2c4878' }, legs: { k: 'trousers', c: '#2a3c5e' }, feet: { k: 'shoes', c: '#3c2c24' } },
    baker: { skin: 1, eyes: 'brown', hair: 'bun', hairC: 'blonde', hat: 'chef', blush: 1, smile: 1, top: { k: 'apron', c: '#e6d6c0', c2: '#fbf8f0', short: 1 }, legs: { k: 'trousers', c: '#6c5442' }, feet: { k: 'shoes', c: '#5a3a26' }, item: 'basket', basket: 'bread' },
    elf: { skin: 0, eyes: 'green', hair: 'long', hairC: 'platinum', ears: 'elf', hat: 'circlet', top: { k: 'tunic', c: '#4f7e48', trim: '#d8b450' }, legs: { k: 'trousers', c: '#6c5638' }, feet: { k: 'boots', c: '#5a4030' } },
    'elf-bard': { skin: 2, eyes: 'amber', hair: 'wavy', hairC: 'teal', ears: 'elf', smile: 1, top: { k: 'tunic', c: '#c9973f', trim: '#7a3468' }, cape: '#7a3468', legs: { k: 'trousers', c: '#3e3a52' }, feet: { k: 'boots', c: '#5a3a2a' }, item: 'lute' },
    skier: { skin: 1, eyes: 'blue', hair: 'short', hairC: 'blonde', hat: 'beanie', hatC: '#e2583e', goggles: 1, blush: 1, broad: 1, top: { k: 'puffer', c: '#3c7ccc' }, legs: { k: 'trousers', c: '#2a2c3e' }, feet: { k: 'skiboots', c: '#ecebf0' }, gloves: '#2a2c3e', item: 'skis' },
    mountaineer: { skin: 2, eyes: 'brown', hair: 'short', hairC: 'brown', beard: 'full', hat: 'hood', broad: 1, top: { k: 'parka', c: '#e2672c' }, legs: { k: 'trousers', c: '#4c4d58' }, feet: { k: 'boots', c: '#5a3e2a' }, gloves: '#3a3a48', pack: '#5c6c4a', bedroll: '#a84a3a', item: 'iceaxe' },
    cyber: { skin: 3, eyes: 'amber', hair: 'undercut', hairC: 'black', visor: '#4af0e4', top: { k: 'jacket', c: '#28283a', c2: '#6a2e64', trim: '#ff4fae' }, legs: { k: 'trousers', c: '#1e1e28' }, feet: { k: 'boots', c: '#2c2c36' } },
    'cyber-b': { skin: 0, eyes: 'violet', hair: 'mohawk', hairC: 'pink', smile: 1, top: { k: 'hoodie', c: '#3c2e5e', trim: '#46e8f0' }, legs: { k: 'trousers', c: '#22222e' }, feet: { k: 'sneakers', c: '#6a5ad0' } },
    pilot: { skin: 1, eyes: 'brown', hair: 'curly', hairC: 'brown', beard: 'full', hat: 'dome', smile: 1, top: { k: 'suit', c: '#dba23e', c2: '#8c5c2e', trim: '#f2e2bc' }, legs: { k: 'trousers', c: '#dba23e' }, feet: { k: 'boots', c: '#6c4a2c' }, gloves: '#8c5c2e', pack: '#a8743a' },
    child: { child: 1, skin: 2, eyes: 'brown', hair: 'curly', hairC: 'black', blush: 1, smile: 1, top: { k: 'tee', c: '#e8c03c', short: 1, print: '#e0503a' }, legs: { k: 'shorts', c: '#4a7cb0' }, feet: { k: 'sneakers', c: '#e04a4a' } },
    elder: { skin: 0, eyes: 'grey', hair: 'bun', hairC: 'white', glasses: '#b89a5a', smile: 1, top: { k: 'cardigan', c: '#8c5a6c', c2: '#ece2d2' }, legs: { k: 'skirt', c: '#5a5a68', stock: '#8c7c72' }, feet: { k: 'shoes', c: '#4a3a30' }, item: 'cane' },
    merchant: { skin: 3, eyes: 'brown', hair: 'short', hairC: 'black', beard: 'full', beardC: 'black', hat: 'turban', hatC: '#c4443a', top: { k: 'coat', c: '#2f6a6c', trim: '#e0b23c', c2: '#e8d8b0', sash: '#e0a43c' }, legs: { k: 'trousers', c: '#4a3a2c' }, feet: { k: 'boots', c: '#5a3a22' }, satchel: '#8a5a2a' },
    guard: { skin: 1, eyes: 'blue', hair: 'short', hairC: 'auburn', beard: 'stubble', hat: 'helmet', top: { k: 'armor', c: '#9ea8b6', c2: '#a83a36' }, sleeve: '#7c8494', legs: { k: 'trousers', c: '#3a3442' }, feet: { k: 'boots', c: '#4a3424' }, gloves: '#5c4434', item: 'spear' },
  };
  LB.LOOKS = LOOKS;
  // anyone else: a seeded mix of parts
  function randomLook(name, seed) {
    let h = seed | 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
    const r = LB.rng(h);
    const tops = ['shirt', 'tunic', 'sweater', 'coat', 'cardigan', 'tee', 'dress'];
    const k = r.pick(tops);
    const c = LB.hsl(r() * 360, 0.35 + r() * 0.3, 0.38 + r() * 0.2);
    return {
      skin: r.int(0, 4), eyes: r.pick(Object.keys(EYES)), hair: r.pick(['short', 'curly', 'long', 'bun', 'ponytail', 'wavy', 'bald']),
      hairC: r.chance(0.08) ? r.pick(['pink', 'teal', 'green']) : r.pick(['black', 'brown', 'chestnut', 'blonde', 'red', 'grey', 'auburn', 'black', 'brown']), beard: r.chance(0.25) ? r.pick(['full', 'stubble']) : null, blush: r.chance(0.4), smile: r.chance(0.6),
      top: { k, c, c2: LB.hsl(r() * 360, 0.3, 0.7), trim: '#d8b450', short: k === 'tee' },
      legs: k === 'dress' ? { k: 'skirt', c: LB.hsl(r() * 360, 0.35, 0.4), stock: '#e8dccc' } : { k: r.chance(0.2) ? 'shorts' : 'trousers', c: LB.hsl(r() * 360, 0.25, 0.3) },
      feet: { k: r.pick(['boots', 'shoes']), c: LB.hsl(20 + r() * 20, 0.35, 0.22 + r() * 0.12) },
    };
  }

  const frames = new Map();
  const specCache = new Map();
  function spec(look, seed) {
    if (typeof look === 'object') return look;
    const k = look + '#' + (LOOKS[look] ? 0 : seed | 0);
    if (!specCache.has(k)) specCache.set(k, LOOKS[look] || randomLook(look, seed | 0));
    return specCache.get(k);
  }
  let objIds = new WeakMap(), nextId = 1;
  function specKey(look, seed) {
    if (typeof look === 'object') { if (!objIds.has(look)) objIds.set(look, 'o' + nextId++); return objIds.get(look); }
    return look + '#' + (LOOKS[look] ? 0 : seed | 0);
  }
  function frame(s, key, dir, pose) {
    const pk = (pose.walk == null ? 'i' : 'w' + pose.walk) + (pose.u || 0) + (pose.blink ? 'b' : '') + (pose.sit ? 's' : '');
    const k = key + '|' + dir + '|' + pk;
    let c = frames.get(k);
    if (!c) { c = dir === 'right' ? LB.flipX(frame(s, key, 'left', pose)) : build(s, dir, pose); frames.set(k, c); }
    return c;
  }
  // the pose for this moment: a 4-frame walk at ~7 steps a second, or breathing and an occasional blink
  function poseAt(o, s) {
    const t = o.t || 0, seed = (o.seed || 0) * 1.37 + (typeof o.look === 'string' ? o.look.length : 0);
    const blinkCycle = 3.1 + (seed % 1.7);
    const blink = ((t + seed * 0.71) % blinkCycle) < 0.13;
    if (o.sit) return { sit: 1, u: 3 + (Math.sin(t * 2.2 + seed) > 0.55 ? -1 : 0), blink };
    if (o.walk) { const ph = Math.floor(t * 7 + seed) % 4; return { walk: ph, u: ph % 2 ? -1 : 0, blink }; }
    return { u: Math.sin(t * 2.2 + seed) > 0.55 ? -1 : 0, blink };
  }

  LB.person = function (ctx, x, y, look, o) {
    o = o || {};
    const s = spec(look, o.seed), key = specKey(look, o.seed);
    const dir = o.dir || 'down';
    let use = s;
    if (o.item !== undefined && typeof look === 'string') { use = Object.assign({}, s, { item: o.item }); }
    const k2 = o.item !== undefined ? key + '+' + o.item : key;
    const pose = poseAt(Object.assign({ look }, o), use);
    const spr = frame(use, k2, dir, pose);
    if (o.shadow !== false) {
      ctx.save(); ctx.globalAlpha = 0.28; ctx.globalCompositeOperation = 'multiply';
      LB.paint(ctx).ellipse(Math.round(x) - 1, Math.round(y) - 1, s.child ? 6 : 8, 2, '#3a3458');
      ctx.restore();
    }
    ctx.drawImage(spr, Math.round(x) - CX, Math.round(y) - (G + 1));
  };
  LB.personFrame = (look, dir, pose, seed) => frame(spec(look, seed), specKey(look, seed), dir || 'down', pose || {});

  // ---------- the showcase: the whole cast on a little plaza ----------
  const W = 640, H = 256;
  const LINEUP = ['farmer', 'farmer-f', 'baker', 'fisher', 'sailor', 'merchant', 'guard', 'elf', 'elf-bard', 'skier', 'mountaineer', 'cyber', 'cyber-b', 'pilot', 'child', 'elder'];
  const base = { skin: 1, eyes: 'brown', smile: 1 };
  const WARDROBE = [
    Object.assign({}, base, { hair: 'short', hairC: 'brown', top: { k: 'shirt', c: '#4f8a6a' }, legs: { k: 'trousers', c: '#4a4a5e' }, feet: { k: 'boots', c: '#6a4428' } }),
    Object.assign({}, base, { hair: 'ponytail', hairC: 'red', blush: 1, top: { k: 'dress', c: '#f2e6c8', c2: '#b8506a' }, legs: { k: 'skirt', c: '#b8506a', stock: '#efe2cc' }, feet: { k: 'shoes', c: '#5a3a26' } }),
    Object.assign({}, base, { hair: 'mohawk', hairC: 'teal', top: { k: 'hoodie', c: '#2e2e3e', trim: '#ffb040' }, legs: { k: 'trousers', c: '#22222e' }, feet: { k: 'sneakers', c: '#e8e4dc' } }),
    Object.assign({}, base, { hair: 'long', hairC: 'black', top: { k: 'coat', c: '#5a2e3a', trim: '#d8b450', c2: '#e8dcc8' }, legs: { k: 'trousers', c: '#2e2a30' }, feet: { k: 'boots', c: '#3a2a22' } }),
    Object.assign({}, base, { hair: 'curly', hairC: 'auburn', beard: 'full', top: { k: 'suit', c: '#4a8cc0', c2: '#2c4a6c', trim: '#e8eef4' }, legs: { k: 'trousers', c: '#4a8cc0' }, feet: { k: 'boots', c: '#3a3a48' }, gloves: '#2c4a6c', pack: '#5a7a96' }),
  ];
  const LINE_Y = 132, PATH_Y0 = 150, PATH_Y1 = 206;
  const WALKERS = [
    { look: 'pilot', y: 176, x0: 40, x1: 420, speed: 18, ph: 0 },
    { look: 'cyber-b', y: 196, x0: 60, x1: 400, speed: 22, ph: 0.4 },
    { look: 'child', y: 168, x0: 150, x1: 330, speed: 30, ph: 0.7 },
    { look: 'farmer-f', y: 0, x: 446, ya: 150, yb: 226, speed: 14, ph: 0.2, vertical: 1 },
  ];
  const season = (S) => S.season;
  const benchSpr = (snow) => LB.sprite('ppl-bench' + snow, 40, 22, (P) => {
    const w = R('#9a6a3e'), ir = R('#3a3a46');
    P.rect(2, 2, 36, 3, w[2]); P.rect(2, 2, 36, 1, w[3]); P.rect(2, 6, 36, 3, w[2]); P.rect(2, 6, 36, 1, w[3]); // backrest slats
    P.rect(1, 11, 38, 4, w[2]); P.rect(1, 11, 38, 1, w[3]); P.rect(1, 14, 38, 1, w[1]); // seat
    for (const x of [4, 34]) { P.rect(x, 1, 2, 21, ir[2]); P.px(x, 1, ir[3]); }
    if (snow) { P.rect(2, 1, 36, 1, '#f4f8ff'); P.rect(1, 10, 38, 2, '#f4f8ff'); P.rect(2, 5, 36, 1, '#e4ecf8'); }
  }, { outline: 'sel' });
  const lampSpr = () => LB.sprite('ppl-lamp', 12, 56, (P) => {
    const ir = R('#33343e');
    P.rect(5, 10, 2, 44, ir[2]); P.px(5, 10, ir[3]);
    P.rect(3, 52, 6, 3, ir[1]); P.rect(2, 54, 8, 2, ir[0]);
    P.rect(2, 2, 8, 9, ir[1]); P.rect(3, 3, 6, 6, '#ffe6a0'); P.rect(1, 1, 10, 2, ir[2]); P.px(5, 0, ir[2]);
  }, { outline: 'sel' });
  const potSpr = (kind, sea) => LB.sprite('ppl-pot' + kind + sea, 20, 22, (P) => {
    const tc = R('#b8603a');
    P.rect(4, 12, 12, 9, tc[2]); P.rect(4, 12, 3, 9, tc[3]); P.rect(13, 12, 3, 9, tc[1]); P.rect(3, 11, 14, 2, tc[3]);
    if (sea === 'winter') { P.rect(4, 9, 12, 3, '#f2f6fc'); P.px(5, 8, '#ffffff'); return; }
    const lf = R(sea === 'autumn' ? '#a8823a' : '#4c8a3c');
    for (let i = 0; i < 9; i++) P.blob(5 + (i % 3) * 5, 5 + Math.floor(i / 3) * 2, 3, lf[1 + (i % 3)], kind * 9 + i, 0.3);
    const fl = kind ? '#f2c04a' : '#e2507a';
    if (sea !== 'autumn') for (const [x, y] of [[5, 3], [10, 2], [14, 5], [8, 7]]) { P.rect(x, y, 2, 2, fl); P.px(x, y, '#fff6d0'); }
  }, { outline: 'sel' });

  function groundArt(ctx, S, P) {
      const sea = season(S);
      const grass = { spring: '#76b04e', summer: '#5c9a44', autumn: '#9a9a4a', winter: '#e8eef6' }[sea];
      const G5 = LB.ramp(grass, 5);
      P.rect(0, 0, W, H, G5[2]);
      // calm turf: one slow, soft variation, then tufts in clumps and flowers in patches of one kind
      const mid = LB.mix(G5[2], G5[3], 0.4), low = LB.mix(G5[2], G5[1], 0.45);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const n = LB.fbm(x * 0.009, y * 0.014, 41, 3) + (LB.bayer(x, y) - 0.5) * 0.03;
        if (n > 0.6) P.px(x, y, mid); else if (n < 0.37) P.px(x, y, low);
      }
      const r = LB.rng(5);
      const clear = (y) => (y > PATH_Y0 - 4 && y < PATH_Y1 + 3) || (y > 90 && y < 142);
      const tuft = (x, y, c0, c1, c2) => { P.px(x, y, c0); P.px(x - 1, y - 1, c1); P.px(x + 1, y - 1, c2); P.px(x, y - 2, c2); };
      for (let i = 0; i < 90; i++) {
        const cx = r.int(0, W), cy = r.int(20, H);
        const n = r.int(3, 8);
        for (let j = 0; j < n; j++) {
          const x = cx + r.int(-7, 7), y = cy + r.int(-4, 4);
          if (clear(y)) continue;
          if (sea === 'winter') { if (r() < 0.4) { P.px(x, y, G5[1]); P.px(x + 1, y - 1, G5[3]); } continue; }
          tuft(x, y, G5[1], G5[2], G5[3]);
        }
      }
      if (sea !== 'winter') for (let i = 0; i < 18; i++) {
        const cx = r.int(0, W), cy = r.int(60, H);
        const fc = sea === 'autumn' ? r.pick(['#d86a2a', '#e8a63a', '#b8442a']) : r.pick(['#f6f0e0', '#f2c84a', '#e2709a', '#a898f0']);
        for (let j = 0; j < 6; j++) {
          const x = cx + r.int(-6, 6), y = cy + r.int(-3, 3);
          if (clear(y)) continue;
          if (sea === 'autumn') { P.px(x, y, fc); P.px(x + 1, y, LB.shade(fc, -0.4)); continue; }
          P.px(x, y + 1, G5[0]); P.px(x, y, fc); P.px(x + 1, y, fc); P.px(x, y - 1, fc); P.px(x + 1, y - 1, LB.shade(fc, 0.5));
        }
      }
      // the stage the cast stand on: flagstones laid in running courses
      const st = LB.ramp(sea === 'winter' ? '#c8ccd8' : '#b4a48e', 5);
      const sY0 = 94, sY1 = 140;
      P.rect(10, sY0, W - 20, sY1 - sY0, st[1]);
      for (let row = 0, y = sY0 + 1; y < sY1 - 1; row++, y += 9) {
        let x = 11 + (row % 2) * 9;
        const rr = LB.rng(100 + row);
        while (x < W - 12) {
          const w = rr.int(14, 24), h = Math.min(8, sY1 - 1 - y);
          const tone = rr() < 0.25 ? st[3] : rr() < 0.2 ? st[1] : st[2];
          P.rect(x, y, Math.min(w - 1, W - 12 - x), h, tone);
          P.rect(x, y, Math.min(w - 1, W - 12 - x), 1, st[3]); P.px(x, y + 1, st[4]);
          P.rect(x, y + h - 1, Math.min(w - 1, W - 12 - x), 1, st[1]);
          if (rr() < 0.2) P.px(x + rr.int(2, w - 4), y + rr.int(2, 5), st[0]);
          x += w;
        }
      }
      P.rect(10, sY1 - 1, W - 20, 2, st[0]); P.rect(10, sY0 - 1, W - 20, 1, st[3]);
      if (sea === 'winter') for (let x = 10; x < W - 10; x++) if (LB.hash(x, 3, 9) < 0.5) P.px(x, sY0 + (LB.hash(x, 4, 9) < 0.5 ? 0 : 1), '#f4f8ff');
      // the dirt path the walkers use, its edges ragged with turf
      const d = LB.ramp(sea === 'winter' ? '#d8dce6' : '#c49a68', 5);
      for (let x = 0; x < W; x++) {
        const a = PATH_Y0 + Math.round(2 * Math.sin(x * 0.05) + LB.noise(x * 0.2, 1, 3) * 2), b = PATH_Y1 + Math.round(2 * Math.sin(x * 0.04 + 1) + LB.noise(x * 0.2, 2, 3) * 2);
        P.rect(x, a, 1, b - a, d[2]); P.px(x, a, d[3]); P.px(x, b - 1, d[1]); P.px(x, a - 1, G5[1]);
        if (LB.hash(x, 7, 2) < 0.18) P.px(x, a + 1 + Math.floor(LB.hash(x, 8, 2) * (b - a - 3)), d[1]);
        if (LB.hash(x, 9, 2) < 0.08) { const y = a + 2 + Math.floor(LB.hash(x, 10, 2) * (b - a - 5)); P.px(x, y, d[3]); P.px(x + 1, y, d[4]); P.px(x, y + 1, d[1]); }
      }
      // the wardrobe's round dais
      const dz = LB.ramp(sea === 'winter' ? '#d8dce8' : '#cdbfa6', 5);
      P.ellipse(546, 238, 82, 15, dz[0]); P.ellipse(546, 236, 82, 15, dz[2]); P.ellipse(546, 234, 80, 13, dz[3]); P.ellipse(546, 236, 76, 11, dz[2]);
      // a hedge across the back
      const hg = LB.ramp(sea === 'autumn' ? '#7a7a34' : sea === 'winter' ? '#4c6a52' : '#3f7a3c', 5);
      for (let x = 0; x < W; x += 1) {
        const top = 18 + Math.round(3 * LB.noise(x * 0.15, 0, 8));
        P.rect(x, top, 1, 52 - top, hg[2]);
        P.px(x, top, hg[3]); P.px(x, top + 1, hg[3]);
        P.rect(x, 48, 1, 4, hg[1]);
        P.rect(x, 52, 1, 3, LB.mix(G5[1], hg[0], 0.3));
      }
      for (let i = 0; i < 260; i++) { const x = LB.hash(i, 1, 70) * W, y = 22 + LB.hash(i, 2, 70) * 26; P.px(x, y, LB.hash(i, 3, 70) < 0.5 ? hg[3] : hg[1]); P.px(x + 1, y, hg[1]); }
      if (sea === 'winter') for (let x = 0; x < W; x++) { const top = 18 + Math.round(3 * LB.noise(x * 0.15, 0, 8)); P.rect(x, top - 1, 1, 3, '#f4f8ff'); if (LB.hash(x, 5, 9) < 0.3) P.px(x, top + 2, '#e4ecf8'); }
      if (sea === 'spring' || sea === 'summer') for (let i = 0; i < 40; i++) { const x = LB.hash(i, 4, 71) * W, y = 24 + LB.hash(i, 5, 71) * 20; P.rect(x, y, 2, 2, sea === 'spring' ? '#f4b8c8' : '#f6f0e0'); P.px(x, y, '#ffffff'); }
      // the hedge's top seen from above, leafy
      for (let x = 0; x < W; x++) { const top = 18 + Math.round(3 * LB.noise(x * 0.15, 0, 8)); P.rect(x, 0, 1, top, sea === 'winter' ? '#e6ecf6' : hg[2]); }
      for (let i = 0; i < 300; i++) { const x = LB.hash(i, 6, 72) * W, y = LB.hash(i, 7, 72) * 18; P.px(x, y, sea === 'winter' ? '#f8faff' : LB.hash(i, 8, 72) < 0.5 ? hg[3] : hg[1]); }
  }

  LB.add({
    id: 'people', order: 90, section: 'people', world: 'Every world', name: 'People with faces',
    blurb: 'The whole cast, drawn by hand in pixels instead of rendered from 3D models: real hairstyles, faces with eyes, brows and a mouth, clothes with folds, a walk with a bounce.',
    see: [
      'Sixteen looks, one for every world: farmers, the baker, fisher and sailor, a guard, elves, a skier and a climber, Arcadia\'s street kids, Beck\'s pilot in the glass dome, a child and an elder.',
      'Everyone breathes and blinks while they stand, and walks with a bob and a swing of the arms in all four directions.',
      'The five at the bottom right share one body: only the hair and clothes change. That is how every pilot and townsperson gets a different look without drawing them from scratch.',
      'The elder and the bard sit on the benches. Sitting is its own pose, so people can sit at bars, benches and campfires.',
    ],
    build: 'Each person is layers: a body, then hair, outfit, hat and whatever they carry, each with its own colours, so new people are mostly new combinations and colour swaps. This replaces the 3D-rendered sprites. Choosing hair and outfit for your pilot comes almost for free, and close-up portraits for conversations can follow later. The bigger job is the poses: the game also needs fighting, climbing, skiing and sitting frames for every outfit.',
    w: W, h: H,
    weathers: ['clear', 'rain', 'snow', 'fog'],
    ground(ctx, S) {
      // everything on the ground depends only on the season: build it once per season
      ctx.drawImage(LB.memo('ppl-ground:' + S.season, () => { const c = LB.canvas(W, H); groundArt(LB.ctx2d(c), S, LB.paint(LB.ctx2d(c))); return c; }), 0, 0);
    },
    clouds: false,
    shadows(sh, S) {
      for (const x of [90, 330, 580]) sh.pole(x, 92, 50, 2);
      sh.cast(benchSpr(S.season === 'winter' ? 1 : 0), 52, 92);
      sh.cast(benchSpr(S.season === 'winter' ? 1 : 0), 212, 92);
    },
    objects(ctx, S, P) {
      const sea = season(S), sn = sea === 'winter' ? 1 : 0;
      LB.blit(ctx, benchSpr(sn), 52, 92);
      LB.blit(ctx, benchSpr(sn), 212, 92);
      for (const x of [90, 330, 580]) LB.blit(ctx, lampSpr(), x, 92);
      for (const [x, k] of [[140, 0], [262, 1], [400, 0], [470, 1], [626, 0]]) LB.blit(ctx, potSpr(k, sea), x, 92);
    },
    live(ctx, S) {
      const t = S.t;
      const items = [];
      // the bench sitters
      items.push({ y: 88, d: () => LB.person(ctx, 46, 88, 'elder', { sit: true, t, seed: 3, dir: 'down', shadow: false }) });
      items.push({ y: 88, d: () => LB.person(ctx, 218, 88, 'elf-bard', { sit: true, t, seed: 5, dir: 'down', shadow: false }) });
      // the lineup, idling; a couple turned to look about
      LINEUP.filter((l) => l !== 'elder' && l !== 'elf-bard').forEach((look, i) => {
        const x = 34 + i * 41, turn = Math.floor(t / 4 + i * 0.37) % 7;
        const dir = turn === 5 ? 'left' : turn === 6 ? 'right' : 'down';
        items.push({ y: LINE_Y, d: () => LB.person(ctx, x, LINE_Y, look, { t, seed: i, dir }) });
      });
      // walkers back and forth along the path
      for (const w of WALKERS) {
        if (w.vertical) {
          const span = w.yb - w.ya, p = ((t * w.speed) / span + w.ph) % 2;
          const goingDown = p < 1, y = Math.round(w.ya + (goingDown ? p : 2 - p) * span);
          items.push({ y, d: () => LB.person(ctx, w.x, y, w.look, { walk: true, t, seed: 7, dir: goingDown ? 'down' : 'up' }) });
          continue;
        }
        const span = w.x1 - w.x0, p = ((t * w.speed) / span + w.ph) % 2;
        const right = p < 1, x = Math.round(w.x0 + (right ? p : 2 - p) * span);
        items.push({ y: w.y, d: () => LB.person(ctx, x, w.y, w.look, { walk: true, t, seed: 11, dir: right ? 'right' : 'left' }) });
      }
      // the wardrobe: one body, five looks
      WARDROBE.forEach((s, i) => {
        const x = 490 + i * 28, y = 240 - (i % 2) * 6;
        items.push({ y, d: () => LB.person(ctx, x, y, s, { t, seed: 20 + i, dir: 'down' }) });
      });
      items.sort((a, b) => a.y - b.y);
      for (const it of items) it.d();
    },
    emissive(ctx, S, P) {
      if (S.L.night < 0.3) return;
      for (const x of [90, 330, 580]) P.rect(x - 2, 40, 6, 6, '#ffe6a0');
    },
    lights(S) { return [90, 330, 580].map((x) => ({ x: x + 1, y: 64, r: 46, c: '#ffbe6a', flicker: 0.4 })); },
  });
})();
