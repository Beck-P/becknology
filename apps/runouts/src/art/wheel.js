// The roulette wheel, drawn pixel by pixel every frame (so it turns on the pixel grid): a wooden bowl, the ball
// track, 37 pockets in red, black and green with brass frets, the cone and the gold turret. Seen from above at the
// tables' angle (an ellipse). The ball is drawn on top by the table.
import { WHEEL, colorOf } from '../games/roulette.js';
import { PAL, disc } from './pix.js';

const COL = {
  rim: [42, 18, 8], rim2: [90, 46, 20], rimHi: [140, 80, 34], track: [26, 12, 6], trackHi: [58, 30, 14],
  red: [200, 32, 48], red2: [150, 20, 34], black: [26, 22, 34], black2: [14, 12, 20], green: [30, 150, 80], green2: [18, 100, 52],
  fret: [210, 170, 80], cone: [120, 60, 26], cone2: [84, 40, 16], gold: [240, 200, 96], gold2: [170, 120, 40],
};
const bufs = new Map();
/** Draw the wheel centred at (cx, cy), radius R, squashed vertically by k (ry = R·k), turned by angle a. */
export function drawWheel(ctx, cx, cy, R, k, a, hilite = -1) {
  const w = R * 2 + 2, h = Math.ceil(R * k) * 2 + 2;
  const key = w + 'x' + h;
  let b = bufs.get(key);
  if (!b) { const c = document.createElement('canvas'); c.width = w; c.height = h; b = { c, g: c.getContext('2d'), img: null }; b.img = b.g.createImageData(w, h); bufs.set(key, b); }
  const d = b.img.data, n = 37, step = (Math.PI * 2) / n;
  const r1 = R, r2 = R * 0.93, r3 = R * 0.78, r4 = R * 0.62, r5 = R * 0.46, r6 = R * 0.16;
  for (let y = 0; y < h; y++) {
    const dy = (y - h / 2 + 0.5) / k;
    for (let x = 0; x < w; x++) {
      const dx = x - w / 2 + 0.5, r = Math.hypot(dx, dy), i = (y * w + x) * 4;
      if (r > r1) { d[i + 3] = 0; continue; }
      let c;
      const shade = dy < 0 ? 1 : 0.86;                       // light from above: the far side brighter
      if (r > r2) c = r > r1 - 1.2 ? COL.rimHi : (Math.floor(Math.atan2(dy, dx) * 12) & 1 ? COL.rim2 : COL.rim);
      else if (r > r3) c = r > r2 - 1 ? COL.trackHi : COL.track;
      else if (r > r4) {
        let ang = Math.atan2(dy, dx) - a;
        ang = ((ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const p = Math.floor(ang / step), within = ang / step - p;
        if (within < 0.09) c = COL.fret;
        else {
          const num = WHEEL[p % n], cl = colorOf(num);
          const inner = r < (r3 + r4) / 2;
          c = cl === 'green' ? (inner ? COL.green2 : COL.green) : cl === 'red' ? (inner ? COL.red2 : COL.red) : (inner ? COL.black2 : COL.black);
          if (p === hilite) c = [255, 240, 160];
        }
      } else if (r > r5) c = r > r4 - 1 ? COL.fret : (Math.floor((Math.atan2(dy, dx) - a) * 4 / Math.PI + 16) & 1 ? COL.cone : COL.cone2);
      else if (r > r6) {
        const q = Math.PI / 2, m = (((Math.atan2(dy, dx) - a) % q) + q) % q;
        const spoke = (m < 0.16 || m > q - 0.16) && r < r5 * 0.92;
        c = r < r6 + 1.5 ? COL.gold2 : spoke ? (dy < 0 ? COL.gold : COL.gold2) : COL.cone2;
      } else c = r < r6 * 0.55 ? COL.gold : COL.gold2;
      d[i] = c[0] * shade; d[i + 1] = c[1] * shade; d[i + 2] = c[2] * shade; d[i + 3] = 255;
    }
  }
  b.g.putImageData(b.img, 0, 0);
  // the shadow under the bowl, then the wheel
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  disc(ctx, cx + 1, cy + 3, R + 1, 'rgba(0,0,0,0.45)', R * k + 1);
  ctx.drawImage(b.c, Math.round(cx - w / 2), Math.round(cy - h / 2));
}
/** The world angle of pocket p's centre on a wheel turned by a. */
export const pocketAngle = (p, a) => a + (p + 0.5) * (Math.PI * 2) / 37;
export const pocketOf = (n) => WHEEL.indexOf(n);

/**
 * Where the wheel and ball are t ms into a spin of `spin` ({ at, dur, n, turns, wheel0 }).
 * → { a (wheel angle), ba (ball angle), br (ball radius, × R), landed }
 */
export function spinPose(spin, t) {
  const T = spin.dur, s = Math.max(0, t) / 1000, tw = 2.6;
  const a = spin.wheel0 + 1.9 * tw * (1 - Math.exp(-s / tw)) + 0.12 * s;
  const settle = (T / 1000) * 0.86, drop = settle * 0.7;
  const p = pocketOf(spin.n);
  const relEnd = (p + 0.5) * (Math.PI * 2) / 37;
  const u = Math.min(1, s / settle);
  let rel = relEnd - (spin.turns + 2) * Math.PI * 2 * Math.pow(1 - u, 2.4);
  let br = 0.86;
  if (s > drop && s < settle) {
    const q = (s - drop) / (settle - drop);
    rel += Math.sin(q * Math.PI * 5) * 0.22 * (1 - q);
    br = 0.86 - (0.86 - 0.7) * Math.min(1, q * 1.6) + Math.abs(Math.sin(q * Math.PI * 4)) * 0.06 * (1 - q);
  } else if (s >= settle) br = 0.7;
  return { a, ba: a + rel, br, landed: s >= settle, dropping: s > drop && s < settle, p };
}

export { PAL };
