// The table's screen: a native pixel canvas that fills its box at a whole number of device pixels per pixel (like
// the Bridge's world). Each frame the table's draw(ctx, f) paints it and registers what can be touched
// (f.hit(id, x, y, w, h, data)); taps go to onHit(id, data, { alt }) — alt is a right-click or a long press.
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

const Stage = forwardRef(function Stage({ draw, onHit, target = { land: [400, 220], port: [220, 330] }, className = '' }, ref) {
  const wrap = useRef(null), cv = useRef(null);
  const S = useRef({ W: 0, H: 0, S: 1, dpr: 1, hits: [], hover: null, px: -1, py: -1, down: null, last: performance.now(), t0: performance.now() });
  const drawRef = useRef(draw), hitRef = useRef(onHit), targetRef = useRef(target);
  drawRef.current = draw; hitRef.current = onHit; targetRef.current = target;

  function toNative(cx, cy) {
    const r = cv.current.getBoundingClientRect(), s = S.current;
    return [((cx - r.left) / r.width) * s.W, ((cy - r.top) / r.height) * s.H];
  }
  function hitAt(x, y) {
    const hs = S.current.hits;
    for (let i = hs.length - 1; i >= 0; i--) {
      const h = hs[i];
      if (h.round) { const rx = h.w / 2, ry = h.h / 2, dx = (x - h.x - rx) / rx, dy = (y - h.y - ry) / ry; if (dx * dx + dy * dy <= 1) return h; continue; }
      if (x >= h.x && x < h.x + h.w && y >= h.y && y < h.y + h.h) return h;
    }
    return null;
  }
  useImperativeHandle(ref, () => ({
    toNative,
    hitAtClient: (cx, cy) => { const [x, y] = toNative(cx, cy); return hitAt(x, y); },
    size: () => ({ W: S.current.W, H: S.current.H, S: S.current.S / S.current.dpr }),
    canvas: () => cv.current,
  }));

  useEffect(() => {
    const fit = () => {
      const el = wrap.current, c = cv.current;
      if (!el || !c) return;
      const dpr = window.devicePixelRatio || 1, cw = el.clientWidth, ch = el.clientHeight;
      if (!cw || !ch) return;
      const dw = Math.round(cw * dpr), dh = Math.round(ch * dpr);
      const port = ch > cw * 1.05;
      const [tw, th] = port ? targetRef.current.port : targetRef.current.land;
      const sc = Math.max(1, Math.floor(Math.min(dw / tw, dh / th) + 0.3));
      const W = Math.floor(dw / sc), H = Math.floor(dh / sc);
      const s = S.current;
      if (s.W === W && s.H === H && s.S === sc && s.dpr === dpr) return;
      Object.assign(s, { W, H, S: sc, dpr });
      c.width = W; c.height = H;
      c.style.width = (W * sc) / dpr + 'px';
      c.style.height = (H * sc) / dpr + 'px';
      el.style.setProperty('--px', (sc / dpr) + 'px');
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap.current);
    window.addEventListener('resize', fit);
    let raf = 0;
    const loop = (ts) => {
      raf = requestAnimationFrame(loop);
      fit();
      const s = S.current, c = cv.current;
      if (!c || !s.W) return;
      const dt = Math.max(0, Math.min(0.1, (ts - s.last) / 1000));
      s.last = ts;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      const hits = [];
      const f = {
        W: s.W, H: s.H, dt, t: Math.max(0, (ts - s.t0) / 1000), now: Date.now(), hover: s.hover, px: s.px, py: s.py,
        hit: (id, x, y, w, h, data, round) => hits.push({ id, x, y, w, h, data, round }),
      };
      try { drawRef.current && drawRef.current(ctx, f); } catch (e) { console.error(e); }
      s.hits = hits;
      const h = s.px >= 0 ? hitAt(s.px, s.py) : null;
      const id = h ? h.id : null;
      if (id !== s.hover) { s.hover = id; c.style.cursor = h && hitRef.current ? 'pointer' : 'default'; }
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('resize', fit); };
  }, []);

  const pt = (e) => { const [x, y] = toNative(e.clientX, e.clientY); S.current.px = x; S.current.py = y; return [x, y]; };
  const onDown = (e) => {
    const [x, y] = pt(e);
    const h = hitAt(x, y);
    const s = S.current;
    s.down = h ? { id: h.id, at: performance.now(), x: e.clientX, y: e.clientY } : null;
    clearTimeout(s.long);
    if (h && e.pointerType === 'touch') s.long = setTimeout(() => { if (s.down && s.down.id === h.id) { s.down.used = true; hitRef.current && hitRef.current(h.id, h.data, { alt: true }); } }, 520);
  };
  const onUp = (e) => {
    const [x, y] = pt(e);
    const s = S.current, d = s.down;
    clearTimeout(s.long);
    s.down = null;
    if (!d || d.used) return;
    const h = hitAt(x, y);
    if (h && h.id === d.id && hitRef.current) hitRef.current(h.id, h.data, { alt: e.button === 2 });
    if (e.pointerType === 'touch') { s.px = -1; s.py = -1; }
  };
  return (
    <div className={'stage ' + className} ref={wrap}>
      <canvas ref={cv} onPointerMove={pt} onPointerDown={onDown} onPointerUp={onUp}
        onPointerLeave={() => { S.current.px = -1; S.current.py = -1; clearTimeout(S.current.long); }}
        onContextMenu={(e) => e.preventDefault()} />
    </div>
  );
});
export default Stage;
