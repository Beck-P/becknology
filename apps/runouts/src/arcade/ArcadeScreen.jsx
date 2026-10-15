import React, { useEffect, useRef, useState } from "react";
import { W, H, FX, PAL, PCOL, loadRoom, pilot, text, clamp, ease } from "./kit.js";
import { SCREENS } from "./modes/index.js";

// The game screen: a 480 × 270 pixel canvas scaled by a whole number of device pixels, drawn every frame by
// the mode's screen (./modes) from the result, the reveal step and the time since it changed. Each player keeps
// one colour and one pilot across every game (by their place in `names`).
export function hasScreen(modeId, draft) {
  const scr = SCREENS[modeId];
  return !!scr && (!draft || !!scr.drafts);
}

/** Two players: the game opens on a face-off, each pilot sliding in on a band of their colour, VS between them. */
const VS_T = 2.1;
function faceOff(ctx, s, a, b, ia, ib, stake) {
  const u = s.vsT, inn = ease.out(clamp(u / 0.45, 0, 1)), out = ease.in(clamp((u - (VS_T - 0.4)) / 0.4, 0, 1));
  const slide = (1 - inn) * W * 0.6 + out * W * 0.6;
  ctx.fillStyle = `rgba(6,3,15,${0.78 * (1 - out)})`; ctx.fillRect(0, 0, W, H);
  // the bands, slanted toward the middle
  const band = (x0, dir, col) => {
    ctx.fillStyle = col;
    for (let y = 70; y < 200; y++) { const lean = Math.round((y - 70) * 0.25) * dir; ctx.fillRect(Math.round(x0 + lean), y, W / 2 - 20, 1); }
  };
  band(-slide - 10, 1, PCOL[ia % PCOL.length] + "55");
  band(W / 2 + 30 + slide, -1, PCOL[ib % PCOL.length] + "55");
  // the pilots at twice the size, facing each other
  const drawP = (i, x, facing) => { ctx.save(); ctx.translate(Math.round(x), 168); ctx.scale(2, 2); pilot(ctx, i, 0, 0, facing, "idle", s.t); ctx.restore(); };
  drawP(ia, 120 - slide, "right");
  drawP(ib, W - 120 + slide, "left");
  text(ctx, a, 120 - slide, 176, PCOL[ia % PCOL.length], { align: "center", scale: 2, shadow: PAL.ink, max: 9 });
  text(ctx, b, W - 120 + slide, 176, PCOL[ib % PCOL.length], { align: "center", scale: 2, shadow: PAL.ink, max: 9 });
  // VS, slammed down once the two are in
  const v = clamp((u - 0.35) / 0.2, 0, 1);
  if (v > 0 && out < 1) {
    const k = 4 + Math.round((1 - v) * 4), shake = u < 0.75 ? Math.round(Math.sin(u * 80) * 2) : 0;
    ctx.globalAlpha = 1 - out;
    text(ctx, "VS", W / 2 + shake, 112 - k * 3, PAL.gold, { align: "center", scale: k, shadow: PAL.ink });
    if (stake) text(ctx, "FOR " + stake, W / 2, 218, PAL.white, { align: "center", shadow: PAL.ink, max: 60 });
    ctx.globalAlpha = 1;
  }
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
      // a duel opens on a face-off (once a game: not again when its draft turns into the game itself)
      const pl = r.players || [];
      const key = (r.runId || "") + "|" + pl.map((q) => q.name).join(",");
      if (pl.length === 2 && !p.done && p.step === 0 && s.vsKey !== key && !r.isTournament) { s.vsKey = key; s.vsAt = now; }
      if (s.vsAt && s.vsKey === key) {
        const vsT = (now - s.vsAt) / 1000;
        if (vsT < VS_T) faceOff(ctx, { ...state, vsT }, pl[0].name, pl[1].name, index(pl[0].name), index(pl[1].name),
                               String(r.taskLabel || "").trim().toUpperCase().slice(0, 40));
      }
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
