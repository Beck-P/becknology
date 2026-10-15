// Picking a game by walking the Runout Room: the whole room on screen, the players' pilots drifting between the
// tables and cabinets, and every game where it stands — point at one to light it up, click to play it. The card
// table holds three games (hold'em, PLO, high card), so it asks which; the machine in the corner is RANDOM.
import React, { useEffect, useRef, useState } from "react";
import { PAL, PCOL, loadRoom, roomPx, station, roomReady, pilot, tag, text } from "./kit.js";

// where a pilot stands to play each game (tiles: x, row) and what faces the game from there; every spot reaches the
// aisle in front of the wall cabinets (row AISLE) by walking straight up, so walks never cut through a table
const AISLE = 4.6;
const SPOTS = {
  slots: [2.4, 4.4, "up"], wheel: [6.4, 4.3, "up"], rng: [10.0, 4.3, "up"], "stock-market": [15.0, 4.1, "up"],
  "horse-race": [20.9, 4.6, "up"], plinko: [25.7, 4.4, "up"], "space-invaders": [29.0, 4.4, "up"], rocket: [30.2, 4.4, "up"],
  holdem: [17.0, 5.9, "down"], "coin-flips": [5.0, 5.5, "down"], "black-marble": [10.1, 6.5, "left"], dice: [7.0, 9.6, "down"],
  bomb: [23.6, 9.4, "down"], "battle-royale": [29.4, 7.6, "down"], random: [30.9, 11.6, "right"],
};
const TABLE_GAMES = ["holdem", "plo", "high-card"];
const COLOURS = {
  random: "#f8d048", holdem: "#4a80f0", plo: "#9a7aff", rng: "#40d070", wheel: "#f08a30", dice: "#e84040", "high-card": "#b8b4cc",
  "coin-flips": "#f8d048", "black-marble": "#8a84a8", slots: "#f078a8", "horse-race": "#c08a50", rocket: "#5cc8d0",
  "space-invaders": "#40d070", bomb: "#f08a30", plinko: "#5cc8d0", "battle-royale": "#e84040", "stock-market": "#40d070",
};
const SPEED = 2.2;                                                     // tiles a second

/** A path from one spot to another: up to the aisle, along it, down to the other spot. */
function route(a, b) {
  if (Math.abs(a[0] - b[0]) < 0.05) return [[b[0], b[1]]];
  return [[a[0], AISLE], [b[0], AISLE], [b[0], b[1]]];
}

export default function RoomPicker({ names, modes, onPick, disabled, disabledReason }) {
  const wrap = useRef(null);
  const cv = useRef(null);
  const live = useRef({ hover: null, chosen: null, names: [], disabled: false });
  const [hover, setHover] = useState(null);                           // the game pointed at (for the bar under the room)
  const [tableOpen, setTableOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const meta = (id) => modes.find((m) => m.id === id) || (id === "random" ? { id, name: "Random", blurb: "The machine picks the game." } : null);
  live.current.names = names;
  live.current.disabled = disabled;

  useEffect(() => {
    const room = loadRoom();
    const c = cv.current, ctx = c.getContext("2d");
    let raf = 0, last = performance.now(), sized = false;
    const start = last;
    const walkers = [];                                                // one per player
    const ids = Object.keys(SPOTS);
    const roomCam = { x: 0, y: 0 };

    function size() {
      if (!room.meta || sized) return;
      c.width = room.meta.width; c.height = room.meta.height;
      ctx.imageSmoothingEnabled = false;
      sized = true;
      setReady(true);
    }
    function sync(t) {
      const list = (live.current.names || []).filter((n) => n && n.trim());
      while (walkers.length < list.length) {
        const k = walkers.length, at = ids[(k * 5 + 2) % ids.length], s = SPOTS[at];
        walkers.push({ x: s[0] + (k % 2 ? 0.35 : -0.35), r: s[1], at, path: [], facing: s[2], next: t + 2 + k * 1.7 });
      }
      walkers.length = list.length;
      return list;
    }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000), t = (now - start) / 1000;
      last = now;
      size();
      if (!sized || !room.show.ready) return;
      const list = sync(t);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(room.show.img, 0, 0);
      // the game pointed at: lit up, with corner brackets in its colour
      const h = live.current.hover, r = h ? station(h === "holdem" ? "holdem" : h) : null;
      if (r) {
        const [x0, y0] = roomPx(r[0] - 0.15, r[1] - 0.15), [x1, y1] = roomPx(r[2] + 0.15, r[3] + 0.15);
        const X0 = Math.round(x0), Y0 = Math.round(y0), w = Math.round(x1 - x0), hh = Math.round(y1 - y0);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.16 + 0.06 * Math.sin(t * 5);
        ctx.drawImage(room.show.img, X0, Y0, w, hh, X0, Y0, w, hh);
        ctx.restore();
        const col = COLOURS[h] || PAL.gold, L = 8;
        ctx.fillStyle = col;
        for (const [cx, cy, sx, sy] of [[X0, Y0, 1, 1], [X0 + w, Y0, -1, 1], [X0, Y0 + hh, 1, -1], [X0 + w, Y0 + hh, -1, -1]]) {
          ctx.fillRect(sx > 0 ? cx : cx - L, sy > 0 ? cy : cy - 2, L, 2);
          ctx.fillRect(sx > 0 ? cx : cx - 2, sy > 0 ? cy : cy - L, 2, L);
        }
      }
      // the players drifting from game to game
      walkers.forEach((w, k) => {
        if (!w.path.length && t > w.next) {
          let to = ids[Math.floor(Math.random() * ids.length)];
          if (to === w.at) to = ids[(ids.indexOf(to) + 3) % ids.length];
          const s = SPOTS[to], off = (k % 3) * 0.3 - 0.3;
          w.path = route([w.x, w.r], [s[0] + off, s[1]]); w.at = to; w.end = s[2];
        }
        if (w.path.length) {
          const [tx, tr] = w.path[0], dx = tx - w.x, dr = tr - w.r, d = Math.hypot(dx, dr), step = SPEED * dt;
          w.facing = Math.abs(dx) > Math.abs(dr) ? (dx > 0 ? "right" : "left") : dr > 0 ? "down" : "up";
          if (d <= step) { w.x = tx; w.r = tr; w.path.shift(); if (!w.path.length) { w.facing = w.end; w.next = t + 4 + Math.random() * 6; } }
          else { w.x += (dx / d) * step; w.r += (dr / d) * step; }
        }
      });
      const order = walkers.map((w, k) => ({ w, k })).sort((a, b) => a.w.r - b.w.r);
      for (const { w, k } of order) {
        const [x, y] = roomPx(w.x, w.r);
        pilot(ctx, k, x, y, w.facing, w.path.length ? "walk" : "idle", t, { footRow: w.r, cam: roomCam });
      }
      for (const { w, k } of order) {
        const [x, y] = roomPx(w.x, w.r);
        tag(ctx, list[k] || "", x, y + 3, PCOL[k % PCOL.length], { max: 8 });
      }
      // the name of the game pointed at, over it
      if (r) {
        const [cx] = roomPx((r[0] + r[2]) / 2, r[1]), [, ty] = roomPx(r[0], r[1] - 0.2);
        const m = h === "holdem" ? { name: "Card table" } : meta(h);
        if (m) {
          const label = String(m.name).replace(/[’']/g, "'").toUpperCase();
          const wpx = label.length * 6 + 10, y = Math.max(2, Math.round(ty) - 14);
          ctx.fillStyle = "rgba(8,4,24,0.92)"; ctx.fillRect(Math.round(cx - wpx / 2), y, wpx, 13);
          ctx.fillStyle = COLOURS[h] || PAL.gold; ctx.fillRect(Math.round(cx - wpx / 2), y + 12, wpx, 1);
          text(ctx, label, cx, y + 3, PAL.white, { align: "center" });
        }
      }
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  /** The game under a point on the canvas (CSS px), if any. */
  function hit(ev) {
    const c = cv.current;
    if (!c || !roomReady()) return null;
    const b = c.getBoundingClientRect(), x = ((ev.clientX - b.left) / b.width) * c.width, y = ((ev.clientY - b.top) / b.height) * c.height;
    let best = null, area = Infinity;
    for (const id of Object.keys(SPOTS)) {
      const r = station(id);
      if (!r) continue;
      const [x0, y0] = roomPx(r[0] - 0.1, r[1] - 0.1), [x1, y1] = roomPx(r[2] + 0.1, r[3] + 0.1);
      const a = (x1 - x0) * (y1 - y0);
      if (x >= x0 && x <= x1 && y >= y0 && y <= y1 && a < area) { best = id; area = a; }
    }
    return best;
  }
  function point(id) {
    live.current.hover = id;
    setHover(id);
  }
  function choose(id, viaTouch) {
    if (!id) return;
    if (id === "holdem") { point(id); setTableOpen(true); return; }
    if (viaTouch && live.current.hover !== id) { point(id); return; }      // first tap points, the second plays
    point(id);
    if (!disabled) onPick(id === "random" ? "auto" : id);
  }

  const hm = hover === "holdem" ? { name: "The card table", blurb: "Hold'em, PLO or High Card. Pick a game at the felt." } : hover ? meta(hover) : null;
  return (
    <div className="room-picker" ref={wrap}>
      <div className="room-picker-scroll">
        <canvas
          ref={cv}
          className={`room-picker-canvas${ready ? "" : " is-loading"}${hover ? " is-pointing" : ""}`}
          onPointerMove={(ev) => { if (ev.pointerType === "mouse") { const id = hit(ev); if (id !== live.current.hover) point(id); } }}
          onPointerLeave={(ev) => { if (ev.pointerType === "mouse" && !tableOpen) point(null); }}
          onPointerDown={(ev) => { live.current.touch = ev.pointerType !== "mouse"; }}
          onClick={(ev) => choose(hit(ev), !!live.current.touch)}
          aria-label="The Runout Room: pick a game by its table or cabinet"
        />
        {tableOpen ? (
          <div className="room-picker-pop" role="dialog" aria-label="Pick a card game">
            <div className="room-picker-pop-title">The card table</div>
            {TABLE_GAMES.map((id) => {
              const m = meta(id);
              return m ? (
                <button key={id} type="button" disabled={disabled} className="room-picker-pop-btn" style={{ "--acc": COLOURS[id] }}
                        onClick={() => { setTableOpen(false); onPick(id); }}>
                  <span>{m.name}</span><small>{m.blurb}</small>
                </button>
              ) : null;
            })}
            <button type="button" className="room-picker-pop-close" onClick={() => { setTableOpen(false); point(null); }}>Back</button>
          </div>
        ) : null}
      </div>
      <div className="room-picker-bar" style={{ "--acc": (hover && COLOURS[hover]) || "#8a80a8" }}>
        {disabled ? (
          <span className="room-picker-warn">{disabledReason || "Add your players to start"}</span>
        ) : hm ? (
          <>
            <span className="room-picker-name">{hm.name}</span>
            <span className="room-picker-blurb">{hm.blurb}</span>
            {hover !== "holdem" ? (
              <button type="button" className="room-picker-play" onClick={() => onPick(hover === "random" ? "auto" : hover)}>Play</button>
            ) : null}
          </>
        ) : (
          <span className="room-picker-hint">Walk up to a game: point at a table or a cabinet, click to play. The machine in the corner picks for you.</span>
        )}
      </div>
      <div className="room-picker-list" role="list">
        {["random", ...modes.map((m) => m.id)].map((id) => {
          const m = meta(id);
          return m ? (
            <button key={id} type="button" role="listitem" className={`room-picker-chip${hover === id || (hover === "holdem" && TABLE_GAMES.includes(id)) ? " is-on" : ""}`}
                    style={{ "--acc": COLOURS[id] }} disabled={disabled}
                    onMouseEnter={() => point(TABLE_GAMES.includes(id) ? "holdem" : id)} onFocus={() => point(TABLE_GAMES.includes(id) ? "holdem" : id)}
                    onMouseLeave={() => point(null)}
                    onClick={() => onPick(id === "random" ? "auto" : id)}>
              {m.name}
            </button>
          ) : null;
        })}
      </div>
    </div>
  );
}

