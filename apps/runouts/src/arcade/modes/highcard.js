// High Card at the card table: one card each, turned over one at a time and slapped down big in front of the
// dealer's spot; the lowest (or highest) rank is picked.
import { PAL, PCOL, text, hud, verdict, clamp, ease } from "../kit.js";
import { scene, players } from "./common.js";
import { card, seatsAround } from "./cards.js";
import { rankLabel } from "./cards.js";
import { draftView } from "./poker.js";

export default {
  station: "holdem",
  drafts: true,
  draw(ctx, s) {
    if (s.result.draftPhase) {
      const picks = () => (typeof window !== "undefined" && window.__highCardPicks) || {};
      return draftView(ctx, s, "HIGH CARD", {
        deal: 3, board: false, sub: "PICK ONE OF THREE, BLIND",
        locked: (name) => picks()[name] != null, keepers: (name) => [picks()[name]],
      });
    }
    const sc = scene(ctx, s, "holdem", [0, 0.5]);
    const r = s.result, list = r.players || [], n = list.length;
    const a = sc.a || { centre: [17, 8, 0.9], rx: 3.24, ry: 1.19 };
    const seats = seatsAround(n, a);
    players(ctx, s, sc, seats, { tagDy: 2, active: !s.done && s.step < n ? s.step : null });
    // a row of cards across the felt, one per player, in their colour's frame
    const CW = 22, CH = 30, gap = 6, tw = n * (CW + gap) - gap;
    const [bx, by] = sc.px(a.centre[0], a.centre[1], a.centre[2]);
    const y = Math.round(by - CH / 2) + 2;
    list.forEach((p, k) => {
      const x = Math.round(bx - tw / 2 + k * (CW + gap)), i = s.index(p.name);
      const shown = s.step > k, fresh = s.step === k + 1;
      const f = shown ? (fresh ? clamp(s.stepT / 0.45, 0, 1) : 1) : 0;
      const lift = fresh ? Math.round((1 - ease.bounce(clamp(s.stepT / 0.6, 0, 1))) * 14) : 0;
      const hot = s.done && (p.selected || p.tied);
      card(ctx, x, y - lift, p.card, f, CW, CH, hot ? (p.tied ? PAL.yel : s.goal === "winner" ? PAL.gold : PAL.red) : null);
      ctx.fillStyle = PCOL[i % PCOL.length]; ctx.fillRect(x, y + CH + 3, CW, 2);
      if (shown && p.card && f >= 1) text(ctx, rankLabel(p.card.rank), x + CW / 2, y + CH + 7, PAL.white, { align: "center", shadow: PAL.ink });
    });
    hud(ctx, s, "HIGH CARD", s.goal === "winner" ? "HIGHEST CARD WINS" : "LOWEST CARD IS PICKED");
    if (!s.done && s.step < n) text(ctx, list[s.step].name + " TURNS A CARD", 240, 252, PAL.white, { align: "center", shadow: PAL.ink, max: 30 });
    if (s.done && !s.mem.end) { s.mem.end = 1; if (s.goal === "winner" && !r.isTie) s.fx.rain(50, [PAL.gold, PAL.pink, PAL.cyan]); }
    verdict(ctx, s);
  },
};
