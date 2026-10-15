// Dice Duel at the dice pit: the players line the back rail; on their turn they throw two dice down the felt —
// tumbling, bouncing off the end wall, settling — and their total pops over their head. Lowest (or highest) is picked.
import { PAL, PCOL, text, hud, verdict, clamp, ease, hash } from "../kit.js";
import { scene, row, players, bubble, spot } from "./common.js";

const PIPS = { 1: [[3, 3]], 2: [[1, 1], [5, 5]], 3: [[1, 1], [3, 3], [5, 5]], 4: [[1, 1], [5, 1], [1, 5], [5, 5]],
               5: [[1, 1], [5, 1], [3, 3], [1, 5], [5, 5]], 6: [[1, 1], [5, 1], [1, 3], [5, 3], [1, 5], [5, 5]] };

/** A die, 7 × 7, face up; tumble (0..1) squashes it while it rolls. */
export function die(ctx, x, y, face, tumble = 0, body = PAL.cream, pip = PAL.ink) {
  x = Math.round(x); y = Math.round(y);
  const sq = tumble > 0 ? Math.round(Math.abs(Math.sin(tumble * Math.PI * 2)) * 2) : 0;
  ctx.fillStyle = PAL.ink; ctx.fillRect(x - 1, y - 1 + sq, 9, 9 - sq);
  ctx.fillStyle = body; ctx.fillRect(x, y + sq, 7, 7 - sq);
  ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(x, y + 6, 7, 1);
  if (sq) return;
  ctx.fillStyle = pip;
  for (const [px, py] of PIPS[face] || PIPS[1]) ctx.fillRect(x + px, y + py, 1, 1);
}

export default {
  station: "dice",
  draw(ctx, s) {
    const sc = scene(ctx, s, "dice", [0, -0.6]);
    const r = s.result, list = r.players || [], n = list.length;
    const a = sc.a || { felt: [3.2, 10.9, 9.2, 12.0], z: 0.82 };
    const [fx0, fr0, fx1, fr1] = a.felt;
    // the players along the back rail
    const seats = row(n, fx0 + 0.3, fx1 - 0.3, fr0 - 0.55);
    const revealed = clamp(s.step, 0, n);
    const turn = !s.done && s.step < n ? s.step : -1;            // whoever throws next
    if (turn >= 0) { const [x, y] = sc.px(seats[turn].x, seats[turn].r); spot(ctx, x, y, 14); }
    players(ctx, s, sc, seats, { active: s.done ? null : (s.stepT < 1.6 && revealed > 0 ? revealed - 1 : turn) });
    // the dice: each player's pair lands on the felt in front of them
    for (let k = 0; k < n; k++) {
      const p = list[k], i = s.index(p.name), seat = seats[k];
      const rest = [seat.x - 0.12, fr0 + (fr1 - fr0) * 0.55];
      if (k >= revealed) continue;
      const thrownNow = k === revealed - 1 && s.stepT < 1.5;
      const T = thrownNow ? s.stepT / 1.3 : 1;
      for (let d = 0; d < 2; d++) {
        const face = d ? p.d2 : p.d1;
        const ox = d * 0.3;
        // the throw: from the player's hand out along the felt to the far wall, back, and down to rest
        let x, y, h, tum = 0, f = face;
        if (T < 1) {
          const u = ease.out(T);
          const far = fx1 - 0.35 - d * 0.25;
          const path = u < 0.55 ? u / 0.55 : 1 - (u - 0.55) / 0.45 * 0.55;
          x = seat.x + (far - seat.x) * path + ox * u;
          const rr = fr0 + 0.15 + (rest[1] - fr0 - 0.15) * u;
          h = Math.abs(Math.sin(u * Math.PI * 3)) * (1 - u) * 18;
          [x, y] = sc.px(x, rr, a.z);
          tum = T * 6 + d * 0.3;
          f = 1 + Math.floor(hash(Math.floor(s.t * 14) + d + k * 7) * 6);
          if (u > 0.92) { tum = 0; f = face; }
        } else {
          [x, y] = sc.px(rest[0] + ox, rest[1] + d * 0.08, a.z);
          h = 0;
        }
        ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(Math.round(x), Math.round(y) + 7, 7, 2);
        const lose = s.done && (p.selected || p.tied);
        die(ctx, x, y - h, f, tum, lose ? (p.tied ? "#fff0a0" : s.goal === "winner" ? "#ffe890" : "#ffc0c0") : PAL.cream);
      }
      if (!thrownNow || s.stepT > 1.25) {
        const [bx, by] = sc.px(seat.x, seat.r, 1.75);
        const pop = thrownNow ? clamp((s.stepT - 1.25) / 0.3, 0, 1) : 1;
        bubble(ctx, bx, by, String(p.total), s.done && (p.selected || p.tied) ? (p.tied ? PAL.yel : s.goal === "winner" ? PAL.gold : PAL.red) : PCOL[i % PCOL.length], pop);
        if (thrownNow && s.stepT > 1.25 && !s.mem["fx" + k]) {
          s.mem["fx" + k] = 1;
          const [dx, dy] = sc.px(rest[0] + 0.15, rest[1], a.z);
          s.fx.burst(dx, dy, 6, "spark", [PAL.white, PAL.cream]);
          if (p.d1 === p.d2) s.fx.burst(bx, by - 8, 14, "spark", [PAL.gold, PAL.white]);
        }
      }
    }
    if (s.done && !s.mem.end) {
      s.mem.end = 1;
      if (s.goal === "winner" && !r.isTie) s.fx.rain(60, [PAL.gold, PAL.pink, PAL.cyan, PAL.white]);
    }
    hud(ctx, s, "DICE DUEL", s.goal === "winner" ? "HIGHEST TOTAL WINS" : "LOWEST TOTAL IS PICKED");
    if (!s.done && turn >= 0) text(ctx, list[turn].name + " TO THROW", 240, 252, PAL.white, { align: "center", shadow: PAL.ink, max: 26 });
    verdict(ctx, s);
  },
};
