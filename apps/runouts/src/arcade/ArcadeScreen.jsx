import React, { useEffect, useRef, useState } from "react";
import { W, H, FX, loadRoom } from "./kit.js";
import { SCREENS } from "./modes/index.js";

// The game screen: a 480 × 270 pixel canvas scaled by a whole number of device pixels, drawn every frame by
// the mode's screen (./modes) from the result, the reveal step and the time since it changed. Each player keeps
// one colour and one pilot across every game (by their place in `names`).
export function hasScreen(modeId, draft) {
  const scr = SCREENS[modeId];
  return !!scr && (!draft || !!scr.drafts);
}

export default function ArcadeScreen({ result, step, done, totalSteps, names, interactiveBombState, live, helpers }) {
  const wrap = useRef(null);
  const cv = useRef(null);
  const st = useRef(null);
  const props = useRef({});
  const lastRef = useRef(null);
  const [button, setButton] = useState(null);       // a screen's own control (LAUNCH, LIGHT THE FUSE)
  props.current = { result, step, done, totalSteps, names, bomb: interactiveBombState, live, helpers };

  useEffect(() => {
    loadRoom();
    const c = cv.current, ctx = c.getContext("2d");
    c.width = W; c.height = H;
    ctx.imageSmoothingEnabled = false;
    let raf = 0, last = performance.now();
    const start = last;
    st.current = { fx: new FX(), mem: {}, result: null, step: -1, stepAt: start, prev: 0, doneAt: 0, done: false };

    function fit() {
      const el = wrap.current;
      if (!el) return;
      const dpr = window.devicePixelRatio || 1, avail = el.clientWidth * dpr;
      const maxH = (window.innerHeight * 0.7) * dpr;
      const kf = Math.min(avail / W, maxH / H);
      // a whole number of device pixels when there's room for 2× or more; below that, as big as fits
      const k = kf >= 2 ? Math.floor(kf) : Math.max(0.5, kf);
      c.style.width = (W * k) / dpr + "px";
      c.style.height = (H * k) / dpr + "px";
    }
    fit();
    window.addEventListener("resize", fit);

    function frame(now) {
      raf = requestAnimationFrame(frame);
      const p = props.current, s = st.current, dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const r = p.result;
      if (!r) return;
      const scr = SCREENS[r.modeId];
      if (!scr) return;
      if (s.result !== r) {                                          // a new game (or round): start clean
        s.result = r; s.mem = {}; s.fx = new FX(); s.step = -1; s.done = false; s.doneAt = 0;
      }
      if (p.step !== s.step) { s.prev = Math.max(0, s.step); s.step = p.step; s.stepAt = now; }
      if (p.done && !s.done) { s.done = true; s.doneAt = now; }
      if (!p.done) s.done = false;
      const order = (p.names && p.names.length ? p.names : (r.players || []).map((q) => q.name));
      const index = (name) => { const i = order.indexOf(name); return i < 0 ? 0 : i; };
      const state = {
        W, H, t: (now - start) / 1000, dt, now, result: r, step: p.step, prev: s.prev, stepT: (now - s.stepAt) / 1000,
        done: !!p.done, doneT: s.doneAt ? (now - s.doneAt) / 1000 : 0, total: p.totalSteps || 1, fx: s.fx, mem: s.mem,
        index, names: order, bomb: p.bomb, live: p.live || {}, goal: r.selectionGoal || "loser", helpers: p.helpers,
      };
      lastRef.current = { state, scr };
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.imageSmoothingEnabled = false;
      try { scr.draw(ctx, state); } catch (e) { if (!s.err) { s.err = 1; console.error("runouts screen", r.modeId, e); } }
      s.fx.update(dt);
      s.fx.draw(ctx);
      const b = scr.button ? scr.button(state) : null;
      if (b !== s.button) { s.button = b; setButton(b); }
    }
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", fit); };
  }, []);

  const r = result || {};
  return (
    <div ref={wrap} className="arcade-screen-wrap">
      <div className="arcade-bezel">
        <canvas ref={cv} className="arcade-screen" aria-label={`${r.modeName || "Game"}: ${done ? r.headline || "" : "in play"}`} />
        <div className="arcade-scan" aria-hidden="true" />
        {button ? (
          <button type="button" className="arcade-screen-btn"
                  onClick={() => { const l = lastRef.current; if (l && l.scr.press) l.scr.press({ ...l.state, now: performance.now() }); }}>
            {button}
          </button>
        ) : null}
      </div>
    </div>
  );
}
