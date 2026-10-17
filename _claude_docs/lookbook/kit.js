// Becknology Look Book — the pixel kit every scene draws with.
// Everything is drawn at native resolution (32 px a tile, like the game) with whole-pixel fills, then scaled up by
// CSS with nearest-neighbour. See README.md for the scene contract.
(function () {
  'use strict';
  const LB = (window.LB = window.LB || {});
  LB.scenes = LB.scenes || [];
  LB.add = (def) => LB.scenes.push(def);
  LB.TILE = 32;

  // ---------- random & noise ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  LB.rng = function (seed) {
    const r = mulberry32((seed >>> 0) || 1);
    const f = () => r();
    f.range = (a, b) => a + (b - a) * r();
    f.int = (a, b) => Math.floor(a + (b - a + 1) * r());
    f.pick = (arr) => arr[Math.floor(r() * arr.length)];
    f.chance = (p) => r() < p;
    return f;
  };
  // a hash of integer coordinates → [0, 1)
  LB.hash = function (x, y, s) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul((s | 0) + 1, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  // smooth value noise; period (optional) makes it tile every `period` cells horizontally
  LB.noise = function (x, y, s, period) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const wx = (n) => (period ? ((n % period) + period) % period : n);
    const a = LB.hash(wx(xi), yi, s), b = LB.hash(wx(xi + 1), yi, s), c = LB.hash(wx(xi), yi + 1, s), d = LB.hash(wx(xi + 1), yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  LB.fbm = function (x, y, s, oct, period) {
    oct = oct || 4;
    let t = 0, amp = 0.5, f = 1, n = 0;
    for (let i = 0; i < oct; i++) {
      t += amp * LB.noise(x * f, y * f, (s | 0) + i * 17, period ? period * f : 0);
      n += amp; amp *= 0.5; f *= 2;
    }
    return t / n;
  };
  // Bayer 4×4 threshold in [0, 1)
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  LB.bayer = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

  // ---------- colour ----------
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  LB.clamp = clamp;
  LB.lerp = (a, b, t) => a + (b - a) * t;
  LB.smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  LB.rgb = (c) => (typeof c === 'string' ? hexToRgb(c) : c);
  LB.hex = (c) => {
    if (typeof c === 'string') return c;
    return '#' + c.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  };
  LB.css = (c, a) => {
    c = LB.rgb(c);
    return a == null ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  };
  LB.mix = (a, b, t) => { a = LB.rgb(a); b = LB.rgb(b); return LB.hex([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]); };
  function rgb2hsl(c) {
    let [r, g, b] = LB.rgb(c).map((v) => v / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let h = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }
  function hsl2rgb(h, s, l) {
    h = (((h % 360) + 360) % 360) / 360;
    if (s === 0) return [l * 255, l * 255, l * 255];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  }
  LB.toHsl = rgb2hsl;
  LB.hsl = (h, s, l) => LB.hex(hsl2rgb(h, clamp(s, 0, 1), clamp(l, 0, 1)));
  function towards(h, target, deg) {
    const d = ((target - h + 540) % 360) - 180;
    return h + Math.sign(d) * Math.min(Math.abs(d), deg);
  }
  // Shade a colour the way pixel artists do: darker steps shift toward blue-violet and get a little more saturated,
  // lighter steps shift toward warm yellow and lose a little saturation. k in about -1..1.
  LB.shade = function (c, k, o) {
    o = o || {};
    const shift = o.shift == null ? 26 : o.shift;
    let [h, s, l] = rgb2hsl(c);
    const s0 = s, l0 = l;
    if (k < 0) {
      h = towards(h, o.cool == null ? 245 : o.cool, -k * shift);
      s = s * (1 - k * 0.18);
      l = l + k * (o.dark == null ? 0.34 : o.dark) * (0.6 + l * 0.6);
    } else {
      h = towards(h, o.warm == null ? 52 : o.warm, k * shift * 0.8);
      s = s * (1 - k * 0.22);
      l = l + k * (o.light == null ? 0.3 : o.light) * (1.25 - l * 0.6);
    }
    // cap the colourfulness of the result at what the original had (plus a little): a near-white with a hint of blue
    // must shade to a grey-blue, not a vivid blue
    const c0 = (1 - Math.abs(2 * l0 - 1)) * s0, room = 1 - Math.abs(2 * clamp(l, 0, 1) - 1);
    if (room > 0.001) s = Math.min(s, (c0 * 1.6 + 0.03) / room);
    return LB.hsl(h, s, l);
  };
  // A ramp of n colours, darkest first, around a base colour (which sits at index `mid`, default the middle).
  LB.ramp = function (base, n, o) {
    o = o || {};
    n = n || 5;
    const mid = o.mid == null ? Math.floor((n - 1) / 2) : o.mid;
    const out = [];
    for (let i = 0; i < n; i++) {
      const k = i === mid ? 0 : i < mid ? -(mid - i) / Math.max(1, mid) : (i - mid) / Math.max(1, n - 1 - mid);
      out.push(i === mid ? LB.hex(base) : LB.shade(base, k * (o.spread || 1), o));
    }
    return out;
  };

  // ---------- canvases & painting ----------
  LB.canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; };
  LB.ctx2d = (cv) => { const x = cv.getContext('2d', { willReadFrequently: false }); x.imageSmoothingEnabled = false; return x; };
  // A whole-pixel painter over a 2D context. Every shape lands on the pixel grid — no anti-aliasing.
  LB.paint = function (ctx) {
    ctx.imageSmoothingEnabled = false;
    const col = (c) => { if (c != null) ctx.fillStyle = typeof c === 'string' ? c : LB.css(c); };
    const R = Math.round;
    const P = { ctx };
    P.rect = (x, y, w, h, c) => { col(c); ctx.fillRect(R(x), R(y), R(w), R(h)); };
    P.px = (x, y, c) => { col(c); ctx.fillRect(R(x), R(y), 1, 1); };
    P.hline = (x0, x1, y, c) => { col(c); const a = R(Math.min(x0, x1)), b = R(Math.max(x0, x1)); ctx.fillRect(a, R(y), b - a + 1, 1); };
    P.vline = (x, y0, y1, c) => { col(c); const a = R(Math.min(y0, y1)), b = R(Math.max(y0, y1)); ctx.fillRect(R(x), a, 1, b - a + 1); };
    P.disc = (cx, cy, r, c) => {
      col(c); cx = R(cx); cy = R(cy);
      for (let dy = -Math.floor(r); dy <= Math.floor(r); dy++) {
        const hw = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)) + 0.5);
        ctx.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1);
      }
    };
    P.ellipse = (cx, cy, rx, ry, c) => {
      col(c); cx = R(cx); cy = R(cy);
      const ryi = Math.max(0, Math.round(ry));
      for (let dy = -ryi; dy <= ryi; dy++) {
        const t = ryi === 0 ? 0 : dy / (ry + 0.5);
        const hw = Math.floor(rx * Math.sqrt(Math.max(0, 1 - t * t)) + 0.5);
        ctx.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1);
      }
    };
    // filled polygon, scanline, whole pixels. pts = [[x, y], ...]
    P.poly = (pts, c) => {
      col(c);
      let y0 = Infinity, y1 = -Infinity;
      for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
      y0 = Math.floor(y0); y1 = Math.ceil(y1);
      for (let y = y0; y <= y1; y++) {
        const yc = y + 0.5, xs = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length];
          if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
        }
        xs.sort((p, q) => p - q);
        for (let i = 0; i + 1 < xs.length; i += 2) {
          const xa = Math.round(xs[i]), xb = Math.round(xs[i + 1]);
          if (xb > xa) ctx.fillRect(xa, y, xb - xa, 1);
        }
      }
    };
    P.line = (x0, y0, x1, y1, c) => {
      col(c);
      x0 = R(x0); y0 = R(y0); x1 = R(x1); y1 = R(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (let guard = 0; guard < 4096; guard++) {
        ctx.fillRect(x0, y0, 1, 1);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    };
    // an organic blob: a disc whose radius wanders with angle. sq squashes it vertically.
    P.blob = (cx, cy, r, c, seed, rough, sq) => {
      col(c);
      rough = rough == null ? 0.25 : rough; sq = sq || 1; seed = seed || 1;
      const ri = Math.ceil(r * (1 + rough)), ry = Math.ceil(ri * sq);
      cx = R(cx); cy = R(cy);
      for (let dy = -ry; dy <= ry; dy++) {
        let run = -1;
        for (let dx = -ri; dx <= ri + 1; dx++) {
          let inside = false;
          if (dx <= ri) {
            const yy = dy / sq, a = Math.atan2(yy, dx);
            const rr = r * (1 + rough * (LB.noise(Math.cos(a) * 1.6 + 5, Math.sin(a) * 1.6 + 5, seed) * 2 - 1));
            inside = dx * dx + yy * yy <= rr * rr;
          }
          if (inside && run < 0) run = dx;
          if (!inside && run >= 0) { ctx.fillRect(cx + run, cy + dy, dx - run, 1); run = -1; }
        }
      }
    };
    // ordered-dither fill: `level` 0..1 of the pixels in the rect get colour c
    P.dither = (x, y, w, h, c, level) => {
      col(c);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const X = R(x) + i, Y = R(y) + j;
        if (LB.bayer(X, Y) < level) ctx.fillRect(X, Y, 1, 1);
      }
    };
    return P;
  };

  // ---------- sprites, outlines, memo ----------
  const memo = new Map();
  LB.memo = (key, fn) => { if (!memo.has(key)) memo.set(key, fn()); return memo.get(key); };
  // 1-pixel outline round the opaque pixels of a canvas. mode: a colour, or 'sel' (each outline pixel a deep shade of the
  // pixel it borders — the soft "sel-out" outline of hi-res pixel art). Returns a new canvas, same size (leave 1 px spare).
  LB.outline = function (src, mode, strength) {
    const w = src.width, h = src.height;
    const sd = LB.ctx2d(src).getImageData(0, 0, w, h).data;
    const out = LB.canvas(w, h), oc = LB.ctx2d(out);
    oc.drawImage(src, 0, 0);
    const od = oc.getImageData(0, 0, w, h);
    const d = od.data;
    const fixed = mode && mode !== 'sel' ? LB.rgb(mode) : null;
    const k = strength == null ? -0.95 : -strength;
    const shadeCache = new Map();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (sd[i + 3] >= 128) continue;
      let ni = -1;
      if (x > 0 && sd[i - 4 + 3] >= 128) ni = i - 4;
      else if (x < w - 1 && sd[i + 4 + 3] >= 128) ni = i + 4;
      else if (y > 0 && sd[i - w * 4 + 3] >= 128) ni = i - w * 4;
      else if (y < h - 1 && sd[i + w * 4 + 3] >= 128) ni = i + w * 4;
      if (ni < 0) continue;
      let c = fixed;
      if (!c) {
        const key = (sd[ni] << 16) | (sd[ni + 1] << 8) | sd[ni + 2];
        if (!shadeCache.has(key)) shadeCache.set(key, LB.rgb(LB.shade([sd[ni], sd[ni + 1], sd[ni + 2]], k)));
        c = shadeCache.get(key);
      }
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
    oc.putImageData(od, 0, 0);
    return out;
  };
  // Build (once) and cache a sprite. draw(P, ctx, w, h). opt.outline: colour or 'sel'.
  LB.sprite = function (key, w, h, draw, opt) {
    return LB.memo('spr:' + key, () => {
      let cv = LB.canvas(w, h);
      const ctx = LB.ctx2d(cv);
      draw(LB.paint(ctx), ctx, w, h);
      if (opt && opt.outline) cv = LB.outline(cv, opt.outline, opt.strength);
      return cv;
    });
  };
  // Draw a sprite with its anchor (bottom-centre by default) at x, y.
  LB.blit = function (ctx, spr, x, y, ax, ay) {
    ax = ax == null ? Math.floor(spr.width / 2) : ax;
    ay = ay == null ? spr.height : ay;
    ctx.drawImage(spr, Math.round(x - ax), Math.round(y - ay));
  };
  const flips = new WeakMap();
  LB.flipX = (spr) => {
    if (!flips.has(spr)) {
      const c = LB.canvas(spr.width, spr.height), x = LB.ctx2d(c);
      x.translate(spr.width, 0); x.scale(-1, 1); x.drawImage(spr, 0, 0);
      flips.set(spr, c);
    }
    return flips.get(spr);
  };
  const silhouettes = new WeakMap();
  LB.silhouette = function (spr, color) {
    let m = silhouettes.get(spr);
    if (!m) { m = {}; silhouettes.set(spr, m); }
    if (!m[color]) {
      const c = LB.canvas(spr.width, spr.height), x = LB.ctx2d(c);
      x.drawImage(spr, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
      m[color] = c;
    }
    return m[color];
  };

  // ---------- the light: time of day, season, weather ----------
  // hour, ambient (multiplied over the frame), sky top, sky at the horizon, night 0..1, golden 0..1
  const KEYS = [
    [0, '#3c4884', '#060a1e', '#1a2448', 1, 0],
    [4.6, '#404c88', '#0a1032', '#28305c', 1, 0],
    [5.6, '#8a78a8', '#2c3668', '#c47c8c', 0.55, 0.35],
    [6.6, '#f2c2ae', '#6c8cc4', '#f6ba92', 0.08, 0.75],
    [8, '#fff1de', '#78aeea', '#eae2ca', 0, 0.12],
    [12, '#ffffff', '#5a9ee8', '#d2e8f6', 0, 0],
    [16, '#fff7e8', '#68a4e6', '#e8e4cc', 0, 0.1],
    [18, '#ffdeb2', '#7896d6', '#ffc68c', 0, 0.85],
    [19.2, '#f4ae94', '#5868a8', '#ff8e6c', 0.18, 1],
    [20.2, '#8c84ba', '#283272', '#9c6a92', 0.62, 0.3],
    [21.5, '#4a5492', '#0c1238', '#2a3062', 0.95, 0],
    [24, '#3c4884', '#060a1e', '#1a2448', 1, 0],
  ];
  LB.HOURS = { dawn: 6.6, morning: 9, noon: 12.5, golden: 18.2, sunset: 19.3, dusk: 20.2, night: 23 };
  LB.sky = function (time, season, weather) {
    time = ((time % 24) + 24) % 24;
    let i = 0;
    while (i < KEYS.length - 2 && KEYS[i + 1][0] <= time) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const f = (time - a[0]) / (b[0] - a[0]);
    const L = {
      time,
      amb: LB.mix(a[1], b[1], f),
      skyTop: LB.mix(a[2], b[2], f),
      skyHor: LB.mix(a[3], b[3], f),
      night: LB.lerp(a[4], b[4], f),
      golden: LB.lerp(a[5], b[5], f),
    };
    // the sun: up 6:00–19:40, shadows fall toward the viewer, swinging left (morning) to right (evening)
    const p = clamp((time - 6) / 13.6, 0, 1);
    const elev = time > 6 && time < 19.6 ? Math.sin(Math.PI * p) : 0;
    L.sunElev = elev;
    L.sunP = p;
    if (elev > 0.02) {
      const len = clamp(0.42 / Math.max(elev, 0.11), 0.42, 3.4);
      const dx = (p - 0.5) * 2, dy = 0.62, n = Math.hypot(dx, dy);
      L.sun = { dx: (dx / n) * len, dy: (dy / n) * len, alpha: 0.34 * clamp(elev * 4, 0, 1), color: LB.mix('#3e3c78', '#6a3c62', L.golden) };
    } else {
      L.sun = { dx: 0.35, dy: 0.5, alpha: 0.2 * L.night, color: '#1c2250' }; // the moon
    }
    // season
    L.season = season;
    if (season === 'winter') { L.amb = LB.mix(L.amb, '#dde6ff', 0.14); }
    if (season === 'autumn') { L.amb = LB.mix(L.amb, '#ffe2b8', 0.08); }
    // weather
    L.weather = weather;
    if (weather === 'rain') {
      L.amb = LB.mix(L.amb, LB.mix('#9aa6b8', '#3a4468', L.night), 0.55);
      L.skyTop = LB.mix(L.skyTop, '#5a6478', 0.65); L.skyHor = LB.mix(L.skyHor, '#8a94a4', 0.65);
      L.sun.alpha *= 0.15; L.golden *= 0.25;
    } else if (weather === 'fog') {
      L.amb = LB.mix(L.amb, LB.mix('#c6ccd6', '#4a5470', L.night), 0.4);
      L.skyTop = LB.mix(L.skyTop, '#aab2c0', 0.6); L.skyHor = LB.mix(L.skyHor, '#d0d4da', 0.6);
      L.sun.alpha *= 0.3; L.golden *= 0.5;
    } else if (weather === 'snow') {
      L.amb = LB.mix(L.amb, LB.mix('#cfd8ec', '#4c5884', L.night), 0.35);
      L.skyTop = LB.mix(L.skyTop, '#a8b4cc', 0.6); L.skyHor = LB.mix(L.skyHor, '#dce2ee', 0.6);
      L.sun.alpha *= 0.35; L.golden *= 0.4;
    }
    L.day = 1 - L.night;
    return L;
  };

  // The grade: the ambient light over the finished frame. Uniform per-pixel colour maths, so pixel edges stay hard.
  LB.grade = function (ctx, S) {
    const L = S.L;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = L.amb;
    ctx.fillRect(0, 0, S.w, S.h);
    if (L.golden > 0.04) {
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = 0.24 * L.golden;
      ctx.fillStyle = '#ff9440';
      ctx.fillRect(0, 0, S.w, S.h);
    }
    if (L.night > 0.04) { // moonlight lifts the blacks a little
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.09 * L.night;
      ctx.fillStyle = '#2a4486';
      ctx.fillRect(0, 0, S.w, S.h);
    }
    ctx.restore();
  };

  // Light pools. Each light: {x, y, r, c, i, flicker, always, sq}. Lights come on with the dark unless `always`.
  // 'clean' finish: hard concentric steps; the others: a smooth falloff (and the bloom layer picks them up).
  LB.glows = function (ctx, S, lights, finish) {
    if (!lights || !lights.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const P = LB.paint(ctx);
    for (const l of lights) {
      const on = l.always ? 1 : LB.smooth(0.15, 0.7, S.L.night);
      let i = (l.i == null ? 1 : l.i) * on;
      if (i <= 0.02) continue;
      if (l.flicker) i *= 0.82 + 0.18 * LB.noise(S.t * 4 * l.flicker + l.x * 0.37, l.y * 0.21, 7);
      const c = LB.rgb(l.c || '#ffb054'), sq = l.sq || 1;
      if (finish === 'clean') {
        const steps = [[1, 0.06], [0.68, 0.08], [0.4, 0.11]];
        for (const [k, al] of steps) { ctx.globalAlpha = al * i; P.ellipse(l.x, l.y, l.r * k, l.r * k * sq, c); }
      } else {
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.translate(l.x, l.y); ctx.scale(1, sq);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, l.r);
        g.addColorStop(0, LB.css(c, 0.34 * i));
        g.addColorStop(0.35, LB.css(c, 0.15 * i));
        g.addColorStop(1, LB.css(c, 0));
        ctx.fillStyle = g;
        ctx.fillRect(-l.r, -l.r, l.r * 2, l.r * 2);
        ctx.restore();
      }
    }
    ctx.restore();
  };

  // Shadows: cast every standing thing into one layer, then lay it on the ground in one go — crisp pixel edges, and
  // two overlapping shadows don't double up. Use inside objects(): const sh = LB.shadows(S); sh.cast(spr, x, y);
  // sh.blob(cx, cy, rx, ry); sh.apply(ctx); then draw the sprites.
  LB.shadows = function (S) {
    const cv = LB.memo('shadowlayer:' + S.w + 'x' + S.h + ':' + S.id, () => LB.canvas(S.w, S.h));
    const c = LB.ctx2d(cv);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    c.clearRect(0, 0, S.w, S.h);
    const sun = S.L.sun;
    const api = {
      // spr: a sprite canvas; (x, y) where its anchor stands on the ground; ax, ay its anchor (default bottom-centre);
      // o.h: how far above the ground the sprite's bottom row is (a lifted canopy), o.k: shadow length scale
      cast(spr, x, y, ax, ay, o) {
        o = o || {};
        ax = ax == null ? Math.floor(spr.width / 2) : ax;
        ay = ay == null ? spr.height : ay;
        const k = o.k == null ? 1 : o.k, dx = sun.dx * k, dy = sun.dy * k;
        const lift = o.lift || 0;
        // sprite pixel (sx, sy) is at height (ay - sy + lift) above the ground → lands at x - ax + sx + dx*h, y + dy*h
        c.setTransform(1, 0, -dx, -dy, x - ax + dx * (ay + lift), y + dy * (ay + lift));
        c.drawImage(LB.silhouette(spr, '#000'), 0, 0);
        c.setTransform(1, 0, 0, 1, 0, 0);
      },
      // a shadow shape of your own, in ground coordinates
      blob(cx, cy, rx, ry) { LB.paint(c).ellipse(cx, cy, rx, ry, '#000'); },
      rect(x, y, w, h) { c.fillStyle = '#000'; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); },
      // a pole/trunk of height h standing at (x, y), width w
      pole(x, y, h, w) {
        const P = LB.paint(c);
        P.poly([[x - w / 2, y], [x + w / 2, y], [x + w / 2 + sun.dx * h, y + sun.dy * h], [x - w / 2 + sun.dx * h, y + sun.dy * h]], '#000');
      },
      ctx: c,
      apply(ctx, alpha) {
        // threshold to hard edges
        const id = c.getImageData(0, 0, S.w, S.h), d = id.data;
        for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= 100 ? 255 : 0;
        c.putImageData(id, 0, 0);
        c.globalCompositeOperation = 'source-in';
        c.fillStyle = sun.color; c.fillRect(0, 0, S.w, S.h);
        c.globalCompositeOperation = 'source-over';
        ctx.save();
        ctx.globalAlpha = alpha == null ? sun.alpha : alpha;
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(cv, 0, 0);
        ctx.restore();
      },
    };
    return api;
  };

  // Ambient occlusion-ish contact darkening round the foot of a thing (a soft ring, drawn on the ground).
  LB.contact = function (ctx, cx, cy, rx, ry, alpha) {
    const P = LB.paint(ctx);
    ctx.save(); ctx.globalAlpha = alpha == null ? 0.28 : alpha; ctx.globalCompositeOperation = 'multiply';
    P.ellipse(cx, cy, rx, ry, '#4a4468');
    ctx.restore();
  };

  // ---------- reflections & water ----------
  // Mirror a layer about a shoreline, column by column: what stands just above the shore at column x appears just
  // below it, upside down. shore: a number or fn(x) → y. Returns a new canvas (cache it with LB.memo / your own key).
  LB.mirror = function (src, shore, x0, x1) {
    const out = LB.canvas(src.width, src.height), c = LB.ctx2d(out);
    x0 = Math.max(0, x0 | 0); x1 = Math.min(src.width, x1 == null ? src.width : x1 | 0);
    for (let x = x0; x < x1; x++) {
      const s = Math.round(typeof shore === 'function' ? shore(x) : shore);
      if (s <= 0 || s >= src.height) continue;
      const len = Math.min(s, src.height - s);
      c.save();
      c.translate(0, 2 * s); c.scale(1, -1);
      c.drawImage(src, x, s - len, 1, len, x, s - len, 1, len);
      c.restore();
    }
    return out;
  };
  // Draw src through a mask with each row nudged sideways by a slow wave — the wobble of a reflection on moving water.
  // o: {amp (px), freq (per row), speed, alpha, y0, y1, composite, stretch}
  LB.ripple = function (ctx, src, mask, S, o) {
    o = o || {};
    const W = src.width, H = src.height;
    const tmp = LB.memo('ripple:' + W + 'x' + H + ':' + (o.slot || 0), () => LB.canvas(W, H));
    const tc = LB.ctx2d(tmp);
    tc.globalCompositeOperation = 'source-over'; tc.globalAlpha = 1;
    tc.clearRect(0, 0, W, H);
    const amp = o.amp == null ? 1.5 : o.amp, freq = o.freq == null ? 0.45 : o.freq, speed = o.speed == null ? 2.2 : o.speed;
    const y0 = o.y0 || 0, y1 = o.y1 == null ? H : o.y1;
    for (let y = y0; y < y1; y++) {
      const w = Math.sin(y * freq + S.t * speed) + 0.5 * Math.sin(y * freq * 2.7 - S.t * speed * 1.3);
      const off = Math.round(amp * w * (o.grow ? 0.4 + 0.6 * ((y - y0) / Math.max(1, y1 - y0)) : 1));
      tc.drawImage(src, 0, y, W, 1, off, y, W, 1);
    }
    if (mask) { tc.globalCompositeOperation = 'destination-in'; tc.drawImage(mask, 0, 0); }
    ctx.save();
    ctx.globalAlpha = o.alpha == null ? 0.6 : o.alpha;
    if (o.composite) ctx.globalCompositeOperation = o.composite;
    ctx.drawImage(tmp, 0, 0);
    ctx.restore();
  };
  // Random points inside a mask (opaque pixels) — for glints, rings, lily pads. Cached per mask+n+seed by caller.
  LB.maskPoints = function (mask, n, seed) {
    const w = mask.width, h = mask.height;
    const d = LB.ctx2d(mask).getImageData(0, 0, w, h).data;
    const r = LB.rng(seed || 3), pts = [];
    for (let tries = 0; pts.length < n && tries < n * 60; tries++) {
      const x = Math.floor(r() * w), y = Math.floor(r() * h);
      if (d[(y * w + x) * 4 + 3] > 128) pts.push([x, y, r()]);
    }
    return pts;
  };
  // Is (x, y) inside a mask? (reads a cached copy of the mask's pixels)
  const maskData = new WeakMap();
  LB.inMask = function (mask, x, y) {
    let d = maskData.get(mask);
    if (!d) { d = LB.ctx2d(mask).getImageData(0, 0, mask.width, mask.height).data; maskData.set(mask, d); }
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return false;
    return d[(y * mask.width + x) * 4 + 3] > 128;
  };
  // Glints: pixels on the water that wink on and off, brighter on the sun's side and at golden hour.
  LB.glints = function (ctx, pts, S, o) {
    o = o || {};
    const P = LB.paint(ctx);
    const c = o.color || (S.L.night > 0.5 ? '#c8d8ff' : LB.mix('#ffffff', '#ffd890', S.L.golden));
    const rate = o.rate || 1.3;
    for (const [x, y, ph] of pts) {
      const v = Math.sin(S.t * rate * (0.6 + ph) + ph * 40);
      if (v > 0.86) { P.px(x, y, c); if (v > 0.97 && o.big !== false) { P.px(x - 1, y, c); P.px(x + 1, y, c); } }
    }
  };
  // Rings: expanding ellipses at points (fish rising, raindrops). pts as from maskPoints.
  LB.rings = function (ctx, pts, S, o) {
    o = o || {};
    ctx.save();
    ctx.strokeStyle = o.color || 'rgba(230,240,255,0.55)';
    const period = o.period || 3, maxR = o.r || 6;
    const P = LB.paint(ctx);
    for (const [x, y, ph] of pts) {
      const k = ((S.t / period + ph) % 1);
      const r = Math.round(1 + k * maxR);
      ctx.globalAlpha = (1 - k) * (o.alpha || 0.7);
      // pixel ring: plot the ellipse outline
      const ry = Math.max(1, Math.round(r * 0.5));
      for (let a = 0; a < 40; a++) {
        const th = (a / 40) * Math.PI * 2;
        P.px(x + Math.round(Math.cos(th) * r), y + Math.round(Math.sin(th) * ry), o.color || '#e6f0ff');
      }
    }
    ctx.restore();
  };

  // ---------- sky over the land: cloud shadows, rain, snow, fog, light shafts ----------
  function cloudTex(w, h, seed) {
    return LB.memo('cloudtex:' + w + 'x' + h + ':' + seed, () => {
      const W = w * 2, cv = LB.canvas(W, h), c = LB.ctx2d(cv);
      const id = c.createImageData(W, h), d = id.data;
      const sc = 1 / 90, period = Math.round(W * sc);
      for (let y = 0; y < h; y++) for (let x = 0; x < W; x++) {
        const n = LB.fbm(x * sc, y * sc * 1.4, seed, 4, period);
        const i = (y * W + x) * 4;
        const a = n > 0.56 ? (n > 0.6 ? 255 : 150) : 0;
        d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = a;
      }
      c.putImageData(id, 0, 0);
      return cv;
    });
  }
  LB.cloudShadows = function (ctx, S, o) {
    o = o || {};
    const strength = (o.alpha == null ? 0.2 : o.alpha) * S.L.day * (S.weather === 'clear' ? 1 : 0.35);
    if (strength < 0.02) return;
    const tex = cloudTex(S.w, S.h, o.seed || 5);
    const W = tex.width;
    const off = Math.round(((S.t * (o.speed || 3)) % W + W) % W);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = strength;
    const sil = LB.silhouette(tex, '#4c5480');
    ctx.drawImage(sil, -off, 0); ctx.drawImage(sil, W - off, 0);
    ctx.restore();
  };
  function fogTex(w, h, seed) {
    return LB.memo('fogtex:' + w + 'x' + h + ':' + seed, () => {
      const W = w * 2, cv = LB.canvas(W, h), c = LB.ctx2d(cv);
      const id = c.createImageData(W, h), d = id.data;
      const sc = 1 / 70, period = Math.round(W * sc);
      for (let y = 0; y < h; y++) for (let x = 0; x < W; x++) {
        const n = LB.fbm(x * sc, y * sc * 2.2, seed, 4, period);
        const i = (y * W + x) * 4;
        const v = LB.smooth(0.38, 0.75, n);
        // stepped alpha so it reads as pixel art, not airbrush
        const a = Math.round(v * 4) / 4;
        d[i] = 236; d[i + 1] = 240; d[i + 2] = 246; d[i + 3] = a * 255;
      }
      c.putImageData(id, 0, 0);
      return cv;
    });
  }
  LB.fog = function (ctx, S, alpha) {
    const tex = fogTex(S.w, S.h, 11), W = tex.width;
    ctx.save();
    ctx.globalAlpha = alpha == null ? 0.55 : alpha;
    const off = Math.round(((S.t * 4) % W + W) % W);
    ctx.drawImage(tex, -off, 0); ctx.drawImage(tex, W - off, 0);
    ctx.globalAlpha *= 0.6;
    const off2 = Math.round(((S.t * 7 + 300) % W + W) % W);
    ctx.drawImage(tex, -off2, 9); ctx.drawImage(tex, W - off2, 9);
    ctx.restore();
  };
  LB.weatherFx = function (ctx, S, o) {
    o = o || {};
    const P = LB.paint(ctx), W = S.w, H = S.h, t = S.t;
    if (S.weather === 'rain') {
      const n = Math.round((W * H) / 700);
      ctx.save();
      for (let i = 0; i < n; i++) {
        const h1 = LB.hash(i, 1, 99), h2 = LB.hash(i, 2, 99), h3 = LB.hash(i, 3, 99);
        const sp = 260 + h3 * 120;
        const y = ((h2 * (H + 40) + t * sp) % (H + 40)) - 20;
        const x = ((h1 * (W + 40) - t * sp * 0.22) % (W + 40) + (W + 40)) % (W + 40) - 20;
        ctx.globalAlpha = 0.35 + h3 * 0.3;
        P.line(x, y, x - 1, y + 5, '#c4d2e8');
      }
      // splashes on the ground
      const m = Math.round((W * H) / 2600);
      for (let i = 0; i < m; i++) {
        const k = ((t * 3 + LB.hash(i, 5, 98)) % 1);
        if (k > 0.3) continue;
        const x = Math.floor(LB.hash(i, Math.floor(t * 3 + LB.hash(i, 5, 98)), 97) * W), y = Math.floor(LB.hash(i, Math.floor(t * 3 + LB.hash(i, 5, 98)), 96) * H);
        if (o.mask && !LB.inMask(o.mask, x, y)) continue;
        ctx.globalAlpha = 0.6;
        P.px(x - 1, y, '#dde6f4'); P.px(x + 1, y, '#dde6f4'); P.px(x, y - 1, '#dde6f4');
      }
      ctx.restore();
    } else if (S.weather === 'snow') {
      const n = Math.round((W * H) / 900);
      for (let i = 0; i < n; i++) {
        const h1 = LB.hash(i, 1, 77), h2 = LB.hash(i, 2, 77), h3 = LB.hash(i, 3, 77);
        const sp = 14 + h3 * 16;
        const y = (h2 * (H + 10) + t * sp) % (H + 10) - 5;
        const x = ((h1 * W + Math.sin(t * 0.9 + i) * 5 + t * 6) % W + W) % W;
        const c = h3 > 0.5 ? '#ffffff' : '#dfe8f8';
        P.px(x, y, c);
        if (h3 > 0.82) { P.px(x + 1, y, c); P.px(x, y + 1, c); P.px(x + 1, y + 1, c); }
      }
    } else if (S.weather === 'fog') {
      LB.fog(ctx, S, o.fogAlpha);
    }
  };
  // Light shafts slanting down through the scene (forests, windows, HD-2D). Draw after the grade.
  LB.rays = function (ctx, S, o) {
    o = o || {};
    const strength = (o.alpha == null ? 0.12 : o.alpha) * (o.night ? 1 : S.L.day) * (S.weather === 'clear' ? 1 : 0.3);
    if (strength < 0.01) return;
    const n = o.n || 5, ang = o.angle == null ? 0.55 : o.angle, wid = o.width || 26;
    const c = o.color || LB.mix('#fff2c8', '#ffb070', S.L.golden);
    const P = LB.paint(ctx);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const base = (o.x0 == null ? -40 : o.x0) + i * ((o.spacing || (S.w + 80) / n)) + LB.hash(i, 0, 31) * 30;
      const w = wid * (0.5 + LB.hash(i, 1, 31));
      const a = strength * (0.55 + 0.45 * Math.sin(S.t * 0.35 + i * 1.7));
      const len = o.len || S.h;
      ctx.globalAlpha = a;
      P.poly([[base, o.y0 || 0], [base + w, o.y0 || 0], [base + w + len * ang, (o.y0 || 0) + len], [base + len * ang, (o.y0 || 0) + len]], c);
      ctx.globalAlpha = a * 0.7;
      P.poly([[base + w * 0.3, o.y0 || 0], [base + w * 0.7, o.y0 || 0], [base + w * 0.7 + len * ang, (o.y0 || 0) + len], [base + w * 0.3 + len * ang, (o.y0 || 0) + len]], c);
    }
    ctx.restore();
  };
  // Drifting motes: fireflies at night, pollen/dust by day, petals in spring, leaves in autumn.
  LB.motes = function (ctx, S, o) {
    o = o || {};
    const P = LB.paint(ctx), n = o.n || 20, x0 = o.x || 0, y0 = o.y || 0, w = o.w || S.w, h = o.h || S.h;
    for (let i = 0; i < n; i++) {
      const s = (o.seed || 1) * 1000 + i;
      const hx = LB.hash(s, 1, 5), hy = LB.hash(s, 2, 5), hp = LB.hash(s, 3, 5);
      let x, y;
      if (o.fall) { // leaves and petals drift down and across
        const sp = o.fall * (0.6 + hp * 0.8);
        y = y0 + ((hy * h + S.t * sp) % h);
        x = x0 + (((hx * w + S.t * sp * 0.5 + Math.sin(S.t * 1.3 + i) * 6) % w) + w) % w;
      } else { // hovering, wandering
        x = x0 + hx * w + Math.sin(S.t * 0.4 * (0.5 + hp) + i) * 10;
        y = y0 + hy * h + Math.sin(S.t * 0.55 * (0.5 + hp) + i * 2.1) * 6;
      }
      const blink = o.blink ? (Math.sin(S.t * 1.7 * (0.6 + hp) + i * 3) + 1) / 2 : 1;
      if (blink < 0.25) continue;
      const cols = o.colors || ['#fff6b0'];
      const c = cols[i % cols.length];
      ctx.save(); ctx.globalAlpha = o.blink ? blink : 1;
      P.px(x, y, c);
      if (o.size === 2 || (o.fall && hp > 0.5)) P.px(x + 1, y, c);
      ctx.restore();
    }
  };

  // ---------- people ----------
  // LB.person(ctx, x, y, look, o) draws a character standing with their feet at (x, y). The people module replaces this
  // placeholder. o: {dir: 'down'|'up'|'left'|'right', walk: bool, t: seconds, seed, sit}.
  // Looks every scene may use: farmer, farmer-f, fisher, sailor, baker, elf, elf-bard, skier, mountaineer, cyber, cyber-b,
  // pilot, child, elder, merchant, guard.
  LB.person = LB.person || function (ctx, x, y, look, o) {
    const P = LB.paint(ctx);
    const r = LB.rng(look.length * 31 + ((o && o.seed) || 0));
    const shirt = LB.hsl(r() * 360, 0.45, 0.45), skin = '#e8b48a';
    const bob = o && o.walk ? Math.round(Math.abs(Math.sin((o.t || 0) * 8))) : 0;
    P.rect(x - 7, y - 26 - bob, 14, 16, shirt); P.rect(x - 6, y - 10, 5, 10, '#3a3450'); P.rect(x + 1, y - 10, 5, 10, '#3a3450');
    P.disc(x, y - 33 - bob, 7, skin); P.rect(x - 7, y - 41 - bob, 14, 5, '#5a3a24');
  };
})();
