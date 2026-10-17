// Look Book 2: the people. The game's 3D chibi models, rendered in Blender at the scenes' 45° (chars/chibi_chars.py),
// in three variants: 'today' (as the game has them), 'faces' (the same shapes with painted Stardew-style faces) and
// 'round' (faces, rounder heads and softer forms, a fringe). Sheets: sprites/<variant>/<name>-<32|48>.png — rows down,
// right, up, left; columns idle 0–3 (idle3 is a blink in the painted variants), walk 0–7; the feet at (16, 45) of each
// 32 × 48 frame (× 1.5 at 48 px a tile). 'game' is the game's own sheets (32 px only).
//   LB.chibi(ctx, x, y, name, {dir, walk, t, variant, scale, seed, shadow, sun})   feet at (x, y)
//   LB.chibi.ready(names, variant, scale) → Promise (draws nothing until a sheet has loaded)
(function () {
  'use strict';
  const LB = window.LB;
  const ROW = { down: 0, right: 1, up: 2, left: 3 };
  const sheets = new Map();
  const NAMES = ['pilot', 'farmer', 'baker', 'fisher', 'elf', 'skier', 'cyber', 'sailor', 'dockhand'];

  function sheet(name, variant, px) {
    const key = variant + '/' + name + '-' + px;
    let s = sheets.get(key);
    if (!s) {
      s = { img: new Image(), ok: false, frames: new Map() };
      s.done = new Promise((res) => {
        s.img.onload = () => { s.ok = true; res(true); };
        s.img.onerror = () => res(false);
      });
      s.img.src = 'sprites/' + key + '.png';
      sheets.set(key, s);
    }
    return s;
  }
  // one frame as its own canvas (for the sun's shadow, which needs the frame's silhouette)
  function frame(s, col, row, fw, fh) {
    const k = col + row * 12;
    let c = s.frames.get(k);
    if (!c) {
      c = LB.canvas(fw, fh);
      LB.ctx2d(c).drawImage(s.img, col * fw, row * fh, fw, fh, 0, 0, fw, fh);
      s.frames.set(k, c);
    }
    return c;
  }

  const chibi = function (ctx, x, y, name, o) {
    o = o || {};
    const variant = o.variant || (LB.state && LB.state.chibi) || chibi.defaultVariant;
    const scale = o.scale && o.scale > 1.2 ? 1.5 : 1;
    const px = variant === 'game' ? 32 : scale > 1 ? 48 : 32;
    const s = sheet(name, variant, px);
    if (!s.ok) return false;
    const fw = px, fh = px * 1.5, ox = px / 2, oy = Math.round(px * 45 / 32);
    const t = o.t || 0, seed = o.seed || 0;
    const row = ROW[o.dir] != null ? ROW[o.dir] : 0;
    let col;
    if (o.walk) col = 4 + (Math.floor(t * 9 + seed * 3) % 8);
    else {
      // breathing 0-1-2-1, and in the painted variants a blink now and then (idle3)
      col = [0, 1, 2, 1][Math.floor(t * 2.6 + seed) % 4];
      if (variant !== 'today' && variant !== 'game' && ((t + seed * 1.37) % 3.9) < 0.14) col = 3;
    }
    const k = (variant === 'game' && scale > 1) ? 1.5 : 1;       // the game's sheets at 48 px: scaled (for comparison only)
    const X = Math.round(x - ox * k), Y = Math.round(y - oy * k);
    // shadows: a soft contact spot under the feet, and (o.sun = S.L.sun) the sun's, cast along the ground
    if (o.shadow !== false) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.32;
      LB.paint(ctx).ellipse(x, y - 0.5, Math.round(px * 0.27), Math.max(1, Math.round(px * 0.07)), '#3a3858');
      ctx.restore();
      const sun = o.sun;
      if (sun && sun.alpha > 0.02) {
        const f = frame(s, col, row, fw, fh);
        const ay = oy, dx = sun.dx * 0.9, dy = sun.dy * 0.9;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = sun.alpha * 0.8;
        ctx.setTransform(k, 0, -dx * k, -dy * k, X + dx * ay * k, y + dy * ay * k - (oy - ay) * k);
        ctx.drawImage(LB.silhouette(f, sun.color || '#3e3c78'), 0, 0);
        ctx.restore();
      }
    }
    // in a relit scene, people take the hour's light (chibi.light, set by relight.js): dusk warm, night blue and dim
    const L = chibi.light;
    if (L && (L[0] < 0.97 || L[1] < 0.97 || L[2] < 0.97)) {
      const f = frame(s, col, row, fw, fh), key = L.map((v) => Math.round(Math.min(1, v) * 24)).join(',');
      f._lit = f._lit || {};
      if (!f._lit[key]) {
        const c = LB.canvas(f.width, f.height), x2 = LB.ctx2d(c);
        x2.drawImage(f, 0, 0);
        x2.globalCompositeOperation = 'multiply';
        x2.fillStyle = LB.css([Math.min(1, L[0]) * 255, Math.min(1, L[1]) * 255, Math.min(1, L[2]) * 255]);
        x2.fillRect(0, 0, c.width, c.height);
        x2.globalCompositeOperation = 'destination-in';
        x2.drawImage(f, 0, 0);
        f._lit[key] = c;
      }
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(f._lit[key], X, Y, fw * k, fh * k); ctx.restore();
      return true;
    }
    if (k === 1) ctx.drawImage(s.img, col * fw, row * fh, fw, fh, X, Y, fw, fh);
    else { ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(s.img, col * fw, row * fh, fw, fh, X, Y, fw * k, fh * k); ctx.restore(); }
    return true;
  };
  chibi.defaultVariant = 'round';
  chibi.NAMES = NAMES;
  chibi.VARIANTS = ['today', 'faces', 'round'];
  chibi.ready = function (names, variant, scale) {
    variant = variant || (LB.state && LB.state.chibi) || chibi.defaultVariant;
    const px = variant === 'game' ? 32 : scale > 1.2 ? 48 : 32;
    return Promise.all((names || NAMES).map((n) => sheet(n, variant, px).done));
  };
  chibi.loaded = function (names, variant, scale) {
    variant = variant || (LB.state && LB.state.chibi) || chibi.defaultVariant;
    const px = variant === 'game' ? 32 : scale > 1.2 ? 48 : 32;
    return (names || NAMES).every((n) => sheet(n, variant, px).ok);
  };
  LB.chibi = chibi;
})();
