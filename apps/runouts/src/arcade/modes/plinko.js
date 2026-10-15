// Plinko on the wall: each player's ball (in their colour) is dropped in turn and bounces down the brass pegs, left or
// right at every row as its path says, into one of the thirteen slots; the middle one pays 21.
import { PAL, PCOL, W, H, text, hud, verdict, clamp, ease, disc } from "../kit.js";
import { scene, row, players, bubble } from "./common.js";

const ROW_T = 0.17;

/** Where ball p is (tiles: x, z on the board) t seconds after it was dropped; and whether it has landed. */
function ballAt(a, p, t) {
  const rows = a.rows, dz = a.dz, sp = a.spacing;
  let j = Math.floor(t / ROW_T), f = t / ROW_T - j;
  if (j >= rows) {                                                 // through the pegs: drop into the slot
    const u = clamp((t - rows * ROW_T) / 0.3, 0, 1);
    const x = a.cx + (p.finalSlot - rows / 2) * sp;
    const z0 = a.top - rows * dz, z1 = (a.slotZ[0] + a.slotZ[1]) / 2;
    return { x, z: z0 + (z1 - z0) * ease.in(u), landed: u >= 1, row: rows };
  }
  let rights = 0;
  for (let q = 0; q < j; q++) rights += p.path[q];
  const xFrom = a.cx + (rights - j / 2) * sp, xTo = a.cx + (rights + p.path[j] - (j + 1) / 2) * sp;
  const zFrom = a.top - j * dz + 0.02, zTo = a.top - (j + 1) * dz + 0.02;
  return { x: xFrom + (xTo - xFrom) * f, z: zFrom + (zTo - zFrom) * f + Math.sin(f * Math.PI) * dz * 0.9, landed: false, row: j };
}

export default {
  station: "plinko",
  draw(ctx, s) {
    const sc = scene(ctx, s, "plinko", [0, 1.7]);
    const r = s.result, list = r.players || [], n = list.length;
    const a = sc.a || { cx: 25.7, top: 3.05, dz: 0.19, spacing: 0.3, rows: 12, r: 3.34, slotZ: [0.3, 0.67], values: r.slotValues };
    const vals = r.slotValues || a.values;
    // slot values under the board
    for (let q = 0; q < vals.length; q++) {
      const [x, y] = sc.px(a.cx + (q - a.rows / 2) * a.spacing, a.r, a.slotZ[0] - 0.05);
      text(ctx, String(vals[q]), x, y + 2, vals[q] === 21 ? PAL.gold : PAL.white, { align: "center" });
    }
    const dropped = clamp(s.step, 0, n);
    const seats = row(n, a.cx - 2.4, a.cx + 2.4, 5.8).map((q) => ({ ...q, facing: "up" }));
    const active = s.done ? null : dropped > 0 && s.stepT < ROW_T * a.rows + 0.6 ? dropped - 1 : dropped < n ? dropped : null;
    players(ctx, s, sc, seats, { active });
    // balls: landed ones sit in their slots, the latest one bounces down
    const inSlot = {};
    for (let k = 0; k < dropped; k++) {
      const p = list[k], i = s.index(p.name), fresh = k === dropped - 1 && !s.done;
      const tt = fresh ? s.stepT : 99;
      const b = ballAt(a, p, tt);
      let { x, z } = b;
      if (b.landed) { const c = (inSlot[p.finalSlot] = (inSlot[p.finalSlot] || 0) + 1); z = a.slotZ[0] + 0.08 + (c - 1) * 0.11; }
      const [bx, by] = sc.px(x, a.r + 0.02, z);
      disc(ctx, bx, by, 3, PAL.ink);
      disc(ctx, bx, by, 2, PCOL[i % PCOL.length]);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(Math.round(bx) - 1, Math.round(by) - 1, 1, 1);
      if (fresh && !b.landed && b.row !== s.mem.lastRow) { s.mem.lastRow = b.row; if (b.row > 0) s.fx.burst(bx, by, 2, "spark", [PAL.gold]); }
      if (fresh && b.landed && !s.mem["l" + k]) {
        s.mem["l" + k] = 1;
        s.fx.burst(bx, by, p.score >= 13 ? 20 : 8, p.score >= 13 ? "confetti" : "spark", [PCOL[i % PCOL.length], PAL.gold, PAL.white]);
      }
      if (b.landed) {
        const [hx, hy] = sc.px(seats[k].x, seats[k].r, 1.85);
        const hot = s.done && (p.selected || p.tied);
        bubble(ctx, hx, hy, String(p.score), hot ? (p.tied ? PAL.yel : s.goal === "winner" ? PAL.gold : PAL.red) : PCOL[i % PCOL.length], 1);
      }
    }
    hud(ctx, s, "PLINKO", s.goal === "winner" ? "HIGHEST SLOT WINS" : "LOWEST SLOT IS PICKED");
    if (!s.done && active != null) text(ctx, list[active].name + (dropped > active ? "'S BALL IS DROPPING" : " TO DROP"), W / 2, H - 14, PAL.white, { align: "center", shadow: PAL.ink, max: 40 });
    if (s.done && !s.mem.end) { s.mem.end = 1; if (s.goal === "winner" && !r.isTie) s.fx.rain(60, [PAL.gold, PAL.pink, PAL.cyan]); }
    verdict(ctx, s, { y: 186 });
  },
};
