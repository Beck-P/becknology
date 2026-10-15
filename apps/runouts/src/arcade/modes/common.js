// What the table games share: the camera at a station in the Runout Room, the players standing round it as
// their pilots, their name tags, and how they take the verdict.
import { PAL, PCOL, TS, W, H, roomPx, frame, drawRoom, station, anchors, roomReady, pilot, tag, text, clamp, ease } from "../kit.js";

/** Frame the station and draw the room; returns the camera and a tiles → screen mapping. */
export function scene(ctx, s, id, nudge = [0, 0], blank = true) {
  const r = station(id);
  let cam = { x: 0, y: 0 };
  if (r) {
    if (!s.mem.cam) s.mem.cam = frame(r, nudge[0], nudge[1]);
    cam = s.mem.cam;
  }
  // the room as it stands (every station dressed), with only the station being played stripped of the parts the
  // game draws live (its wheel face, its horses, its number)
  if (!drawRoom(ctx, cam, "show") || !roomReady()) {
    ctx.fillStyle = PAL.bg; ctx.fillRect(0, 0, W, H);
    text(ctx, "SETTING UP THE TABLE...", W / 2, H / 2 - 4, PAL.grey, { align: "center" });
  } else if (blank && r) {
    const [x0, y0] = roomPx(r[0] - 0.2, r[1] - 0.2), [x1, y1] = roomPx(r[2] + 0.2, r[3] + 0.2);
    ctx.save();
    ctx.beginPath();
    ctx.rect(Math.round(x0 - cam.x), Math.round(y0 - cam.y), Math.round(x1 - x0), Math.round(y1 - y0));
    ctx.clip();
    drawRoom(ctx, cam, "play");
    ctx.restore();
  }
  const px = (x, r2, z = 0) => { const p = roomPx(x, r2, z); return [p[0] - cam.x, p[1] - cam.y]; };
  return { cam, px, a: anchors(id === "holdem" || id === "plo" || id === "high-card" ? "poker" : id) };
}

/** Spread n seats evenly from x0 to x1 along row r (tiles). */
export function row(n, x0, x1, r) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ x: n === 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * i) / (n - 1), r });
  return out;
}

/** How a player takes it: cheering, slumped, or just waiting. */
export function mood(s, p) {
  if (!s.done || !p) return "idle";
  const picked = p.selected || p.tied;
  if (!picked) return s.goal === "winner" ? "slump" : "cheer";
  return s.goal === "winner" ? "cheer" : "slump";
}

/** Draw the players at their seats (feet on the floor at each seat), occluded by the room in front of them. */
export function players(ctx, s, sc, seats, opts = {}) {
  const list = s.result.players || [];
  const order = list.map((p, k) => ({ p, k, seat: seats[k] })).filter((q) => q.seat).sort((a, b) => a.seat.r - b.seat.r);
  for (const { p, k, seat } of order) {
    const i = s.index(p.name);
    const [x, y] = sc.px(seat.x, seat.r);
    const m = opts.mood ? opts.mood(p, k) : mood(s, p);
    pilot(ctx, i, x, y, seat.facing || "down", m, s.t, { footRow: seat.r, cam: sc.cam });
  }
  if (opts.tags !== false) {
    for (const { p, k, seat } of order) {
      const i = s.index(p.name);
      const [x, y] = sc.px(seat.x, seat.r);
      const hot = s.done && (p.selected || p.tied);
      const active = opts.active != null && opts.active === k;
      tag(ctx, p.name, x, y + (opts.tagDy != null ? opts.tagDy : 3), PCOL[i % PCOL.length],
          { lit: hot || active, bg: hot ? undefined : undefined, max: 8 });
    }
  }
}

/** A value bubble over a player (their roll, their count). */
export function bubble(ctx, x, y, str, col, pop = 1) {
  const k = ease.back(pop);
  const w = Math.max(14, str.length * 6 + 7), h = 13;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(k, k);
  ctx.fillStyle = PAL.ink; ctx.fillRect(-w / 2 - 1, -h - 1, w + 2, h + 2);
  ctx.fillStyle = col; ctx.fillRect(-w / 2, -h, w, h);
  ctx.fillStyle = PAL.ink; ctx.fillRect(-2, 0, 4, 2); ctx.fillRect(-1, 2, 2, 1);
  text(ctx, str, 0, -h + 3, PAL.ink, { align: "center" });
  ctx.restore();
}

/** A soft spotlight pool on the floor (a player's turn), screen px. */
export function spot(ctx, x, y, rx, col = "rgba(255,240,180,0.18)") {
  ctx.fillStyle = col;
  for (let j = -3; j <= 3; j++) {
    const w = Math.round(rx * Math.sqrt(1 - (j * j) / 16));
    ctx.fillRect(Math.round(x - w), Math.round(y + j * 2), w * 2, 2);
  }
}

export { TS, clamp };

/** Draw fn() with the camera pushed in z× on (fx, fy) (screen px of the unzoomed view); the game's bursts are moved
 *  to match. Returns the mapping from unzoomed to final screen px, for anything drawn after at full size. */
export function zoomed(ctx, s, z, fx, fy, fn) {
  const out = (x, y) => [W / 2 + (x - fx) * z, H / 2 + (y - fy) * z];
  const real = s.fx;
  s.fx = { burst: (x, y, ...rest) => { const [X, Y] = out(x, y); return real.burst(X, Y, ...rest); }, rain: (...a) => real.rain(...a) };
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-fx, -fy);
  try { fn(); } finally { ctx.restore(); s.fx = real; }
  return out;
}
